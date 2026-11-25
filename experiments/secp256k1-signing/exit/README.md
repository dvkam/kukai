# EIP-1559 exit with retained secp256k1 shares

This Linux experiment exercises the A1 device and recovery shares for [issue #29](https://github.com/dvkam/kukai/issues/29). A fixture process runs the pinned CGGMP24 dealerless key generation with a two-of-three threshold. It generates new synthetic keys, writes the device and recovery core packages plus the account and public key, and exits. It never writes the service package. The runner retains the user packages and removes the setup directory before launching any signer.

Each signer starts with an empty environment and a fresh working directory containing the device and recovery files and the pinned account address. The signer checks participant indices 0 and 2, the two-of-three threshold, the common public key and the account address. It reconstructs the conventional 32-byte secp256k1 private key and imports it into k256 in memory. The output contains only a signed EIP-1559 envelope. The verifier runs separately with the signed bytes, public key and expected account. Alloy decodes the envelope and recovers the signer. The verifier also uses k256 directly to verify the signature and recover the public key, then checks the account address by hashing the retained key. Alloy and the direct verification both use the pinned k256 implementation. The verifier rejects changed value and chain ID in the signing input, and the runner verifies that decoding rejects extra bytes appended to the wire envelope.

| Fixture | Expected result |
| --- | --- |
| Original device and recovery shares, Ethereum chain ID 1 | A fresh process signs. Alloy and k256 verify against the pinned account. |
| Same shares, Base chain ID 8453 | A fresh process signs and both verification paths agree. |
| Either share alone | The signer refuses without emitting a transaction. |
| Exchanged roles or a duplicated device share | The signer refuses the participant index. |
| Wrong account, recovery package from an unrelated key or truncated recovery file | The signer refuses without emitting a transaction. |

The exit experiment reconstructs an exportable private key in one process. It performs conventional ECDSA signing after reconstruction. The separate [signing experiment](../README.md) covers threshold signing in one process and generates auxiliary parameters. This exit runner needs only the core DKG shares and skips auxiliary setup. The foreign-share case comes from an independent DKG and does not demonstrate proactive refresh. The generated backup files are plaintext in private temporary directories and are deleted before the runner exits. The experiment does not establish secure deletion, production backup encryption, or authentic account metadata.

## Asset and authority coverage

| Item | Exercise | Boundary |
| --- | --- | --- |
| Ethereum and Base native coin | Sign and verify a synthetic 1 wei transfer for each chain ID. | No funded account, node, balance check or broadcast. The random nonce is a fixture input. |
| Fees | Encode a 21,000 gas limit, 2 gwei maximum fee and 1 gwei priority fee. | No fee quote, confirmation, Base data fee estimate or fee payment. |
| Tokens, NFTs, approvals and admin authorities | No operation. | Contract-specific transfer, revocation and migration remain unverified. |
| Public infrastructure and share lifecycle | The offline runner uses only the retained files and built binaries. | Public RPC, old address exposure, account migration, refresh, timelocks and frozen assets remain open. |

## Replay

Build the pinned dependency set with Rust 1.100.0, then run with Python 3.12 and util-linux. Use a machine that allows unprivileged user namespaces.

```sh
cargo +1.100.0 build --release --locked --examples --manifest-path experiments/secp256k1-signing/Cargo.toml
parent_net=$(stat -Lc %i /proc/self/ns/net)
unshare --user --map-root-user --net -- python experiments/secp256k1-signing/exit/check.py \
  experiments/secp256k1-signing/target/release/examples --parent-net-inode "$parent_net"
```

The runner requires loopback as its only interface, a different network namespace inode from the parent, and an unreachable external IPv4 route. Hosted CI creates the private namespace and drops to the runner's UID and GID before Python starts. The isolation applies to networking. The processes share the host kernel and filesystem. The crate manifest and lockfile pin the dependencies. [Cargo manifest](../Cargo.toml) · [Cargo lockfile](../Cargo.lock)

The local `--unisolated-smoke` flag runs the same positive and negative cases without checking or blocking the network. Its JSON output identifies the mode. Use the network namespace run for isolation evidence. Issue #29 and the G3 exit gate remain open.
