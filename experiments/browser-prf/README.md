# Browser passkey PRF feasibility

Can a web client obtain the same encryption key twice from a passkey and explicitly refuse an authenticator that lacks PRF support? This test uses Chromium's WebAuthn implementation, two fresh browser contexts, and virtual CTAP 2.1 authenticators. It exercises the browser interface before testing individual credential managers. [Issue #13](https://github.com/dvkam/kukai/issues/13) · [WebAuthn PRF extension](https://www.w3.org/TR/webauthn-3/#prf-extension)

| Case | Preconditions and action | Expected result |
| --- | --- | --- |
| Supported authenticator | Register with user verification required. Obtain two independent assertions for the same credential and salt. Encrypt a random test payload with the first wrapping key. | AES-GCM decryption with the second key returns the original payload. |
| Changed salt | Obtain another assertion for the same credential with a fresh salt. Attempt to open the same ciphertext. | Authenticated decryption rejects the changed key. |
| Unsupported authenticator | Disable the authenticator's PRF capability. Register and request an assertion with PRF. | Registration succeeds without the capability and the assertion provides no usable wrapping key. The probe refuses the wrapping path. |

The PRF output reaches application JavaScript as a 32-byte buffer before import into a non-extractable AES key. The generated test payload and its decrypted copy also enter page memory. A same-origin script with access to these values can use them. A non-extractable key still permits cryptographic operations through its handle. No provider accounts or real backup material are used. The local origin is fulfilled in memory. Output contains only the browser version and case verdicts.

The test sets the virtual authenticator's user-verification state to verified. Physical user presence, biometrics, independent recovery factors, provider reset and sync behavior require separate evidence. The mock authenticator supplies no evidence of Apple or Google account independence. Q-02, Q-07, Q-25 and Q-29 remain open. The PoC recommendation is to refuse this wrapping path when PRF output is missing and evaluate any alternative recovery factor separately.

Run from the repository root in an environment with Python 3.12 and Chrome or Chromium.

```sh
python -m pip install -r requirements-ci.txt
python experiments/browser-prf/run.py
```

The runner uses CHROME_BIN when set and otherwise locates a system browser. Each assertion uses a new challenge. Production authentication still needs relying-party validation of the WebAuthn response, enrollment and recovery policy, and restart and backup testing on reference devices.
