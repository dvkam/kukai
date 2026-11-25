# Native SOL exit with retained Ed25519 shares

This test for issue #29 exercises a native SOL transfer in a local Solana virtual machine. The fixture process creates a synthetic two-of-three FROST key and refreshes its shares. It writes only the device share, recovery share, public package and account reference. It exits before signing. The runner retains those files and removes the setup directory. Each original or refreshed quorum signs in a separate process with an empty environment and a fresh working directory. [Issue #29](https://github.com/dvkam/kukai/issues/29)

The signer checks the pinned 32-byte account, two expected roles, threshold and verification shares. It accepts a versioned binary test request containing the payer, recipient, recent blockhash and amount. The 112-byte layout has the eight-byte tag `KUKASOL1`, three 32-byte fields in that order, and the amount as a little-endian `u64`. The signer constructs only the two fixed System Program transfer amounts used by this drill, with the account as the sole signer and fee payer. It emits a detached 64-byte signature over the legacy Solana message. It uses the same FROST validator as the challenge signer. [Challenge drill](README.md)

Solders independently constructs the message from the intended transfer fields and verifies the signature. The verifier changes each of payer, recipient, amount and blockhash and requires signature verification to fail. LiteSVM rejects an empty transaction signature without changing balances. With signature and blockhash checks enabled, LiteSVM executes each valid transfer in a separate, fresh runtime. Each transfer credits a fresh synthetic receiver keypair. After checking the credited System Program account and its balance, the runner verifies a domain-separated receipt signed by that receiver. The run output contains no private key or receipt signature.

| Check | Expected outcome |
| --- | --- |
| Original device and recovery pair | Perform a 2,000,000 lamport partial transfer. Sender moves from 10,000,000 to 7,995,000. Receiver moves from 0 to 2,000,000. |
| Refreshed device and recovery pair | Sweep the starting balance minus the fee measured in the original run. The sender ends at zero and the receiver gets 9,995,000 lamports. |
| Fee | Each transfer pays 5,000 lamports from the sole signer. |
| Receiver control | Verify the credited account is owned by the System Program and the receiver keypair can sign a receipt bound to the transfer message. |
| Later deposit | The swept address can receive 1,000,000 synthetic lamports after the sweep. The receiver retains its 9,995,000. |
| Stale recovery mixed with the refreshed device, missing recovery, swapped roles or wrong account | Refuse without signature bytes. |
| Wrong request payer or amount, or truncated request | Refuse without signature bytes. |

## Asset and authority coverage

LiteSVM funds the synthetic payer with an in-memory airdrop. There are no funds on a public chain. A complete old quorum still controls the same key after refresh. The stale-material case tests a mixed quorum. The later synthetic deposit demonstrates that draining SOL leaves the old address available to receive funds.

This exercise covers native SOL and its single-signer base fee under the pinned runtime. The System Program transfer touches only the sender and recipient. It closes no token accounts. Token balances, mint authorities, delegates, frozen assets, stake, and program-specific controls remain outside this run. The separate Solana fee experiment exercised a classic SPL Token transfer with a sponsor. Public RPC, current fee estimates, priority fees, authority migration and broadcasts remain unverified. G3 and issue #29 stay open. [Solana fee experiment](../../solana-fees/README.md)

## Replay on Linux

Build with Rust 1.100.0 and install the hash-pinned Linux x86_64 Solders dependencies with Python 3.12 before starting the private namespace. Run on a machine that permits unprivileged user namespaces.

```sh
cargo +1.100.0 build --locked --examples --manifest-path experiments/ed25519-signing/Cargo.toml
python -m venv /tmp/kukai-sol-exit
/tmp/kukai-sol-exit/bin/python -m pip install --only-binary=:all: --require-hashes \
  -r experiments/solana-fees/requirements-linux-x86_64.txt
parent_net=$(stat -Lc %i /proc/self/ns/net)
unshare --user --map-root-user --net -- /tmp/kukai-sol-exit/bin/python experiments/ed25519-signing/exit/check_sol.py \
  experiments/ed25519-signing/target/debug/examples --parent-net-inode "$parent_net"
```

The runner checks for a different namespace inode, loopback as the sole interface, and no external IPv4 route. CI uses the same private-namespace checks after dropping back to the runner's UID and GID. The processes share the host kernel and filesystem. On a host that cannot create a namespace, `--unisolated-smoke` instead of `--parent-net-inode` runs the transaction and refusal tests and labels them as unisolated.
