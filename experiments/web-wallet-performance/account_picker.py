"""Measure warm account changes in a restored, synthetic watch-only wallet."""

import argparse
import json
import os
import platform
import shutil
from importlib.metadata import version
from pathlib import Path
from sys import stderr
from urllib.parse import urlsplit

from playwright.sync_api import (
    Browser,
    Error,
    Locator,
    Page,
    Route,
    WebSocketRoute,
    sync_playwright,
)
from run import (
    VIEWPORT,
    bundle_digests,
    elapsed,
    linux_setting,
    read_build,
    serve,
    summarize,
)

# Base58Check-encoded 20-byte SHA-256 prefixes of kukai-benchmark-watch-{a,b,unknown}.
# These public fixture hashes were generated without keypairs.
FIRST = "tz1YBLRzk7cT9K1JsYNGVERL42bQXtQr4dyj"
SECOND = "tz1cRcVjE17CKqJFYWQABNwRwnpJ3yJ3B7GN"
UNKNOWN = "tz1SBn9txAH5iztUYiek97vdrh3AKVYymnbq"
TRIGGER = ".mobile app-ui-dropdown-account button.currentAddress"
STEPS = ("open_first_ms", "select_second_ms", "open_second_ms", "return_first_ms")
INPUTS = ("pointer", "keyboard")
INIT = Path(__file__).with_name("measure-account-picker.js").read_text(encoding="utf8")
# Playwright routes cover fetches and sockets. Chromium can also speculatively
# preconnect straight from a page's HTML, before a request reaches those routes.
LOOPBACK_ARGS = [
    "--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE 127.0.0.1",
    "--proxy-server=http://127.0.0.1:9",
    "--proxy-bypass-list=127.0.0.1",
    "--force-webrtc-ip-handling-policy=disable_non_proxied_udp",
]


def stored_wallet() -> dict:
    return {
        "type": "WatchWallet",
        "localStorageId": 1,
        "data": {
            "XTZrate": 0,
            "totalBalanceXTZ": 0,
            "totalBalanceUSD": 0,
            "implicitAccounts": [
                {
                    "pkh": address,
                    "pk": None,
                    "balanceXTZ": 0,
                    "availableBalance": 0,
                    "balanceUSD": 0,
                    "stakedBalance": 0,
                    "unstakedBalance": 0,
                    "delegate": "",
                    "tokens": [],
                    "activities": [],
                    "originatedAccounts": [],
                }
                for address in (FIRST, SECOND)
            ],
        },
    }


def restore(page: Page, origin: str) -> list[dict]:
    # Confirm that both a valid but unowned address and a bad checksum fall back to
    # the first stored account. No test hook bypasses the application's route handling.
    checks = []
    for address in (UNKNOWN, FIRST[:-1] + "1", FIRST):
        route = "/account/" + address
        response = page.goto(origin + route, wait_until="domcontentloaded", timeout=60000)
        if response is None or not response.ok:
            raise ValueError(f"Account document at {route} failed to load")
        page.wait_for_function(
            """([selector, address]) => {
                const trigger = document.querySelector(selector);
                return trigger && window.accountPickerBenchmark.ready(trigger, address, false);
            }""",
            arg=[TRIGGER, FIRST],
            timeout=30000,
        )
        checks.append({"requested": route, "settled_at": urlsplit(page.url).path})
    page.wait_for_function("document.fonts.status === 'loaded'")

    trigger = page.locator(TRIGGER)
    for _ in range(20):
        if trigger.evaluate("element => element === document.activeElement && element.matches(':focus-visible')"):
            return checks
        page.keyboard.press("Tab")
    raise ValueError("Account picker trigger was not reachable by Tab")


def activate(target: Locator, address: str, opening: bool, input_mode: str) -> float:
    if input_mode == "keyboard" and not target.evaluate("element => element === document.activeElement"):
        raise ValueError("Keyboard activation target did not have focus")
    target.evaluate(
        "(element, options) => window.accountPickerBenchmark.arm(element, options)",
        {"triggerSelector": TRIGGER, "address": address, "opening": opening, "input": input_mode},
    )
    if input_mode == "keyboard":
        target.page.keyboard.press("Enter")
    else:
        target.click()
    return elapsed(target.page.evaluate("window.accountPickerBenchmark.result"))


def measure(page: Page, input_mode: str, trial: int, runtime_errors: list[str]) -> dict:
    values: dict[str, float] = {}
    errors: dict[str, str] = {}
    before = len(runtime_errors)
    trigger = page.locator(TRIGGER)
    step = STEPS[0]
    try:
        for source, destination, open_step, select_step in (
            (FIRST, SECOND, STEPS[0], STEPS[1]),
            (SECOND, FIRST, STEPS[2], STEPS[3]),
        ):
            step = open_step
            values[step] = activate(trigger, source, True, input_mode)
            step = select_step
            panel_id = trigger.get_attribute("aria-controls")
            panel = page.locator(f'[id="{panel_id}"]')
            name = f"{destination[:7]}...{destination[-4:]}, {destination}"
            link = panel.get_by_role("link", name=name, exact=True).and_(
                panel.locator(f'a[href="/account/{destination}"]')
            )
            if input_mode == "keyboard":
                # The account links follow the order of the stored accounts.
                page.keyboard.press("Tab")
                if destination == SECOND:
                    page.keyboard.press("Tab")
            values[step] = activate(link, destination, False, input_mode)
    except (Error, TypeError, ValueError) as error:
        errors[step] = str(error).splitlines()[0]
    cycle_errors = runtime_errors[before:]
    return {
        "trial": trial,
        "completed": STEPS[-1] in values and not errors and not cycle_errors,
        "timings_ms": values,
        "errors": errors,
        "runtime_errors": cycle_errors,
    }


def collect(browser: Browser, origin: str, samples: int) -> dict:
    context = browser.new_context(
        viewport=VIEWPORT.copy(), locale="en-US", device_scale_factor=1,
        service_workers="block", reduced_motion="no-preference",
        storage_state={"cookies": [], "origins": [{"origin": origin, "localStorage": [
            {"name": "accepted-terms", "value": "1"},
            {"name": "kukai-wallet", "value": json.dumps(stored_wallet())},
        ]}]},
    )
    routes: list[dict] = []
    setup_errors: list[str] = []
    runtime_errors: list[str] = []
    warmup: dict[str, dict] = {}
    trials: dict[str, list[dict]] = {mode: [] for mode in INPUTS}
    blocked_http = 0
    blocked_websockets = 0

    def request(route: Route) -> None:
        nonlocal blocked_http
        if route.request.url.startswith(origin + "/"):
            if route.request.method in ("GET", "HEAD"):
                route.continue_()
                return
            runtime_errors.append(f"Unexpected loopback method {route.request.method}")
        else:
            blocked_http += 1
        route.abort()

    def socket(connection: WebSocketRoute) -> None:
        nonlocal blocked_websockets
        blocked_websockets += 1
        connection.close()

    try:
        context.route("**/*", request)
        context.route_web_socket("**/*", socket)
        context.add_init_script(INIT)
        page = context.new_page()
        page.set_default_timeout(5000)
        page.on("pageerror", lambda error: runtime_errors.append(str(error).split("\n", 1)[0]))
        page.on("crash", lambda _page: runtime_errors.append("page crashed"))
        page.on(
            "response",
            lambda response: runtime_errors.append(f"HTTP {response.status} {urlsplit(response.url).path}")
            if response.url.startswith(origin + "/") and response.status >= 400 else None,
        )
        page.on(
            "requestfailed",
            lambda req: runtime_errors.append(f"Request failed {urlsplit(req.url).path}: {req.failure}")
            if req.url.startswith(origin + "/") else None,
        )
        try:
            routes = restore(page, origin)
        except (Error, ValueError) as error:
            setup_errors.append(str(error).splitlines()[0])
        setup_errors.extend(runtime_errors)

        ready = not setup_errors
        if ready:
            for mode in INPUTS:
                warmup[mode] = measure(page, mode, 0, runtime_errors)
                if not warmup[mode]["completed"]:
                    ready = False
                    break
        for trial in range(1, samples + 1):
            order = INPUTS if trial % 2 else tuple(reversed(INPUTS))
            for mode in order:
                result = measure(page, mode, trial, runtime_errors) if ready else {
                    "trial": trial, "completed": False, "timings_ms": {}, "errors": {}, "runtime_errors": [],
                    "skipped_reason": "setup or an earlier cycle failed",
                }
                trials[mode].append(result)
                ready = ready and result["completed"]
            if ready and trial % 10 == 0:
                print(f"Completed {trial}/{samples} measured pairs", file=stderr, flush=True)
    finally:
        context.close()
    return {
        "setup": {"routes": routes, "errors": setup_errors},
        "warmup": warmup,
        "trials": trials,
        "summary": {mode: summarize(trials[mode], STEPS) for mode in INPUTS},
        "blocked_http_requests": blocked_http,
        "blocked_websockets": blocked_websockets,
        "runtime_errors": runtime_errors,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("build", type=Path, help="attested production output directory of build.cjs")
    parser.add_argument("--samples", type=int, default=100, help="measured round trips per input mode")
    args = parser.parse_args()
    if args.samples < 1:
        parser.error("--samples must be positive")
    chrome = os.environ.get("CHROME_BIN") or shutil.which("chromium") or shutil.which("google-chrome")
    if not chrome:
        parser.error("Set CHROME_BIN to the Chrome or Chromium executable")
    try:
        build = read_build(args.build)
    except (OSError, TypeError, ValueError) as error:
        parser.error(str(error))
    if (
        "bundle_sha256" not in build or build.get("configuration") != "production"
        or build.get("optimization") != {"scripts": True, "styles": True, "fonts": False}
    ):
        parser.error("Use an attested, optimized production build from build.cjs")

    cpu_info = linux_setting("/proc/cpuinfo") or ""
    output = {
        "build": build,
        "engine": "Chromium",
        "playwright": version("playwright"),
        "os": platform.platform(),
        "cpu": next((line.partition(":")[2].strip() for line in cpu_info.splitlines()
                     if line.partition(":")[0].strip() == "model name"), platform.processor()),
        "logical_cpus_available": len(os.sched_getaffinity(0)) if hasattr(os, "sched_getaffinity") else os.cpu_count(),
        "cpu_quota": linux_setting("/sys/fs/cgroup/cpu.max"),
        "cpu_governor": linux_setting("/sys/devices/system/cpu/cpu0/cpufreq/scaling_governor"),
        "load_average_start": os.getloadavg(),
        "viewport_css_px": VIEWPORT,
        "device_scale_factor": 1,
        "headless": True,
        "reduced_motion": "no-preference",
        "network": "HTTP loopback; cache disabled; external requests, sockets and preconnects blocked",
        "browser_state": "one restored browser context and document for all warm cycles",
        "fixture": "persisted WatchWallet; two synthetic addresses, zero balances, no tokens or activity",
        "percentile_method": "nearest rank, sorted[ceil(n * p / 100) - 1]",
    }
    with serve(args.build) as origin, sync_playwright() as playwright:
        browser = playwright.chromium.launch(executable_path=chrome, args=LOOPBACK_ARGS)
        try:
            output["browser"] = browser.version
            result = collect(browser, origin, args.samples)
        finally:
            browser.close()
    output["load_average_end"] = os.getloadavg()
    if bundle_digests(args.build) != build["bundle_sha256"]:
        parser.error("Bundle bytes changed while measuring")
    print(json.dumps({**output, **result}, indent=2, allow_nan=False))
    return int(bool(result["runtime_errors"] or any(summary["failed"] for summary in result["summary"].values())))


if __name__ == "__main__":
    raise SystemExit(main())
