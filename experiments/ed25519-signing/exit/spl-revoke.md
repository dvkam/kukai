# Classic SPL Token delegate revocation with retained Ed25519 shares

This replay for issue #29 uses the refreshed A1 device and recovery pair to revoke a pre-existing delegate on one unwrapped, initialized classic SPL Token account in LiteSVM. The fixture generates new synthetic key material and exits. The runner retains the refreshed device share, recovery share, public package and pinned account reference, then removes the setup directory. A fresh process signs with an empty environment and a private working directory. It uses the same quorum validation as the native SOL exit drill. [Issue #29](https://github.com/dvkam/kukai/issues/29) · [Native SOL drill](sol.md)

The Rust example signs one fixed `Revoke` instruction for a synthetic source and the pinned LiteSVM's initial blockhash. Its only inputs are the four retained files. Solders constructs the legacy message independently and verifies the detached signature for the original token owner, the fee payer and sole required signer. LiteSVM checks signatures and blockhashes when it executes the transactions. The runner uses in-memory airdrops for the owner and delegate fee payers. It seeds rent-exempt token accounts, a fixed-supply mint, and an active grant directly in the local runtime.

| Local transaction | Source and destination balances in raw units | Source delegate and allowance | Fee in lamports |
| --- | --- | --- | ---: |
| Initial fixture | 100 and 0 | Synthetic delegate, 25 units | |
| Delegate's checked transfer of one raw unit | 99 and 1 | Synthetic delegate, 24 units | 5,000 paid by delegate |
| Retained quorum's `Revoke` | 99 and 1 | Absent, zero units | 5,000 paid by token owner |
| Former delegate signs the same transfer with a fresh blockhash | 99 and 1 | Absent, zero units | 5,000 paid by delegate |

The last transaction fails at the token instruction with `OwnerMismatch`. Both token authorities, the mint and both 2,039,280-lamport token account rent deposits are preserved throughout. Revocation clears the delegate option and allowance. The verifier decodes the token state because inactive bytes in the delegate field can remain after the option clears.

## Coverage and readiness

This run covers one classic SPL Token account's delegate grant after FROST share refresh. The old account retains the 99 raw units and remains under the token owner's control. The checked transfer before revocation proves the grant was usable. Owner-authorized asset migration, token account closure, other authority types, Token-2022, frozen or non-transferable assets and timelocks require separate evidence. The fixture uses no public RPC, live fee estimate or broadcast. The dependency lock pins Solders 0.26.0. Its LiteSVM fee schedule and pre-funded owner are part of this fixture. Real fee funding, persistent recovery on a clean machine and the G3 exit gate remain open. [Pinned LiteSVM dependencies](../../solana-fees/requirements-linux-x86_64.txt) · [Pinned Rust dependencies](../Cargo.lock)

## Replay on Linux

Build with Rust 1.100.0 and install the hash-pinned Linux x86_64 wheel and dependencies with Python 3.12 before entering the private network namespace.

```sh
cargo +1.100.0 build --locked --examples --manifest-path experiments/ed25519-signing/Cargo.toml
python -m venv /tmp/kukai-spl-exit
/tmp/kukai-spl-exit/bin/python -m pip install --only-binary=:all: --require-hashes \
  -r experiments/solana-fees/requirements-linux-x86_64.txt
parent_net=$(stat -Lc %i /proc/self/ns/net)
unshare --user --map-root-user --net -- /tmp/kukai-spl-exit/bin/python \
  experiments/ed25519-signing/exit/check_spl_revoke.py \
  experiments/ed25519-signing/target/debug/examples --parent-net-inode "$parent_net"
```

The runner checks for a distinct network namespace, loopback as the only interface and no route to an external IPv4 address. CI uses the same checks after dropping to the runner's UID and GID. The local host rejected namespace creation, so the recorded run used `--unisolated-smoke` in place of `--parent-net-inode "$parent_net"`. Its November 25, 2026 output records the signer digest and each observed state. [Local smoke output](evidence/spl-revoke-local-smoke.json)
