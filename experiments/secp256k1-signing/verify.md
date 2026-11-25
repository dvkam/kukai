# Run the secp256k1 experiment

Run these commands from the repository root. The test uses temporary keys and never sends a transaction.

```sh
rustup toolchain install 1.100.0 --profile minimal --component rustfmt --component clippy
cargo +1.100.0 fmt --manifest-path experiments/secp256k1-signing/Cargo.toml -- --check
cargo +1.100.0 clippy --release --manifest-path experiments/secp256k1-signing/Cargo.toml --locked --all-targets -- -D warnings
cargo +1.100.0 test --release --manifest-path experiments/secp256k1-signing/Cargo.toml --locked -- --nocapture
```

Expect three quorum tests and seven EVM approval-binding tests to pass. No test should be ignored or filtered. Parameter generation can take several minutes. Keep the full output and exit code. A timeout or error is an incomplete or failed run, not a passing result.

Use the release profile for these native checks. Keep the security parameters unchanged. Do not reuse or persist test primes, key packages, nonces, or presignatures to shorten later runs.
