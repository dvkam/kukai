# Check the pinned Rust libraries

This experiment compiles upstream FROST and CGGMP24 libraries for the native host and WebAssembly. It does not run DKG, sign a transaction, test browser entropy, or establish security.

Use Python 3, rustup, Rust 1.100.0, and a native C toolchain. Add the WebAssembly target to that Rust installation.

```sh
rustup target add wasm32-unknown-unknown --toolchain 1.100.0
python3 experiments/library-build-check/run.py --output /tmp/kukai-library-check
```

The output directory must not already exist. The script verifies package archive checksums, copies the checked-in dependency locks, and runs all four checks. Each result records its exact command, exit code, and log path in `results.json`. A failed check makes the script exit nonzero. A download or setup failure aborts the run and must not be reported as a passing check.

FROST uses its default features. CGGMP24 uses its defaults plus `curve-secp256k1`. No unsafe preimage-bypass feature or mock cryptography is enabled. Dependencies retain their upstream licenses. The script implements no cryptographic primitive.

The source pins and archive hashes are in [sources.json](sources.json). The [capability record](../../docs/program/capabilities/README.md) explains the limits and outstanding experiments.
