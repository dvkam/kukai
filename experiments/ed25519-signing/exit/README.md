# Offline Ed25519 proof of control

Can the A1 user quorum sign after the process that created its shares has exited? This Linux experiment for issue #29 uses new synthetic keys and a random challenge. A fixture process runs dealerless key generation and refresh. It writes the original and refreshed device and recovery packages, public packages and the original account key to private temporary storage. It exits before the first signing attempt. The service share is never written to disk. [Issue #29](https://github.com/dvkam/kukai/issues/29)

Each run starts a new signing process with an empty environment. Its working directory contains only the selected inputs. The signer checks the expected account, role identifiers, threshold and verification shares. It signs a domain-separated 32-byte challenge. A separate process uses the Solana signature library to verify the detached signature and reject a changed challenge.

The experiment uses a new Linux network namespace. The runner requires a different namespace inode from its parent, loopback as the only interface, and an unreachable route to an external IPv4 address. This isolates IP networking for the fixture, signer and verifier. The processes still share the host kernel and filesystem. A fresh working directory and an offline build artifact do not establish clean-machine portability.

| User material or control | Expected result |
| --- | --- |
| Original device and recovery packages | Sign for the original account. |
| Refreshed device and recovery packages | Sign for that same account. |
| New device and pre-refresh recovery package | Refuse the mismatched verification share. |
| Device only | Refuse the missing recovery file. |
| Wrong expected account | Refuse before signing. |
| Recovery and device files exchanged | Refuse the wrong role identifiers. |

The package format is FROST 3.0.0 serialization. The synthetic backup files are plaintext within private temporary directories. The fixture supplies the pinned account. A real user needs authenticated backup material and a trusted account reference. No Ed25519 seed is reconstructed. Asset transfers, remaining balances, revoked authorities, transaction fees, public RPC, secure deletion, secp256k1 and physical devices are outside this run. G3 and issue #29 remain open.

## Replay on Linux

From the repository root with Rust 1.100.0, Python 3.12 and util-linux, build once and then run in a private namespace. A host that permits unprivileged user namespaces can run:

```sh
cargo +1.100.0 build --locked --examples --manifest-path experiments/ed25519-signing/Cargo.toml
parent_net=$(stat -Lc %i /proc/self/ns/net)
unshare --user --map-root-user --net -- python experiments/ed25519-signing/exit/check.py \
  experiments/ed25519-signing/target/debug/examples "$parent_net"
```

Hosted CI creates the network namespace and drops to the runner's UID and GID before the Python runner starts. The signing case uses only prebuilt binaries. An unavailable namespace or a failed control fails the job.

Both user quorums signed and the independent verifier accepted both results. All four invalid input sets refused without emitting signature bytes. Changing the challenge invalidated each valid signature. Only loopback was visible and the external route check failed as expected. [Per-case results](evidence/result.json) · [Run record](evidence/run.json)

The native SOL transfer drill uses the same retained quorum with a System Program transfer in LiteSVM. [Native SOL transfer drill](sol.md)

The classic SPL Token replay uses the refreshed quorum to revoke an existing delegate and verifies the authority change in LiteSVM. [SPL delegate revocation](spl-revoke.md)

The native Tezos replay uses a separate refreshed quorum to sign one fixed tz1 transfer. Taquito forges the operation independently and verifies the `edsig`. [Native Tezos signing conformance](tz1.md)
