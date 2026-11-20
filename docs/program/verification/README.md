# Initial verification obligations

Research progress for [P0-06](https://github.com/dvkam/kukai/issues/6), recorded on 20 November 2026. Accountable owner and current human PoC reviewer: `dvkam`.

The [v0.1 snapshot](initial-obligations-v0.1.json) preserves all 17 baseline obligations, their path expressions, assumptions, residual statements, and explicitly listed non-waivable subproperties. [freeze.json](freeze.json) records its content digest. This freezes the source record before model work. It does not accept the baseline's proposed architecture, complete an independent review, or prove a property.

No model has run. No property is verified. Independent security review remains unfilled under POC-001, so the baseline ticket and G0 remain open. PoC model preparation can use this record while keeping every unresolved definition visible.

## Paths and assumptions

S means service-assisted signing, R means recovery, and X means unilateral exit. The source also refers to DKG and All. Those source expressions are retained rather than silently reducing DKG to S or treating All as service-only.

The assumptions remain the baseline's A-crypto, A-signer, A-client, A-factor, A-erase, A-fair, and A-chain. Obligation 4's `A-client or A-signer` is an alternative, not a conjunction. The subclauses of obligations 6, 12, and 15 retain separate assumptions. Source expressions about pairing rules or protocol guarantees need operational definitions before modeling.

The source's explicit non-waivable set is 1, 2, 4, 5, 6(b), 6(c), 7, 8, 9, 12(a), 12(b), 14, 15(a), 15(b), and 17. The broader rule also forbids waiving any safety property of signing, recovery, revocation, approval binding, or share independence. The explicit list is not permission to waive another security property.

## Classification and proposed tool map

This table is a planning proposal for P2-01 to refine and review. It does not turn tool availability into a proof. G2 refers to architecture evidence, G3 to feasibility and exit evidence, and G5 to implementation and audit evidence. A later implementation proof does not replace a required G2 architecture proof.

| Obligation | Classification and waiver treatment | Proposed tools and why | Evidence and gate |
| --- | --- | --- | --- |
| 1 | Authorization safety, non-waivable | TLA+ models release transitions. Apalache targets an inductive authorization invariant. Tamarin checks the request/session binding against an active attacker. | Model definitions, invariant proof, symbolic lemmas, and attacker traces at G2. Implementation conformance at G5. |
| 2 | Authentication/recovery safety, non-waivable | Tamarin separates possession of an identity credential from a qualifying factor/share set. | Symbolic non-authorization lemmas and compromised-identity traces at G2. |
| 3 | External cryptographic assumption, not proved here | Review the published proofs and the exact implementation departures. Model signing and share access as explicit abstract interfaces. | Assumption and source traceability at G2, reviewed protocol assumptions per curve at G3. Never report this as our proof of share privacy. |
| 4 | Replay and session-binding safety, non-waivable | Tamarin expresses freshness and transaction-bound authorization. TLA+ handles concurrent request state. | Replay, cross-account, cross-chain, and cross-session traces plus proof results at G2. |
| 5 | Revocation safety, non-waivable | TLA+ models the race between revocation and the protocol-specific irreversible release. Tamarin checks stale credentials and replay. | A defined cutoff for each protocol, invariant proof, and race counterexamples at G2. Runtime race conformance at G3/G5. |
| 6(a) | Attempt/record consistency is safety. Eventual notification attempts add liveness. Classification of the exact formula remains open. | TLA+ represents enrolled channels, attempt events, and their records. Delivery is not a required event. | Split the formula before model construction at P2-01. No exception is available while the security classification is unresolved. |
| 6(b) | Recovery-delay safety, non-waivable | TLA+ expresses time and the completion guard. Tamarin checks factor possession. | Explicit clock model, guards, and delay invariants at G2. |
| 6(c) | Dispute-state and factor safety, non-waivable. Distinguish bounded thief-triggered delay from eventual user completion. | TLA+ models the one allowed dispute transition and prevents reset loops. Tamarin checks the additional factor. | Repeated-objection, stolen-device, and missing-factor traces at G2. Fairness needed for completion must not be silently assumed. |
| 6(d) | Liveness under fairness, eligible only for a documented incomplete-proof exception | TLC explores fair bounded behaviors. Any full liveness proof needs a justified method and explicit fairness conditions. | Lost/destroyed-device traces, exact fairness formula, proof scope, or accepted unverified exception at G2. Runtime checks at G3. |
| 7 | Approval-binding safety, non-waivable | Tamarin binds approval to chain, recipient, and amount. TLA+ models mutation between approval and release. | Binding proof and payload-mutation traces at G2, parser/policy conformance at G5. |
| 8 | Share-independence/authorization safety, non-waivable | Tamarin gives the attacker coordinator and signer authority but withholds user factors. | No-quorum/no-recovery lemmas under A-crypto and A-factor at G2. |
| 9 | Recovery-factor independence safety, non-waivable | Tamarin models which parties can derive or retrieve factors. A data-flow review validates the model's sources. | Factor-access graph, pairing assumptions, symbolic lemmas, and compromise traces at G2. |
| 10 | Broadcast consistency is signing safety. Treat as non-waivable where asserted. | Tamarin models origin authentication and equivocation. TLA+ compares participant transcript views. | Resolve the source's alternative trust-assumption wording before G2. No silent weakening from a guarantee to a trusted coordinator. |
| 11 | DKG/display integrity is approval safety. Treat as non-waivable where asserted. | Tamarin binds transcript and account identifiers. Pure-core code proofs and conformance tests connect serialization to display. | Define transcript completion and address derivation at G2, chain-native checks at G3, code conformance at G5. |
| 12(a) | Login/session revocation safety, non-waivable | TLA+ excludes new service sessions after credential revocation. | Revoked-login traces at G2. No claim that L1 invalidates share material. |
| 12(b) | Generation separation safety, non-waivable | Tamarin distinguishes share generations under A-erase. TLA+ models replacement and active sessions. | Old/current generation attacks at G2 and per-curve tests at G3. Retained old quorums remain a separate residual. |
| 12(c) | Migration scope is an asset/authority safety claim. Exact formula and chain abstraction remain open. | TLA+ can track moved and unmoved assets. Chain-native tests must validate the modeled operations. | Define movable assets and supported authorities before the G2 model. Validate actual migration and residual exposure at G3. No exception while classification is unresolved. |
| 13 | Permission-escalation safety, non-waivable where asserted | Tamarin and TLA+ model the agent role with no authority to extend permissions or bypass policy. | Architecture restriction at G2. Phase 7 implementation proofs and conformance, with no agent authority in release 1. |
| 14 | Factor/identity separation safety, non-waivable | Tamarin models provider and credential-manager recovery paths, including one-account takeover. | Q-29 pairing graph, symbolic proof, and independent pairing experiments at G2. |
| 15(a) | Displayed-digest binding safety, non-waivable | Tamarin binds account, chain, payload, simulation context, and renderer version. Pure-core proofs handle encoding and comparison. | Digest definition and binding proof at G2, code and parser evidence at G5. |
| 15(b) | Independent confirmation safety, non-waivable | TLA+ models reservation and release policy. Tamarin binds the enrolled device's approval to the same digest. | Honest-signer dependency or a selected structural design from Q-01 at G2. Combined web/signer compromise remains the named residual. |
| 16 | Exit liveness under stated dependencies, eligible only for a documented incomplete-proof exception | TLA+ models availability and user actions. Runtime tests show independent signing and supported asset/authority movement. | Exact liveness assumptions at G2 and mandatory services-blocked exit drill at G3. A liveness exception does not waive the separate G3 demonstration. |
| 17 | Backup/session freshness safety, non-waivable | TLA+ models restore, increasing generations, and stale requests. Tamarin separates long-term shares from ephemeral signing state. | Restore/replay invariant at G2, crash and backup conformance at G3/G5. |

Creusot or Verus applies to every Rust pure core after the Phase 3 choice. Gospel/Cameleer/Why3 applies to an OCaml service core only if selected. Kani supplies bounded parser, serialization, and policy checks. Rocq is used for a lemma only when its full proof is required. ProVerif and the other language's verifier are cross-checks under DEC-018. None is a substitute for a failed mandatory obligation.

The [toolchain survey](../capabilities/toolchains.md) records compiler pins and unresolved compatibility. A named tool in this table has not yet been shown to express or prove the final formula. That feasibility check belongs to P2-01/P2-10 and blocks any stronger claim.

## Definitions still needed before models

P2-01 owns these definitions, with `dvkam` accountable.

- Define Authorized, Released, request identity, freshness, digest bytes, transcript identity, account derivation, and share-generation equality.
- Split mixed safety/liveness statements, especially 6(a), 6(c), and 12(c), without dropping their source requirements.
- Define protocol-specific cutoffs, clock transitions, recovery parameters, quorum candidates, and the exact chain abstractions used for exit.
- Supply residual statements where the source is blank or incomplete, including 3, 10, and 13. For every assumption-break test, identify the expected violation and named risk before accepting its result.
- Decide how each full-proof obligation will be discharged. TLC's bounded exploration and a verifier timeout cannot stand in for an unbounded proof.

The [review policy](review-policy.md) defines result status, mutation checks, trace mapping, and change control. The [snapshot check](verify.md) reproduces source coverage and digest integrity.
