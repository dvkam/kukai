"""Measure the generated FROST module in an isolated Chromium page."""

import argparse
import hashlib
import json
import math
import os
import platform
import shutil
from importlib.metadata import version
from pathlib import Path
from statistics import median

from playwright.sync_api import Error, Page, Route, WebSocketRoute, sync_playwright

ORIGIN = "http://localhost:8123/"
SAMPLE_FIELDS = ("solana_dkg_ms", "solana_sign_ms", "tezos_dkg_ms", "tezos_sign_ms")
PERCENTILES = (50, 90, 95, 99)
PACKAGE_TYPES = {"quorum.js": "text/javascript", "quorum_bg.wasm": "application/wasm"}


def summarize(samples: list[dict], requested: int) -> dict:
    successful = [sample["timings_ms"] for sample in samples if "timings_ms" in sample]
    metrics = {}
    for field in SAMPLE_FIELDS:
        values = sorted(sample[field] for sample in successful)
        count = len(values)
        metrics[field] = {
            "min": values[0] if count else None,
            "median": median(values) if count else None,
            "max": values[-1] if count else None,
            **{f"p{p}": values[math.ceil(count * p / 100) - 1] if count else None for p in PERCENTILES},
        }
    return {
        "requested": requested,
        "attempted": len(samples),
        "passed": len(successful),
        "failed": len(samples) - len(successful),
        "skipped": requested - len(samples),
        "metrics": metrics,
    }


def take_sample(page: Page) -> dict:
    try:
        values = page.evaluate("() => Array.from(window.sample())")
    except Error:
        return {"error": "WASM sample execution failed"}
    if not isinstance(values, list) or len(values) != len(SAMPLE_FIELDS) or not all(
        isinstance(value, (int, float)) and not isinstance(value, bool) and math.isfinite(value) and value > 0
        for value in values
    ):
        return {"error": "WASM sample did not return four finite positive timings"}
    return {"timings_ms": dict(zip(SAMPLE_FIELDS, values, strict=True))}


def take_samples(page: Page, count: int) -> list[dict]:
    samples = []
    for _ in range(count):
        sample = take_sample(page)
        samples.append(sample)
        if "error" in sample:
            break
    return samples


def verify_entropy_failure(page: Page) -> dict:
    try:
        return page.evaluate("""() => {
            let requests = 0;
            let trapped = false;
            const original = crypto.getRandomValues;
            crypto.getRandomValues = () => {
                requests += 1;
                throw new Error('injected entropy failure');
            };
            try {
                window.sample();
            } catch (error) {
                trapped = error instanceof WebAssembly.RuntimeError && error.message === 'unreachable';
            } finally {
                crypto.getRandomValues = original;
            }
            return {passed: trapped && requests > 0, requests};
        }""")
    except Error:
        return {"passed": False, "error": "Entropy control could not complete"}


def linux_setting(path: str) -> str:
    try:
        return Path(path).read_text(encoding="utf8").strip()
    except OSError:
        return ""


def run(package: dict[str, bytes], chrome: str, warmups: int, sample_count: int) -> dict:
    cpu_info = linux_setting("/proc/cpuinfo")
    result = {
        "chromium": None,
        "python": platform.python_version(),
        "playwright": version("playwright"),
        "platform": platform.platform(),
        "arch": platform.machine(),
        "cpu_model": next(
            (line.partition(":")[2].strip() for line in cpu_info.splitlines()
             if line.partition(":")[0].strip() == "model name"), platform.processor()
        ),
        "logical_cpus_available": len(os.sched_getaffinity(0)) if hasattr(os, "sched_getaffinity") else os.cpu_count(),
        "cpu_quota": linux_setting("/sys/fs/cgroup/cpu.max"),
        "cpu_governor": linux_setting("/sys/devices/system/cpu/cpu0/cpufreq/scaling_governor"),
        "load_average_start": os.getloadavg(),
        "package_sha256": {name: hashlib.sha256(data).hexdigest() for name, data in package.items()},
        "module_load_and_init_ms": None,
        "cold_first": None,
        "warmups_requested": warmups,
        "warmups": [],
        "samples": [],
        "entropy_failure": {"passed": False, "skipped": True},
        "unexpected_page_requests": 0,
        "page_errors": 0,
        "percentile_method": "nearest rank, sorted[ceil(n * p / 100) - 1]",
    }

    def serve(route: Route) -> None:
        url = route.request.url
        if url == ORIGIN:
            route.fulfill(content_type="text/html", body='<title>Ed25519 browser experiment</title><link rel="icon" href="data:,">')
        elif url.startswith(ORIGIN) and (name := url.removeprefix(ORIGIN)) in package:
            route.fulfill(body=package[name], content_type=PACKAGE_TYPES[name])
        else:
            result["unexpected_page_requests"] += 1
            route.abort()

    def block_websocket(socket: WebSocketRoute) -> None:
        result["unexpected_page_requests"] += 1
        socket.close()

    def count_page_error(_error: Error) -> None:
        result["page_errors"] += 1

    try:
        with sync_playwright() as automation:
            browser = automation.chromium.launch(executable_path=chrome)
            try:
                result["chromium"] = browser.version
                context = browser.new_context(service_workers="block")
                context.route("**/*", serve)
                context.route_web_socket("**/*", block_websocket)
                page = context.new_page()
                page.on("pageerror", count_page_error)
                page.goto(ORIGIN, timeout=15000)
                result["module_load_and_init_ms"] = page.evaluate("""async () => {
                    const start = performance.now();
                    const module = await import('/quorum.js');
                    await module.default();
                    window.sample = module.run_sample;
                    return performance.now() - start;
                }""")
                result["cold_first"] = take_sample(page)
                if "timings_ms" in result["cold_first"]:
                    result["warmups"] = take_samples(page, warmups)
                    if "timings_ms" in result["warmups"][-1]:
                        result["samples"] = take_samples(page, sample_count)
                        if "timings_ms" in result["samples"][-1]:
                            result["entropy_failure"] = verify_entropy_failure(page)
            finally:
                browser.close()
    except Error:
        result["browser_error"] = "Chromium setup, module initialization or browser teardown failed"

    result["load_average_end"] = os.getloadavg()
    result["warm_summary"] = summarize(result["samples"], sample_count)
    result["passed"] = (
        result["warm_summary"]["passed"] == sample_count
        and result["entropy_failure"]["passed"]
        and not result["unexpected_page_requests"]
        and not result["page_errors"]
        and "browser_error" not in result
    )
    return result


def positive_int(value: str) -> int:
    try:
        count = int(value)
    except ValueError:
        raise argparse.ArgumentTypeError("expected a positive integer") from None
    if count < 1:
        raise argparse.ArgumentTypeError("expected a positive integer")
    return count


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("package", type=Path, help="wasm-bindgen Web output directory")
    parser.add_argument("--warmups", type=positive_int, default=1, help="warm-up samples after the cold first sample (default 1)")
    parser.add_argument("--samples", type=positive_int, default=3, help="measured warm samples (default 3)")
    args = parser.parse_args()

    chrome = os.environ.get("CHROME_BIN") or shutil.which("chromium") or shutil.which("google-chrome")
    if not chrome:
        parser.error("Set CHROME_BIN to the Chrome or Chromium executable")
    try:
        package = {name: (args.package / name).read_bytes() for name in PACKAGE_TYPES}
    except OSError as error:
        parser.error(str(error))

    result = run(package, chrome, args.warmups, args.samples)
    print(json.dumps(result, indent=2, allow_nan=False))
    return int(not result["passed"])


if __name__ == "__main__":
    raise SystemExit(main())
