# Native Tezos tz1 signing with retained Ed25519 shares

The setup process creates a synthetic two-of-three FROST key for Tezos, refreshes it and exits. The runner removes the setup directory. A new signer process starts with an empty environment and a private working directory containing only the refreshed device and recovery packages, the public package and the pinned 32-byte account key. The signer checks the public key, share roles, threshold and verification shares. The service share stays in setup memory. [Issue #14](https://github.com/dvkam/kukai/issues/14) · [Issue #29](https://github.com/dvkam/kukai/issues/29)

The signer derives its tz1 source from the pinned Ed25519 public key and takes only the four retained file paths. It signs one fixed native transfer to a synthetic user recipient derived from a public test seed. The transfer uses the fake branch from the Ushuaia codec comparison, counter `1`, fee `500` mutez, gas limit `1500`, storage limit `0`, amount `1000000` mutez and absent parameters. The signer emits the unsigned bytes and a Base58Check `edsig` over `Blake2b-256(0x03 || unsigned operation bytes)`. `tezos_crypto_rs` 0.6.0 checks the signature before the signer emits it. FROST 3.0.0 signs directly with the retained shares. [Ushuaia codec comparison](../../tezos-encoding/README.md) · [Rust dependency lock](../Cargo.lock)

Taquito 25.1.1 derives the source and recipient addresses, forges the unsigned operation for Ushuaia and checks it byte for byte against the signer output. It parses the unsigned bytes back to the expected fields and verifies the `edsig` with operation watermark `0x03`. Verification fails after changing the amount, representing the default Unit parameter explicitly, omitting or changing the watermark, or using a different public key. A stale recovery share, missing recovery share, wrong account reference or extra operation input causes the signer to refuse without producing any output. [Wallet dependency lock](../../../package-lock.json)

This replay measures signing compatibility on synthetic bytes. It makes no network requests and broadcasts nothing. Manager account revelation, live branches and counters, fee estimation, protocol execution, asset and authority migration, and clean-device recovery remain outside the replay. The runner retains FROST packages and does not reconstruct a standard Ed25519 seed. Issues #14 and #29 and gate G3 remain open.

## Replay on Linux

Use Node 24.22.1, Python 3.12 and Rust 1.100.0. Install the lockfile dependencies and build the binaries before creating the private network namespace. Run from the repository root on a machine that permits unprivileged user namespaces.

```sh
HUSKY=0 npm ci --no-audit --no-fund
cargo +1.100.0 build --locked --example exit_fixture --example exit_tz1_transfer \
  --manifest-path experiments/ed25519-signing/Cargo.toml
parent_net=$(stat -Lc %i /proc/self/ns/net)
unshare --user --map-root-user --net -- python3 experiments/ed25519-signing/exit/check_tz1.py \
  experiments/ed25519-signing/target/debug/examples "$(command -v node)" --parent-net-inode "$parent_net"
```

The runner requires a different network namespace inode, loopback as the sole interface and no external IPv4 route. The CI step creates the namespace with `sudo unshare` and switches back to the runner's UID and GID before replay. On a machine that cannot create a network namespace, omit `unshare --user --map-root-user --net --` and use `--unisolated-smoke` instead of `--parent-net-inode "$parent_net"`. The smoke command labels its output as unisolated.

The November 25, 2026 local smoke recorded one verified signature, five verification failures and four signer refusals. The JSON includes the signer binary's SHA-256 and the public operation fields. [Local smoke output](evidence/tz1-local-smoke.json)
