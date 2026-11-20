# Decision record

Source: [baseline decision log](program-plan-v0.5.1.md#2-decision-log). Accountable owner: `dvkam`. Recorded: 20 November 2026.

## Accepted record

DEC-001 through DEC-027 retain their baseline meaning and status. Their dated groups and amendments remain in the source log. The owner accepted v0.5.1 as the planning baseline, requested execution through the created issues, and confirmed `dvkam` as the current accountable owner. This record adds no custody, library, product, or proof decision.

The external-review verdicts in appendix R record review history. Only amendments incorporated into the owner's accepted baseline are decisions. Reviewer recommendations and AI review results do not independently authorize new scope or satisfy specialist review requirements.

## Current execution decision

[POC-001](poc-scope.md) records the owner's subsequent direction to continue as an unfunded solo PoC, with `dvkam` as the only human reviewer. Production dependencies remain deferred. The baseline decisions above are preserved.

## Proposals awaiting decisions

Every baseline item labelled Proposal remains proposed. This index groups those items by decision work. It does not approve their implementation.

| Baseline proposal | Required decision work |
| --- | --- |
| Section 4 differentiation hypotheses, quality targets | P1-01 through P1-03, issues #8 through #10 |
| Section 5 key separation and derivation | P3-01, issue #24 |
| Section 5 operations, token lists, data providers, signing, simulation, and dApp interfaces | P2-08 and P2-09, issues #19 and #20, accepted at G2 |
| Section 5 wrong-network safeguards | P1-03, issue #10, accepted at G1 |
| Section 5 proposed later platforms and functions | P0-07, issue #7, retains Q-14's existing deferral |
| Section 6 state machines, L1 to L3 response, in-flight cutoffs, and backup rules | P2-01, P2-03, P2-04, P2-07, and P2-10, issues #12, #14, #15, #18, and #21 |
| Section 6 device storage, web release controls, and spending limits | P2-02 and P2-06, issues #13 and #17. Android storage remains release 2. |
| Section 6 signing policy, token metadata, media proxy, read path, and provider rules | P2-08 and P2-09, issues #19 and #20 |
| Sections 6 and 7 component split, repository layout, and build tools | P0-03 verifies candidates, issue #3. P3-07 resolves the language comparison, issue #30. A separate initialization decision must accept the layout before implementation. |
| Section 8 property lists, trust boundaries, verification reports, and proof obligations | P0-06 prepares the initial register, issue #6. P2-01 freezes the model-specific obligations, issue #12. P2-10 supplies proof evidence, issue #21. |

The section 8 safety requirements constrain these proposals. Neither a proposal's status nor an approved liveness exception can waive a mandatory safety property. The [question register](owners.md#questions) routes every open choice to its closing ticket. Any new proposal needs a dated decision entry under the [charter's acceptance rules](charter.md#accountability-and-acceptance).
