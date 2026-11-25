#!/usr/bin/env python3
import argparse
import functools
import gzip
import hashlib
import http.server
import json
import math
import os
import statistics
import subprocess
import sys
import threading
from pathlib import Path

from playwright.sync_api import sync_playwright


class Handler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, format, *args):
        pass


def summarize(samples):
    if not samples:
        return None
    ordered = sorted(samples)
    return {
        **{f"p{p}": ordered[math.ceil(len(ordered) * p / 100) - 1] for p in (50, 90, 95, 99)},
        "median": statistics.median(ordered),
        "min": ordered[0],
        "max": ordered[-1],
    }


def build(root, side):
    path = root / side
    manifest = json.loads((path / "build.json").read_text())
    if manifest["bundle_sha256"] != hashlib.sha256((path / "bundle.js").read_bytes()).hexdigest():
        raise ValueError(f"Bundle digest mismatch for {side}")
    return manifest


def run_batch(page, mode, size, count, mark=False):
    return page.evaluate("args => portfolioFixture.run(...args)", [mode, size, count, mark])


def load_page(browser, origin, side):
    context = browser.new_context(viewport={"width": 1280, "height": 720}, device_scale_factor=1)
    context.route("**/*", lambda route: route.continue_() if route.request.url.startswith(origin + "/") else route.abort())
    page = context.new_page()
    page.goto(f"{origin}/{side}/", wait_until="load")
    return context, page


def profile(browser, origin, args):
    side = args.sides[0]
    context, page = load_page(browser, origin, side)
    session = context.new_cdp_session(page)
    warmup = run_batch(page, args.modes[0], args.sizes[0], args.warmup)
    if warmup["failures"]:
        raise ValueError(warmup["failures"])
    session.send("Profiler.enable")
    session.send("Profiler.setSamplingInterval", {"interval": 200})
    session.send("Profiler.start")
    result = run_batch(page, args.modes[0], args.sizes[0], args.samples, True)
    recorded = session.send("Profiler.stop")["profile"]
    output = args.output
    output.mkdir(parents=True, exist_ok=True)
    name = f"{side}-{args.modes[0]}-{args.sizes[0]}"
    for node in recorded["nodes"]:
        url = node["callFrame"]["url"]
        if url.startswith(origin):
            node["callFrame"]["url"] = url.replace(origin, "", 1)
    (output / f"{name}.cpuprofile").write_text(json.dumps(recorded))
    (output / f"{name}-profile-batch.json").write_text(json.dumps(result, indent=2))
    context.close()
    result["samples"] = len(recorded["samples"])
    return result


def trace(browser, origin, args):
    side = args.sides[0]
    context, page = load_page(browser, origin, side)
    session = context.new_cdp_session(page)
    mode, size = args.modes[0], args.sizes[0]
    warmup = run_batch(page, mode, size, args.warmup)
    if warmup["failures"]:
        raise ValueError(warmup["failures"])
    events = []
    streams = []
    session.on("Tracing.dataCollected", lambda data: events.extend(data["value"]))
    session.on("Tracing.tracingComplete", lambda data: streams.append(data))
    session.send("Tracing.start", {
        "categories": "devtools.timeline,blink.user_timing,v8,disabled-by-default-v8.gc",
        "transferMode": "ReportEvents",
    })
    result = run_batch(page, mode, size, args.samples, True)
    session.send("Tracing.end")
    for _ in range(100):
        if streams:
            break
        page.wait_for_timeout(50)
    if not streams or streams[0].get("dataLossOccurred"):
        raise ValueError("Chrome did not return a complete trace")
    args.output.mkdir(parents=True, exist_ok=True)
    output = args.output / f"{side}-{mode}-{size}-trace.json.gz"
    payload = json.dumps({"traceEvents": events}).replace(origin, "")
    with gzip.open(output, "wt") as stream:
        stream.write(payload)
    context.close()
    return {
        **result, "events": len(events),
        "traceSha256": hashlib.sha256(payload.encode()).hexdigest(),
    }


def compare(browser, origin, args):
    pages = {side: load_page(browser, origin, side) for side in args.sides}
    controls = {side: page.evaluate("portfolioFixture.controls()") for side, (_, page) in pages.items()}
    trials = []
    for size in args.sizes:
        for mode in args.modes:
            for side, (_, page) in pages.items():
                warmed = run_batch(page, mode, size, args.warmup)
                if warmed["failures"]:
                    raise ValueError(warmed["failures"])
            for block in range(args.blocks):
                for side in args.sides if block % 2 == 0 else args.sides[::-1]:
                    _, page = pages[side]
                    result = run_batch(page, mode, size, args.samples)
                    trials.append({"side": side, "block": block + 1, **result, "summaryMs": summarize(result["samplesMs"])})
            print(f"Completed {mode} fixture with {size} balances", file=sys.stderr, flush=True)
    for context, _ in pages.values():
        context.close()

    summaries = []
    for size in args.sizes:
        for mode in args.modes:
            for side in args.sides:
                relevant = [trial for trial in trials if (trial["size"], trial["mode"], trial["side"]) == (size, mode, side)]
                all_samples = [sample for trial in relevant for sample in trial["samplesMs"]]
                medians = [trial["summaryMs"]["median"] for trial in relevant if trial["summaryMs"] is not None]
                summaries.append({
                    "side": side, "mode": mode, "size": size,
                    "attempts": sum(trial["attempts"] for trial in relevant),
                    "successes": len(all_samples),
                    "failures": sum(len(trial["failures"]) for trial in relevant),
                    "summaryMs": summarize(all_samples),
                    "blockMedianRangeMs": [min(medians), max(medians)] if medians else None,
                })
    return {"controls": controls, "summaries": summaries, "trials": trials}


def positive_count(value):
    number = int(value)
    if number < 1:
        raise argparse.ArgumentTypeError("expected a positive count")
    return number


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("root", type=Path)
    parser.add_argument("--sides", nargs="+", default=["base", "candidate"])
    parser.add_argument("--sizes", nargs="+", type=positive_count, default=[1, 25, 500, 2000])
    parser.add_argument("--modes", nargs="+", default=["fresh", "returning"], choices=["fresh", "returning"])
    parser.add_argument("--warmup", type=int, default=15)
    parser.add_argument("--blocks", type=positive_count, default=5)
    parser.add_argument("--samples", type=positive_count, default=24)
    parser.add_argument("--output", type=Path, required=True)
    diagnostic = parser.add_mutually_exclusive_group()
    diagnostic.add_argument("--profile", action="store_true")
    diagnostic.add_argument("--trace", action="store_true")
    parser.add_argument("--chromium", default=os.getenv("CHROMIUM", "/usr/bin/chromium"))
    args = parser.parse_args()
    if args.warmup < 0:
        parser.error("--warmup must be zero or greater")

    diagnostic_run = args.profile or args.trace
    sides = args.sides[:1] if diagnostic_run else args.sides
    manifests = {side: build(args.root, side) for side in sides}
    if not diagnostic_run and any(manifest.get("profile_only") for manifest in manifests.values()):
        parser.error("Profile-only bundles cannot be used for timing")
    system = {
        "uptime": subprocess.check_output(["uptime"], text=True).strip(),
        "cores": int(subprocess.check_output(["nproc"], text=True)),
        "cpuQuota": Path("/sys/fs/cgroup/cpu.max").read_text().strip() if Path("/sys/fs/cgroup/cpu.max").exists() else None,
        "cpu": subprocess.check_output(["lscpu"], text=True).split("Model name:", 1)[1].splitlines()[0].strip(),
        "platform": os.uname().sysname + " " + os.uname().machine,
    }

    with http.server.ThreadingHTTPServer(("127.0.0.1", 0), functools.partial(Handler, directory=str(args.root))) as server:
        thread = threading.Thread(target=server.serve_forever, daemon=True)
        thread.start()
        origin = "http://127.0.0.1:" + str(server.server_port)
        with sync_playwright() as playwright:
            browser = playwright.chromium.launch(executable_path=args.chromium, args=["--no-sandbox", "--disable-dev-shm-usage"])
            version = browser.new_browser_cdp_session().send("Browser.getVersion")
            collect = profile if args.profile else trace if args.trace else compare
            result = collect(browser, origin, args)
            browser.close()
        server.shutdown()
    data = {"builds": manifests, "browser": version, "system": system, **result}
    if diagnostic_run:
        print(json.dumps(data, indent=2))
        return 1 if result["failures"] else 0
    args.output.write_text(json.dumps(data, separators=(",", ":")) + "\n")
    print(json.dumps({"controls": result["controls"], "summaries": result["summaries"]}, indent=2))
    return 1 if any(item["failures"] for item in result["summaries"]) else 0


if __name__ == "__main__":
    raise SystemExit(main())
