#!/usr/bin/env bash
# Replay the browser experiment with the Linux x86_64 wasm-bindgen release.
set -euo pipefail
experiment=$(cd "$(dirname "$0")/.." && pwd)
work=$(mktemp -d)
trap 'rm -rf -- "$work"' EXIT
tool=wasm-bindgen-0.2.108-x86_64-unknown-linux-musl
if [[ -n "${WASM_BINDGEN_ARCHIVE:-}" ]]; then
  cp -- "$WASM_BINDGEN_ARCHIVE" "$work/$tool.tar.gz"
else
  curl -fsSL --retry 3 "https://github.com/wasm-bindgen/wasm-bindgen/releases/download/0.2.108/$tool.tar.gz" -o "$work/$tool.tar.gz"
fi
(cd "$work" && echo "d15d7e476feec78d0ec9edc27b8f77279ec7a3e6227756e7036e5cd2066800f4  $tool.tar.gz" | sha256sum --check >&2)
tar -xzf "$work/$tool.tar.gz" -C "$work" "$tool/wasm-bindgen"
target_dir="$work/target"
flags=(--manifest-path "$experiment/Cargo.toml" --locked --lib --release --target wasm32-unknown-unknown --target-dir "$target_dir")
cargo +1.100.0 clippy "${flags[@]}" -- -D warnings
cargo +1.100.0 build "${flags[@]}"
wasm="$target_dir/wasm32-unknown-unknown/release/wallet_ed25519_signing_experiment.wasm"
rustc +1.100.0 --version --verbose >&2
"$work/$tool/wasm-bindgen" --version >&2
sha256sum "$experiment/Cargo.lock" "$wasm" >&2
"$work/$tool/wasm-bindgen" "$wasm" \
  --target web --out-dir "$work/pkg" --out-name quorum
python "$experiment/browser/run.py" "$work/pkg" "$@"
