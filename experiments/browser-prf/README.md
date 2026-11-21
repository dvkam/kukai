# Browser passkey PRF feasibility

Can a web client obtain the same encryption key twice from a passkey and explicitly refuse an authenticator that lacks PRF support? This test uses Chromium's WebAuthn implementation, two fresh browser contexts, and virtual CTAP 2.1 authenticators. It exercises the browser interface before testing individual credential managers. [Issue #13](https://github.com/dvkam/kukai/issues/13) · [WebAuthn PRF extension](https://www.w3.org/TR/webauthn-3/#prf-extension)

| Case | Intervention | Expected | Observed | Status and evidence |
| --- | --- | --- | --- | --- |
| Supported authenticator | Obtain two assertions with the same salt and credential. | Decrypt the original payload with a non-extractable wrapping key. | Plaintext matched and the key reported extractable=false. | Passed · [browser output](evidence/virtual-authenticator.txt) |
| Changed salt | Use a fresh salt with the original credential. | Decryption fails. | AES-GCM returned an OperationError. | Passed · [browser output](evidence/virtual-authenticator.txt) |
| Changed credential | Use a second credential on the same virtual authenticator with the original salt. | Decryption fails. | AES-GCM returned an OperationError. | Passed · [browser output](evidence/virtual-authenticator.txt) |
| Unsupported authenticator | Disable PRF. Register and request an assertion. | Refuse the wrapping path. | Registration succeeded and the assertion returned no usable key. | Passed · [browser output](evidence/virtual-authenticator.txt) |
| Provider account takeover and sync | Recover a real test account and examine access to identity and wrapped material. | A supported pairing preserves an independent factor. | Awaiting provider selection and test accounts. | Unrun |
| Physical iPhone wrapping | Change enrollment, reinstall, lock the device and restore a backup. | Measure actual Keychain and Secure Enclave access before choosing a policy. | Awaiting hardware. | Deferred |
| Device loss | Attempt recovery with remaining independently held factors. | Only an eligible recovery path can unlock the material. | Awaiting the candidate recovery procedure. | Unrun |

The PRF output reaches application JavaScript as a 32-byte buffer before import into a non-extractable AES key. The generated test payload and its decrypted copy also enter page memory. A same-origin script with access to these values can use them. A non-extractable key still permits cryptographic operations through its handle. No provider accounts or real backup material are used. The local origin is fulfilled in memory. Output contains only the browser version and case verdicts.

The test sets the virtual authenticator's user-verification state to verified. Physical user presence, biometrics, independent recovery factors, provider reset and sync behavior require separate evidence. The mock authenticator supplies no evidence of Apple or Google account independence. Q-02, Q-07, Q-25 and Q-29 remain open. The PoC recommendation is to refuse this wrapping path when PRF output is missing and evaluate any alternative recovery factor separately.

Run from the repository root in an environment with Python 3.12 and Chrome or Chromium.

```sh
python -m pip install -r requirements-ci.txt
python experiments/browser-prf/run.py
```

The runner uses CHROME_BIN when set and otherwise locates a system browser. Each assertion uses a new challenge. Production authentication still needs relying-party validation of the WebAuthn response, enrollment and recovery policy, and restart and backup testing on reference devices.

On 21 November 2026, Chromium 156.0.8078.79 on Linux x86_64 passed the four browser cases above. The account pairing and device cases remain unrun. The agent collected the evidence for owner and specialist review. [Run record](evidence/run.json) · [Browser output](evidence/virtual-authenticator.txt)
