"""Measure the former eager 3D viewer tag on the same optimized Home build."""

import argparse
import hashlib
import json
import math
import os
import platform
import re
import shutil
import sys
from pathlib import Path
from statistics import median_high, median_low

from playwright.sync_api import Browser, Error, Route, sync_playwright
from run import PERCENTILES, VIEWPORT, linux_setting, read_build, serve

VIEWER_URL = (
    "https://cdn.jsdelivr.net/npm/@google/model-viewer@3.5.0/dist/model-viewer.min.js"
)
PACKAGE = Path(__file__).resolve().parents[2] / "node_modules/@google/model-viewer"


def visit(
    browser: Browser, origin: str, document: str, viewer: bytes, eager: bool
) -> dict:
    context = browser.new_context(
        viewport=VIEWPORT.copy(),
        service_workers="block",
        reduced_motion="no-preference",
    )
    errors: list[str] = []
    row = {"eager": eager, "viewer_requests": 0, "viewer_bytes": 0, "errors": errors}

    def intercept(route: Route) -> None:
        if route.request.url == origin + "/":
            route.fulfill(content_type="text/html; charset=utf-8", body=document)
        elif route.request.url == VIEWER_URL:
            row["viewer_requests"] += 1
            row["viewer_bytes"] += len(viewer)
            route.fulfill(
                content_type="text/javascript",
                body=viewer,
                headers={"Access-Control-Allow-Origin": "*"},
            )
        elif route.request.url.startswith(origin + "/"):
            route.continue_()
        else:
            route.abort()

    try:
        context.route("**/*", intercept)
        context.route_web_socket("**/*", lambda socket: socket.close())
        context.add_init_script("localStorage.setItem('accepted-terms','1')")
        page = context.new_page()
        page.on("pageerror", lambda _error: errors.append("JavaScript error"))
        page.on("crash", lambda _page: errors.append("page crash"))
        page.on(
            "response",
            lambda response: (
                errors.append(f"local HTTP {response.status}")
                if response.url.startswith(origin + "/") and response.status >= 400
                else None
            ),
        )
        page.on(
            "requestfailed",
            lambda request: (
                errors.append("failed local request")
                if request.url.startswith(origin + "/")
                else None
            ),
        )
        response = page.goto(origin, wait_until="domcontentloaded", timeout=60000)
        if response is None or not response.ok or response.url != origin + "/":
            raise ValueError("Unexpected Home document response")
        page.locator("app-start .google").wait_for(timeout=15000)
        row.update(
            page.evaluate("""() => ({
          dom_content_loaded_ms: performance.getEntriesByType('navigation')[0].domContentLoadedEventEnd,
          original_home: location.href === location.origin + '/' && performance.getEntriesByType('navigation')[0].name === location.href,
          registered: !!customElements.get('model-viewer'),
          models: document.querySelectorAll('model-viewer').length
        })""")
        )
        dcl = row["dom_content_loaded_ms"]
        if (
            not row["original_home"]
            or type(dcl) not in (int, float)
            or not math.isfinite(dcl)
            or dcl <= 0
        ):
            row.pop("dom_content_loaded_ms")
            errors.append("Invalid timing for the original Home document")
        if (
            row["models"]
            or row["registered"] != eager
            or row["viewer_requests"] != int(eager)
        ):
            errors.append("unexpected Home or viewer state")
    except (Error, ValueError) as error:
        errors.append(str(error).splitlines()[0])
    finally:
        context.close()
    return row


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("build", type=Path)
    parser.add_argument(
        "--samples",
        type=int,
        default=100,
        help="measured pairs following one warm-up pair",
    )
    args = parser.parse_args()
    chrome = (
        os.getenv("CHROME_BIN")
        or shutil.which("chromium")
        or shutil.which("google-chrome")
    )
    if not chrome or args.samples < 1:
        parser.error("Provide a Chromium binary and a positive sample count")
    build = read_build(args.build)
    html = (args.build / "index.html").read_text(encoding="utf8")
    if VIEWER_URL in html or html.count("</head>") != 1:
        parser.error("Expected a Home build with the global viewer removed")
    if json.loads((PACKAGE / "package.json").read_text())["version"] != "3.5.0":
        parser.error("Install the locked model-viewer 3.5.0 dependency")
    viewer = (PACKAGE / "dist/model-viewer.min.js").read_bytes()
    favicon = re.search(
        r'<link\b[^>]*\brel="(?:shortcut )?icon"[^>]*>', html, flags=re.IGNORECASE
    )
    if not favicon:
        parser.error("Expected the favicon link preceding the former viewer tag")
    eager_html = (
        html[: favicon.end()]
        + f'\n  <script type="module" src="{VIEWER_URL}"></script>'
        + html[favicon.end() :]
    )
    trials: list[dict] = []
    output = {
        "build": build,
        "viewer_sha256": hashlib.sha256(viewer).hexdigest(),
        "platform": platform.platform(),
        "cpu_quota": linux_setting("/sys/fs/cgroup/cpu.max"),
        "viewport": VIEWPORT,
        "load_start": os.getloadavg(),
        "warmup": [],
        "trials": trials,
        "summary": {},
    }
    with serve(args.build) as origin, sync_playwright() as automation:
        browser = automation.chromium.launch(executable_path=chrome)
        output["browser"] = browser.version
        for number in range(args.samples + 1):
            for eager in (True, False) if number % 2 == 0 else (False, True):
                row = visit(
                    browser, origin, eager_html if eager else html, viewer, eager
                )
                row["pair"] = number
                (trials if number else output["warmup"]).append(row)
            if number % 10 == 0:
                print(
                    f"Completed {number}/{args.samples} measured pairs",
                    file=sys.stderr,
                    flush=True,
                )
        browser.close()
    output["load_end"] = os.getloadavg()
    try:
        output["build_unchanged"] = read_build(args.build) == build
    except (OSError, ValueError, TypeError):
        output["build_unchanged"] = False
    valid = output["build_unchanged"] and not any(
        row["errors"] for row in output["warmup"]
    )
    for eager, name in [(True, "eager"), (False, "on_demand")]:
        times = sorted(
            r["dom_content_loaded_ms"]
            for r in trials
            if r["eager"] == eager and not r["errors"]
        )
        output["summary"][name] = {
            "valid": len(times),
            "failed": args.samples - len(times),
            "median": median_low(times) + (median_high(times) - median_low(times)) / 2
            if times
            else None,
            "min": min(times) if times else None,
            "max": max(times) if times else None,
            **{
                f"p{p}": times[math.ceil(len(times) * p / 100) - 1] if times else None
                for p in PERCENTILES
            },
        }
        valid = valid and len(times) == args.samples
    print(json.dumps(output, indent=1, allow_nan=False))
    return int(not valid)


if __name__ == "__main__":
    raise SystemExit(main())
