# Ed25519 user-quorum signing in Chromium

Can the A1 candidate generate independent Solana and Tezos keys and sign with the two user shares in a browser? This experiment runs the same FROST 3.0.0 ceremony as the native suite. Each of three participants contributes to key generation. The module drops the service package and checks that the two remaining identifiers belong to the device and recovery shares before signing. All roles share one WebAssembly instance and memory. The experiment assumes honest page code and in-memory delivery of protocol messages. Owner: dvkam. [Issue #14](https://github.com/dvkam/kukai/issues/14)

| Case | Expected | Observed | Status and evidence |
| --- | --- | --- | --- |
| Solana user quorum | The Solana verifier accepts the original bytes and rejects a changed message or the other group's key. | All three assertions passed in five fresh groups. | Passed · [run](evidence/samples.json) |
| Tezos user quorum | The Tezos verifier accepts a signature over Blake2b-256 of the watermarked bytes and rejects removal of the watermark or the Solana key. | All three assertions passed in five separate groups. | Passed · [run](evidence/samples.json) |
| Browser entropy unavailable | Key generation stops when the browser refuses randomness. | The browser called the failing entropy source and the sample trapped. | Passed · [run](evidence/samples.json) |
| Physical iPhone and distributed exit | Measure the same paths on the reference device and exercise separately stored factors with the project services blocked. | Hardware, separate parties, and the exit tool remain outstanding. | Deferred |

The runner exercises synthetic message bytes. Chain-library verification covers the signature encodings and the Tezos watermark. Operation encoding, account state and transaction submission require separate tests. The page loads its code and module from in-memory localhost routes. The runner rejects unexpected page requests. These controls exercise a service-free signing call after an in-process ceremony. The G3 exit drill also needs persistent user material and an independent tool.

## Replay

Use Linux x86_64, Python 3.12, Chrome or Chromium, curl, tar and the Rust toolchain below. Run from the repository root. Set CHROME_BIN for a nonstandard browser path.

```sh
rustup toolchain install 1.100.0 --profile minimal --component clippy --target wasm32-unknown-unknown
python -m pip install -r requirements-ci.txt
bash experiments/ed25519-signing/browser/check.sh
```

The script verifies the SHA-256 digest of the Linux wasm-bindgen 0.2.108 release, builds the locked Rust dependencies, and runs the optimized module with Playwright. The browser supplies fresh randomness for every ceremony and signing round. The verifier crates are solana-signature 3.6.0 and tezos_crypto_rs 0.6.0. The runner prints only timings, platform information and control results. [Build and run record](evidence/run.json)

Five consecutive samples run on the same headless Chromium page on a shared Linux host. The browser's performance clock measures the three-party ceremony and each two-party signing call. Signing covers nonce generation through aggregation. Module loading, service-share removal, Tezos message hashing, serialization, signature verification and network time are outside the signing interval. The first sample includes first-use costs. These observations leave reference-device percentiles, recovery, secure erasure and independent review open.
