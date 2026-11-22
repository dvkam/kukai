"""Run the generated FROST module in an isolated Chromium page and print raw samples."""

import json
import math
import os
import platform
import shutil
import sys
from pathlib import Path

from playwright.sync_api import Error, Route, sync_playwright

ORIGIN = "http://localhost:8123/"
SAMPLE_FIELDS = ("solana_dkg_ms", "solana_sign_ms", "tezos_dkg_ms", "tezos_sign_ms")


def main(package: Path) -> None:
    chrome = os.environ.get("CHROME_BIN") or shutil.which("chromium") or shutil.which("google-chrome")
    if not chrome:
        raise RuntimeError("Set CHROME_BIN to the Chrome or Chromium executable")
    cpu_model = next(
        (line.partition(":")[2].strip() for line in Path("/proc/cpuinfo").read_text().splitlines()
         if line.partition(":")[0].strip() == "model name"), "undisclosed by host"
    )
    unexpected: list[str] = []

    def serve(route: Route) -> None:
        if route.request.url == ORIGIN:
            route.fulfill(content_type="text/html", body="<title>Ed25519 browser experiment</title>")
        elif route.request.url == ORIGIN + "quorum.js":
            route.fulfill(path=package / "quorum.js", content_type="text/javascript")
        elif route.request.url == ORIGIN + "quorum_bg.wasm":
            route.fulfill(path=package / "quorum_bg.wasm", content_type="application/wasm")
        else:
            unexpected.append(route.request.url)
            route.abort()

    with sync_playwright() as automation:
        browser = automation.chromium.launch(executable_path=chrome)
        context = browser.new_context(service_workers="block")
        context.route("**/*", serve)
        page = context.new_page()
        page.goto(ORIGIN)
        page.evaluate("""async () => {
            const module = await import('/quorum.js');
            await module.default();
            window.sample = module.run_sample;
        }""")
        samples = []
        for _ in range(5):
            values = page.evaluate("() => Array.from(window.sample())")
            if len(values) != len(SAMPLE_FIELDS) or not all(math.isfinite(v) and v > 0 for v in values):
                raise ValueError(f"Invalid timing sample: {values!r}")
            samples.append(dict(zip(SAMPLE_FIELDS, values, strict=True)))

        # Confirm the same module stops when the browser entropy source fails.
        page.evaluate("""() => {
            window.entropyRequests = 0;
            crypto.getRandomValues = () => {
                window.entropyRequests += 1;
                throw new Error('injected entropy failure');
            };
        }""")
        try:
            page.evaluate("() => window.sample()")
        except Error as error:
            if not page.evaluate("() => window.entropyRequests > 0") or "unreachable" not in str(error):
                raise
        else:
            raise AssertionError("Signing sample completed without browser entropy")
        if unexpected:
            raise AssertionError(f"Unexpected page requests: {unexpected}")
        print(json.dumps({
            "chromium": browser.version, "platform": platform.platform(), "arch": platform.machine(),
            "cpu_model": cpu_model,
            "samples": samples, "entropy_failure": "sample aborted", "unexpected_page_requests": len(unexpected),
        }, indent=2))
        context.close()
        browser.close()


if __name__ == "__main__":
    main(Path(sys.argv[1]))
