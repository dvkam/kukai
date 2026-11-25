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

Use Linux x86_64, Python 3.12, Chrome or Chromium, curl, tar and the Rust toolchain below. Run from the repository root. Set `CHROME_BIN` for a nonstandard browser path. Set `WASM_BINDGEN_ARCHIVE` to reuse the release archive. The script verifies the same pinned digest in both cases.

```sh
rustup toolchain install 1.100.0 --profile minimal --component clippy --target wasm32-unknown-unknown
python -m pip install -r requirements-ci.txt
bash experiments/ed25519-signing/browser/check.sh
```

The script builds the locked Rust dependencies in a fresh target directory and runs the optimized module with Playwright. It records the tool versions and the SHA-256 digests of the lockfile and pre-binding WASM on stderr. The JSON report includes the digests of the JavaScript and WASM bytes served to the browser. The browser supplies fresh randomness for each ceremony. In signing round one, each participant samples fresh nonces and sends commitments. In round two, each participant uses its saved nonces to sign the agreed package. This user-held quorum has no service revocation cutoff. The verifier crates are solana-signature 3.6.0 and tezos_crypto_rs 0.6.0. [Original five-sample build and run record](evidence/run.json)

The default smoke runs five sample pairs on the same page. One is the first use of the loaded module, one warms it up, and three contribute to the summary. Run the following command for a longer local measurement after other builds and benchmarks finish.

```sh
bash experiments/ed25519-signing/browser/check.sh --warmups 5 --samples 200 \
  > samples.json 2> build.txt
```

Each sample generates independent Solana and Tezos groups and verifies both signatures and their negative controls through the chain libraries. The report separates module loading and initialization, the first-use sample, the warm-up samples, and raw measured samples. Each timing uses the browser's performance clock. Signing covers nonce generation through aggregation, including FROST verification of the aggregate signature. Service-share removal, Tezos message hashing, signature serialization, chain-library verification and network time fall outside the signing interval.

For each metric, the warm summary reports the median, range and nearest-rank p50, p90, p95 and p99 over successful measured samples. For percentile `p` over `n` timings, take the one-based element at `ceil(n × p / 100)` from the ascending order. A failed sample ends the run and the report counts the remaining measured attempts as skipped. The final entropy control confirms that a browser randomness failure traps in WASM. The report contains timings, platform and build metadata, and verification outcomes. The measurements cover local synthetic ceremonies in headless Chromium on Linux. Reference-device measurements, distributed recovery and secure erasure remain open.

## Recorded latency, November 25, 2026

Chromium 156 on Linux completed all 200 measured sample pairs. One cold pair and five warm-ups appear separately in the raw output. Each pair generated two fresh synthetic threshold keys. All signing roles ran in the same browser process. The entropy control observed one rejected request. The browser made no unexpected requests and reported no page errors. [Raw samples, package hashes and host details](evidence/latency-2026-11-25.json)

| Operation, milliseconds | p50 | p90 | p95 | p99 |
| --- | ---: | ---: | ---: | ---: |
| Solana key generation | 6.8 | 11.3 | 15.3 | 24.5 |
| Solana signing | 1.6 | 2.7 | 3.1 | 6.7 |
| Tezos key generation | 6.8 | 11.2 | 15.9 | 32.3 |
| Tezos signing | 1.6 | 2.4 | 2.9 | 6.4 |

These measurements cover the local cryptographic calls. Interactive approval, distributed protocol communication and physical iPhone timings remain open. [Performance tracker](https://github.com/dvkam/kukai/issues/52)
