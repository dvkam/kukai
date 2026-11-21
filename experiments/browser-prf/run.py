"""Exercise WebAuthn PRF with ephemeral Chromium virtual authenticators."""

import os
import shutil
from pathlib import Path

from playwright.sync_api import sync_playwright

PROBE = Path(__file__).with_name("probe.js")
ORIGIN = "http://localhost:8123/"


def main() -> None:
    executable = os.environ.get("CHROME_BIN") or shutil.which("chromium") or shutil.which("google-chrome")
    if not executable:
        raise RuntimeError("Set CHROME_BIN to the Chromium executable")
    with sync_playwright() as automation:
        browser = automation.chromium.launch(executable_path=executable)
        print(f"Chromium {browser.version}")
        for supported in (True, False):
            context = browser.new_context()
            page = context.new_page()
            # Serve a fresh secure-context localhost origin without a network listener.
            page.route(ORIGIN, lambda route: route.fulfill(content_type="text/html", body="<title>PRF probe</title>"))
            page.goto(ORIGIN)
            session = context.new_cdp_session(page)
            session.send("WebAuthn.enable")
            session.send("WebAuthn.addVirtualAuthenticator", {"options": {
                "protocol": "ctap2", "ctap2Version": "ctap2_1", "transport": "internal",
                "hasResidentKey": True, "hasUserVerification": True,
                "isUserVerified": True, "hasPrf": supported,
            }})
            verdict = page.evaluate("(async (supported) => {" + PROBE.read_text() + "\nreturn exercisePRF(supported); })", supported)
            expected = "restored with same credential and salt; refused changed salt and changed credential" if supported else "refused: no usable PRF output"
            if verdict != expected:
                raise AssertionError(f"Unexpected PRF verdict for supported={supported}")
            print(f"Authenticator PRF={supported}: {verdict}")
            context.close()
        browser.close()


if __name__ == "__main__":
    main()
