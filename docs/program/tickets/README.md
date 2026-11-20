# Phase 0 to 3 ticket drafts

These 32 drafts describe the decisions and experiments required by [program plan v0.5.1](../program-plan-v0.5.1.md). All 32 were published as GitHub issues under the dvkam account on 20 November 2026. The [GitHub issue index](github-issues.md) maps the local IDs to issues 1 through 32. The local Markdown files preserve the original publication bodies. GitHub issues and linked pull requests track subsequent execution.

The plan is the accepted planning baseline. A draft ticket does not accept a proposal, assign a person, pass a gate or authorize implementation. The repository still contains the existing Kukai application.

## Start here

The owner authorized execution and assigned `dvkam` to P0-01. The [charter](../charter.md) records the accepted scope. The Phase 0 tickets then establish ownership, provenance, evidence, capacity and review rules. All later-phase work requires G0. Phase 1 and Phase 2 can run in parallel where their listed dependencies permit it.

The original ticket bodies below retain their Draft status. P0-01 now has an execution record in the [charter](../charter.md). No experiment has run and no gate has passed. The [owner register](../owners.md) assigns question and risk accountability. P0-04 must settle delivery roles, reviewer capacity, timeboxes, and dates before G0. Ticket IDs are local identifiers, not GitHub issue numbers.

## Tickets

| Ticket | Type | Blocked by |
| --- | --- | --- |
| [P0-01: Record the charter and assign the open decisions](p0-01.md) | Decision | None |
| [P0-02: Establish code provenance and the Kukai reuse boundary](p0-02.md) | Research | [P0-01](p0-01.md) |
| [P0-03: Verify cryptographic libraries and development toolchains](p0-03.md) | Research | [P0-01](p0-01.md) |
| [P0-04: Fund the work and reserve independent review](p0-04.md) | Decision | [P0-01](p0-01.md), [P0-03](p0-03.md) |
| [P0-05: Prepare custody legal questions and platform constraints](p0-05.md) | Research | [P0-01](p0-01.md) |
| [P0-06: Freeze the initial proof obligations and review rules](p0-06.md) | Decision | [P0-01](p0-01.md), [P0-03](p0-03.md) |
| [P0-07: Review G0 and authorize the next phases](p0-07.md) | Gate | [P0-01](p0-01.md), [P0-02](p0-02.md), [P0-03](p0-03.md), [P0-04](p0-04.md), [P0-05](p0-05.md), [P0-06](p0-06.md) |
| [P1-01: Choose the audience and supported onboarding conditions](p1-01.md) | Decision | [P0-07](p0-07.md) |
| [P1-02: Compare three interaction concepts and deliver C1](p1-02.md) | Experiment | [P1-01](p1-01.md) |
| [P1-03: Set product requirements and measurable quality targets](p1-03.md) | Decision | [P1-02](p1-02.md) |
| [P1-04: Review G1 and retain the C2 and C3 follow-ups](p1-04.md) | Gate | [P1-03](p1-03.md) |
| [P2-01: Model trust boundaries and define the experiment suite](p2-01.md) | Decision | [P0-07](p0-07.md) |
| [P2-02: Test identity independence and device-share storage](p2-02.md) | Experiment | [P2-01](p2-01.md), [P1-01](p1-01.md) |
| [P2-03: Test Ed25519 recovery and independent signing](p2-03.md) | Experiment | [P2-01](p2-01.md), [P1-01](p1-01.md) |
| [P2-04: Test secp256k1 recovery and independent signing](p2-04.md) | Experiment | [P2-01](p2-01.md), [P1-01](p1-01.md) |
| [P2-05: Select or defer the threshold BLS scheme](p2-05.md) | Decision | [P2-01](p2-01.md) |
| [P2-06: Choose custody and enforceable web exposure controls](p2-06.md) | Decision | [P1-02](p1-02.md), [P2-02](p2-02.md), [P2-03](p2-03.md), [P2-04](p2-04.md) |
| [P2-07: Define recovery and validate it with users at C2](p2-07.md) | Decision | [P2-06](p2-06.md), [P1-04](p1-04.md) |
| [P2-08: Specify signing policy and transaction conformance cases](p2-08.md) | Decision | [P2-06](p2-06.md), [P1-03](p1-03.md) |
| [P2-09: Decide fees, data services and operational boundaries](p2-09.md) | Decision | [P2-06](p2-06.md), [P1-03](p1-03.md) |
| [P2-10: Prove the architecture properties and test the assumptions](p2-10.md) | Experiment | [P2-07](p2-07.md), [P2-08](p2-08.md), [P2-09](p2-09.md), [P2-05](p2-05.md) |
| [P2-11: Receive legal advice for the selected custody design](p2-11.md) | Decision | [P2-06](p2-06.md), [P0-05](p0-05.md) |
| [P2-12: Review G2 against the minimum curves](p2-12.md) | Gate | [P2-10](p2-10.md), [P2-11](p2-11.md) |
| [P3-01: Validate the minimum keys and decide derivation](p3-01.md) | Experiment | [P2-12](p2-12.md) |
| [P3-02: Admit or defer owned Tezos tz2 accounts](p3-02.md) | Experiment | [P3-01](p3-01.md) |
| [P3-03: Admit or defer owned Tezos tz3 accounts](p3-03.md) | Experiment | [P2-12](p2-12.md) |
| [P3-04: Admit or defer owned Tezos tz4 accounts](p3-04.md) | Experiment | [P2-12](p2-12.md), [P2-05](p2-05.md) |
| [P3-05: Validate device storage and compromise responses](p3-05.md) | Experiment | [P3-01](p3-01.md), [P2-02](p2-02.md), [P2-07](p2-07.md) |
| [P3-06: Demonstrate unilateral exit with our services blocked](p3-06.md) | Experiment | [P3-01](p3-01.md), [P2-09](p2-09.md) |
| [P3-07: Run the services-language and Tezos-library comparison](p3-07.md) | Experiment | [P2-12](p2-12.md) |
| [P3-08: Review measured usability and latency at C3](p3-08.md) | Decision | [P3-05](p3-05.md), [P3-06](p3-06.md), [P1-04](p1-04.md) |
| [P3-09: Record key admission and review G3](p3-09.md) | Gate | [P3-02](p3-02.md), [P3-03](p3-03.md), [P3-04](p3-04.md), [P3-05](p3-05.md), [P3-06](p3-06.md), [P3-07](p3-07.md), [P3-08](p3-08.md) |

## Gates and handovers

| Review | Ticket | Required result |
| --- | --- | --- |
| G0 | [Review G0](p0-07.md) | The charter, ownership, provenance work, legal request, funded capacity and initial proof list are accepted. |
| C1 | [Compare interaction concepts](p1-02.md) | Product research informs the account model before the custody decision. |
| G1 | [Review G1](p1-04.md) | A concept and measurement conditions are accepted. C2 and C3 remain open. |
| C2 | [Validate recovery with users](p2-07.md) | The chosen custody design passes the recovery research protocol or returns for revision. |
| G2 | [Review G2](p2-12.md) | Mandatory architecture proofs, minimum-curve experiments and legal advice support Phase 3. |
| C3 | [Review measured usability and latency](p3-08.md) | Measured results meet the accepted targets or trigger a reviewed change and new run. |
| G3 | [Record key admission](p3-09.md) | Minimum keys are admitted, optional keys have verdicts, and required decisions and exit drills pass. |

A listed dependency means the required evidence must be accepted before the dependent ticket starts. Research can use provisional findings, but it cannot close a dependent decision early. If an accepted finding changes, reopen every decision and gate that relied on it. A failed required G3 experiment reopens the affected Phase 2 decisions.

The optional tz2, tz3 and tz4 tickets must record either admission evidence or explicit deferral. Their tests do not all have to run for G3 to pass. Deferral preserves address recognition and protocol capability checks. Ed25519 for Solana and tz1 and secp256k1 for Ethereum and Base are required. Their failure blocks admission.

## Question ownership

This table identifies the primary ticket that closes each open question. Later experiments can validate or reopen the decision. P2-06 closes Q-05 and Q-32 from the early curve experiments; P3-06 validates the complete exit tool.

| Question | Decision ticket |
| --- | --- |
| Q-01 | [P2-06: Choose custody and enforceable web exposure controls](p2-06.md) |
| Q-02 | [P2-02: Test identity independence and device-share storage](p2-02.md) |
| Q-03 | [P1-01: Choose the audience and supported onboarding conditions](p1-01.md) |
| Q-04 | [P2-07: Define recovery and validate it with users at C2](p2-07.md) |
| Q-05 | [P2-06: Choose custody and enforceable web exposure controls](p2-06.md) |
| Q-06 | [P3-01: Validate the minimum keys and decide derivation](p3-01.md) |
| Q-07 | [P2-02: Test identity independence and device-share storage](p2-02.md) |
| Q-08 | [P3-07: Run the services-language and Tezos-library comparison](p3-07.md) |
| Q-09 | [P3-07: Run the services-language and Tezos-library comparison](p3-07.md) |
| Q-10 | [P2-09: Decide fees, data services and operational boundaries](p2-09.md) |
| Q-11 | [P1-01: Choose the audience and supported onboarding conditions](p1-01.md) |
| Q-12 | [P1-02: Compare three interaction concepts and deliver C1](p1-02.md) |
| Q-13 | Deferred to Phase 7b. Agent preparation and delegation are outside these drafts. |
| Q-14 | Deferred until after release 1. The browser extension is outside these drafts. |
| Q-15 | [P2-11: Receive legal advice for the selected custody design](p2-11.md) |
| Q-16 | [P0-02: Establish code provenance and the Kukai reuse boundary](p0-02.md) |
| Q-17 | [P1-03: Set product requirements and measurable quality targets](p1-03.md) |
| Q-18 | [P2-09: Decide fees, data services and operational boundaries](p2-09.md) |
| Q-19 | [P2-04: Test secp256k1 recovery and independent signing](p2-04.md) |
| Q-20 | [P2-09: Decide fees, data services and operational boundaries](p2-09.md) |
| Q-21 | [P2-04: Test secp256k1 recovery and independent signing](p2-04.md) |
| Q-22 | [P1-01: Choose the audience and supported onboarding conditions](p1-01.md) |
| Q-23 | [P1-01: Choose the audience and supported onboarding conditions](p1-01.md) |
| Q-24 | [P0-04: Fund the work and reserve independent review](p0-04.md) |
| Q-25 | [P2-02: Test identity independence and device-share storage](p2-02.md) |
| Q-26 | [P2-06: Choose custody and enforceable web exposure controls](p2-06.md) |
| Q-27 | [P3-09: Record key admission and review G3](p3-09.md) |
| Q-28 | [P2-05: Select or defer the threshold BLS scheme](p2-05.md) |
| Q-29 | [P2-02: Test identity independence and device-share storage](p2-02.md) |
| Q-30 | [P2-06: Choose custody and enforceable web exposure controls](p2-06.md) |
| Q-31 | [P2-08: Specify signing policy and transaction conformance cases](p2-08.md) |
| Q-32 | [P2-06: Choose custody and enforceable web exposure controls](p2-06.md) |
| Q-33 | [P2-07: Define recovery and validate it with users at C2](p2-07.md) |

## Evidence and closure

These rules apply to every ticket. A later execution request must cover any spending, external communication or deployment it requires.

- Decision tickets close with a reviewed choice, its reasons, rejected alternatives and remaining assumptions. A recommendation alone does not close a decision.
- Experiment tickets retain reproducible commands, exact source revisions, tool versions, device and operating-system details, test inputs, raw measurements and results. Distinguish passed, failed, skipped and unrun cases.
- A failed experiment can complete an investigation. It does not pass admission. Record the failure, reopen the dependent decision and keep its gate blocked.
- Use test keys and test assets. Do not put private shares, recovery factors, authentication tokens or participant identities in public reports.
- Preserve the plan's non-waivable safety properties. A bounded check is not an unbounded proof, and recorded-trace conformance says nothing about unrecorded executions.
- Expected attacks outside a property's assumptions must match a named residual risk. An unexpected counterexample blocks the relevant gate. Do not add assumptions merely to dismiss a failure.
- Exceptions apply only to eligible properties. Record them as "Accepted exception, unverified", with an owner, risk and closing date.
- Verify independent exit with project-operated hosts blocked. Public RPC and chain availability remain dependencies. Recheck exit after supported recovery and share replacement.
- A spending account's balance limits its present assets, not lifetime losses. Custody evidence must cover future deposits, replenishment and any authority over vault accounts.
- Booked independent review satisfies the planning requirement only. It does not establish that an audit has passed. G5 remains a later release gate.
- Each gate closes with a pass, blocked or fail verdict and a named reviewer. An issue's closed state is not itself a gate verdict.

## GitHub publication

The owner authorized publication. Each ticket has its own issue, created in dependency order. Local dependency links were replaced with GitHub issue links. All published titles and bodies were read back and verified. GitHub also has 64 native blocking relationships, each checked after creation. At publication, all 32 issues were open and listed dvkam as their author. Current issue states are on GitHub.

Suggested labels are `phase:0` through `phase:3`, `kind:decision`, `kind:research`, `kind:experiment` and `kind:gate`. Apply `status:draft` until the owner accepts the ticket. Assign named people before execution. Keep later implementation tickets separate from this decision backlog.

Use GitHub Projects for status and milestones for G0 through G3 if needed. These are recommendations; no labels, milestones or project were created during issue publication. Check existing repository conventions before adding them.

Gate tickets are review records, not parent issues for their prerequisites. Add a program tracking issue if useful, and link all drafts to it without duplicating the plan.

## Writing source

The drafts use the [pstack unslop skill requested by the owner](https://github.com/backnotprop/pstack/blob/main/skills/unslop/SKILL.md), read on 20 November 2026. The skill was used for the writing pass; it was not installed in the project. Its source text is not vendored here.
