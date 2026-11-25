# Solana token transfer fees and recipient account rent

Can a user with no SOL send existing SPL tokens when a separate account pays the transaction fee? This local LiteSVM case supplies a classic SPL mint, a source account holding 100 raw units, and an empty destination token account. Both token accounts already have their rent deposits. The token authority has no funded system account. A checked transfer moves 25 raw units at mint precision 2. All keys and balances exist only in the local runtime. Owner dvkam retains Q-18. [Issue #20](https://github.com/dvkam/kukai/issues/20) · [Release 1 scope](../../docs/program/program-plan-v0.5.1.md#5-release-1-scope)

| Case | Expected and observed |
| --- | --- |
| Token owner signs as the sole fee payer | The runtime rejects the unfunded payer with AccountNotFound. Token balances stay at 100 and 0. |
| Sponsor is fee payer, one signature is missing | Removing the payer signature or the owner's signature separately yields SignatureFailure. Neither attempt debits the sponsor or moves tokens. |
| Both parties sign the same message | The runtime executes TransferChecked. The balances become 75 and 25. The sponsor pays 10,000 lamports for two signatures under this fixture's fee schedule. The owner retains zero SOL. |

The sponsor pays the transaction fee directly. It does not fund the token owner's system account. The measured fee applies to this transaction and runtime configuration. Priority fees, live network policy, sponsor authorization and availability require separate evidence. Ethereum, Base and Tezos require their own fee experiments. This result leaves the launch sponsorship decision open.

## Sending to a new recipient

The second fixture sends classic SPL tokens to a recipient without a token account. The sponsor and token owner sign one transaction containing the associated token program's idempotent create instruction and a checked transfer. The recipient signs nothing. LiteSVM derives the rent deposit from the account data size. Each repeat uses a fresh blockhash.

| Transaction | Sponsor debit in lamports | Observed result |
| --- | ---: | --- |
| Sponsor can cover the fee but lacks the rent deposit | 10,000 | The System Program reports insufficient lamports. The recipient account remains absent and the token balance stays unchanged. |
| Account creation succeeds but the transfer exceeds the source balance | 10,000 | The token program reports insufficient funds. The transaction rolls back account creation and token balances. |
| First successful send | 2,049,280 | The sponsor pays a 10,000 fee and deposits 2,039,280 into the new token account. The recipient gets 25 raw units. |
| Second successful send to the same account | 10,000 | The idempotent instruction keeps the existing deposit. The recipient now holds 50 raw units. |

The SPL Token Program owns the new account. The recipient holds its token authority, with no separate delegate or close authority. Both token authorities finish with zero SOL in their system accounts. Rent remains in the token account and is separate from the transaction fee. These values apply to this classic SPL fixture. Token-2022 extensions and live cluster fees need separate measurements. [Issue #20](https://github.com/dvkam/kukai/issues/20)

Replay on Linux x86_64 using Python 3.12. The lock pins the runtime wheel and its Python dependencies by SHA-256. No RPC endpoint or provider credentials are needed after installation.

```sh
python -m venv /tmp/kukai-solana-fees
/tmp/kukai-solana-fees/bin/python -m pip install --only-binary=:all: --require-hashes -r experiments/solana-fees/requirements-linux-x86_64.txt
/tmp/kukai-solana-fees/bin/python experiments/solana-fees/check.py
```

[Per-case output](evidence/results.txt) · [Run record](evidence/run.json)
