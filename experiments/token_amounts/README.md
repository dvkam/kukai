# Token amounts on the approval screen

This conformance experiment for issue #19 starts after a chain adapter has decoded a transfer. Two independently configured providers must describe the same chain, block, contract or mint, token ID and token standard. Provider labels model that configuration. The caller supplies the canonical identifiers and independently classifies a missing optional metadata field and a failed node read. The fixture performs no RPC calls. [Issue #19](https://github.com/dvkam/kukai/issues/19) · [Plan section 6](../../docs/program/program-plan-v0.5.1.md)

| Input | Required display or refusal |
| --- | --- |
| SPL mint field or ERC-20 decimals call | Scale only when both on-chain reads agree. Missing SPL precision refuses. A missing or reverting optional ERC-20 call yields raw units. An unavailable provider refuses. |
| FA2 metadata | Use the on-chain field when both providers agree. Off-chain precision never scales the amount. |
| FA1.2 metadata | Show raw units with an unknown-decimals warning. This conservative candidate policy applies even when both providers return matching metadata. |
| Unknown precision | Show raw units with a warning only within the configured cap for this exact asset. Refuse above it or when no cap exists. The cap is denominated in raw units and needs neither a price nor an assumed precision. |
| Conflicting reports | Refuse on different precision, source, block, token or provider independence failure. The amount screen cannot establish token identity from matching decimals. |

The formatter uses integer base units and decimal strings throughout. The fixture accepts SPL u64 and unsigned amounts up to 256 bits for the other adapters. Its display-precision ceiling is 255. Those bounds limit this PoC and leave larger Tezos naturals outside its coverage. The test cap of 50 is illustrative. The owner retains Q-31 and the signing policy decision.

From the repository root run `python -m unittest discover -s tests -p test_token_amounts.py -v`. The suite checks zero, trailing zeroes, integers beyond JavaScript's safe range, exact cap boundaries, unavailable and conflicting data, and unsuitable metadata. A display verdict covers only the amount. Simulation, approvals, payload binding, curated token identity, source verification and app integration need separate evidence.
