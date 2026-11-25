"""Measure the logged-out mobile wallet in headless Chromium using a loopback build."""

import argparse
import hashlib
import json
import math
import os
import platform
import re
import shutil
from contextlib import ExitStack, contextmanager
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from importlib.metadata import version
from pathlib import Path
from statistics import median
from sys import stderr
from threading import Thread
from urllib.parse import urlsplit

from playwright.sync_api import (
    Browser,
    Error,
    Locator,
    Route,
    ViewportSize,
    WebSocketRoute,
    sync_playwright,
)

COLD_HOME = "cold_home_ms"
WARM_MENU = "warm_menu_ms"
WARM_IMPORT = "warm_import_ms"
WARM_SEED = "warm_seed_form_ms"
SEED_AFTER_ESCAPE = "warm_seed_form_after_escape_ms"
STEPS = (COLD_HOME, WARM_MENU, WARM_IMPORT, WARM_SEED, SEED_AFTER_ESCAPE)
PERCENTILES = (50, 90, 95, 99)
VIEWPORT: ViewportSize = {"width": 390, "height": 650}
INIT = Path(__file__).with_name("measure.js").read_text(encoding="utf8")


class MenuStayedOpen(ValueError):
    """The route changed, but the open navigation panel still covered the form."""


@contextmanager
def serve(directory: Path):
    class QuietHandler(SimpleHTTPRequestHandler):
        def __init__(self, *args):
            super().__init__(*args, directory=str(directory))

        def log_message(self, *_args):
            pass

        def send_head(self):
            # Serve account deep links as documents. Missing assets still return 404.
            if (
                self.headers.get("Sec-Fetch-Mode") == "navigate"
                and re.fullmatch(r"/account/[A-Za-z0-9]+/?", urlsplit(self.path).path)
            ):
                self.path = "/index.html"
            return super().send_head()

    with ThreadingHTTPServer(("127.0.0.1", 0), QuietHandler) as server:
        thread = Thread(target=server.serve_forever)
        thread.start()
        try:
            yield f"http://127.0.0.1:{server.server_port}"
        finally:
            server.shutdown()
            thread.join()


def elapsed(result: object) -> float:
    if not isinstance(result, dict):
        raise TypeError("Browser timing result is missing or invalid")
    if result.get("error") == "menu-stayed-open":
        raise MenuStayedOpen("Navigation stayed open over the Import form")
    value = result.get("ms")
    if not isinstance(value, (int, float)) or not math.isfinite(value) or value <= 0:
        raise ValueError(result.get("error", f"invalid timing {value!r}"))
    return value


def click(target: Locator, step: str) -> float:
    target.evaluate(
        "(element, step) => window.walletBenchmark.arm(element, step)", step, timeout=15000
    )
    target.click(timeout=15000)
    return elapsed(target.page.evaluate("window.walletBenchmark.click"))


def measure(browser: Browser, origin: str, trial: int) -> dict:
    context = browser.new_context(
        viewport=VIEWPORT.copy(), locale="en-US", device_scale_factor=1,
        service_workers="block", reduced_motion="no-preference"
    )
    values: dict[str, float] = {}
    errors: dict[str, str] = {}
    runtime_errors: list[str] = []
    blocked_http = 0
    blocked_websockets = 0
    step = COLD_HOME

    def block_http(route: Route) -> None:
        nonlocal blocked_http
        blocked_http += 1
        route.abort()

    def block_websocket(socket: WebSocketRoute) -> None:
        nonlocal blocked_websockets
        blocked_websockets += 1
        socket.close()

    try:
        # Match HTTP and HTTPS requests to every origin except this trial's static server.
        context.route(re.compile(rf"^https?://(?!{re.escape(origin.removeprefix('http://'))}/)"), block_http)
        context.route_web_socket(re.compile(r"^wss?://"), block_websocket)
        context.add_init_script(INIT)
        page = context.new_page()
        page.on("pageerror", lambda error: runtime_errors.append(str(error).split("\n", 1)[0]))
        page.on("crash", lambda _page: runtime_errors.append("page crashed"))
        page.on(
            "response",
            lambda response: runtime_errors.append(
                f"HTTP {response.status} {urlsplit(response.url).path}"
            ) if response.url.startswith(origin + "/") and response.status >= 400 else None,
        )
        page.on(
            "requestfailed",
            lambda request: runtime_errors.append(
                f"Request failed {urlsplit(request.url).path}: {request.failure}"
            ) if request.url.startswith(origin + "/") else None,
        )
        response = page.goto(origin + "/", wait_until="domcontentloaded", timeout=15000)
        if response is None or not response.ok:
            raise ValueError("landing document did not return a successful response")
        values[step] = elapsed(page.evaluate("window.walletBenchmark.cold"))
        step = WARM_MENU
        values[step] = click(page.get_by_role("button", name="Wallet navigation", exact=True), step)
        step = WARM_IMPORT
        panel = page.locator("#wallet-navigation-panel")
        try:
            values[step] = click(panel.get_by_role("link", name="Import Wallet", exact=True), step)
        except MenuStayedOpen as error:
            errors[step] = str(error)
            step = SEED_AFTER_ESCAPE
            page.keyboard.press("Escape")
            panel.wait_for(state="hidden", timeout=15000)
        else:
            step = WARM_SEED
        seed_method = page.get_by_role("tab", name="Seed Words", exact=True).or_(
            page.locator(".import-options span").filter(has_text=re.compile(r"^Seed Words$"))
        )
        values[step] = click(seed_method, WARM_SEED)
    except (Error, TypeError, ValueError) as error:
        errors[step] = str(error).splitlines()[0]
    finally:
        context.close()

    return {
        "trial": trial,
        "completed": WARM_SEED in values and not errors and not runtime_errors,
        "timings_ms": values,
        "errors": errors,
        "runtime_errors": runtime_errors,
        "blocked_http_requests": blocked_http,
        "blocked_websockets": blocked_websockets,
    }


def summarize(trials: list[dict], steps: tuple[str, ...] = STEPS) -> dict:
    completed = sum(trial["completed"] for trial in trials)
    workflows = {}
    for step in steps:
        attempted = [trial for trial in trials if step in trial["timings_ms"] or step in trial["errors"]]
        values = sorted(trial["timings_ms"][step] for trial in attempted
                        if step in trial["timings_ms"] and not trial["runtime_errors"])
        percentiles = {
            f"p{percentile}": round(values[math.ceil(len(values) * percentile / 100) - 1], 1)
            if values else None for percentile in PERCENTILES
        }
        workflows[step] = {
            "attempted": len(attempted),
            "samples": len(values),
            "failed": len(attempted) - len(values),
            "skipped": len(trials) - len(attempted),
            "min": round(values[0], 1) if values else None,
            "median": round(median(values), 1) if values else None,
            "max": round(values[-1], 1) if values else None,
            **percentiles,
        }
    return {
        "attempted": len(trials),
        "completed": completed,
        "failed": len(trials) - completed,
        "workflows": workflows,
    }


def linux_setting(path: str) -> str | None:
    try:
        return Path(path).read_text(encoding="utf8").strip()
    except OSError:
        return None


def bundle_digests(directory: Path) -> dict[str, str]:
    digests = {}
    for path in sorted(directory.iterdir()):
        if path.is_file() and (path.name == "index.html" or path.suffix in (".js", ".css")):
            with path.open("rb") as bundle:
                digests[path.name] = hashlib.file_digest(bundle, "sha256").hexdigest()
    return digests


def read_build(directory: Path) -> dict:
    manifest = directory / "benchmark-build.json"
    if not (directory / "index.html").is_file() or not manifest.is_file():
        raise ValueError(f"{directory} is missing index.html or benchmark-build.json. Run build.cjs first.")
    build = json.loads(manifest.read_text(encoding="utf8"))
    if not isinstance(build, dict):
        raise TypeError(f"{manifest} must contain a JSON object.")
    observed = bundle_digests(directory)
    if "bundle_sha256" not in build:
        build["bundle_provenance"] = "legacy manifest; bundle hashes observed at measurement time"
        build["observed_bundle_sha256"] = observed
    elif build["bundle_sha256"] != observed:
        raise ValueError(f"Bundle digest mismatch in {directory}. Rebuild before measuring.")
    else:
        build["bundle_provenance"] = "build-time bundle hashes verified before measurement"
    return build


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("baseline", type=Path, help="output directory of build.cjs")
    parser.add_argument("--candidate", type=Path, help="alternate with this second build")
    parser.add_argument("--samples", type=int, default=200, help="attempts per build (default 200)")
    args = parser.parse_args()
    if args.samples < 1:
        parser.error("--samples must be positive")
    chrome = os.environ.get("CHROME_BIN") or shutil.which("chromium") or shutil.which("google-chrome")
    if not chrome:
        parser.error("Set CHROME_BIN to the Chrome or Chromium executable")

    builds = {"baseline": args.baseline}
    if args.candidate:
        builds["candidate"] = args.candidate
    results = {}
    for name, path in builds.items():
        try:
            build = read_build(path)
        except (OSError, TypeError, ValueError) as error:
            parser.error(str(error))
        results[name] = {"build": build, "trials": []}

    cpu_info = linux_setting("/proc/cpuinfo") or ""
    output = {
        "engine": "Chromium",
        "browser": None,
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
        "network": "HTTP loopback; HTTP cache disabled by routing; other HTTP and websocket traffic blocked",
        "browser_state": "fresh Chromium context per trial; loaded page reused for warm steps",
        "fixture": "logged out with accepted terms; no wallet or assets",
        "percentile_method": "nearest rank, sorted[ceil(n * p / 100) - 1]",
        "builds": results,
    }
    with ExitStack() as stack:
        origins = {name: stack.enter_context(serve(path)) for name, path in builds.items()}
        automation = stack.enter_context(sync_playwright())
        browser = automation.chromium.launch(executable_path=chrome)
        stack.callback(browser.close)
        output["browser"] = browser.version

        for name, origin in origins.items():
            results[name]["warmup"] = measure(browser, origin, 0)
        cold_ready = all(COLD_HOME in result["warmup"]["timings_ms"] for result in results.values())
        for trial in range(1, args.samples + 1) if cold_ready else ():
            # Swap the within-pair order every round to spread drift and startup noise.
            order = list(origins) if trial % 2 else list(reversed(origins))
            for name in order:
                results[name]["trials"].append(measure(browser, origins[name], trial))
            if trial % 25 == 0:
                print(f"Completed {trial}/{args.samples} attempts per build", file=stderr, flush=True)

    output["load_average_end"] = os.getloadavg()
    for name, result in results.items():
        build = result["build"]
        recorded = build.get("bundle_sha256", build.get("observed_bundle_sha256"))
        if bundle_digests(builds[name]) != recorded:
            parser.error(f"Bundle bytes changed while measuring {name}.")
        result["summary"] = summarize(result["trials"])
    print(json.dumps(output, indent=2, allow_nan=False))
    return int(any(not result["warmup"]["completed"] or result["summary"]["failed"] for result in results.values()))


if __name__ == "__main__":
    raise SystemExit(main())
