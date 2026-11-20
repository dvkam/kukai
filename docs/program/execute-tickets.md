# Execute program tickets

These rules apply to every ticket. A later execution request must cover any spending, external communication, or deployment it requires.

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

## Update GitHub records

The owner authorized publication. Each ticket has its own issue, created in dependency order. Local dependency links were replaced with GitHub issue links. All published titles and bodies were read back and verified. GitHub also has 64 native blocking relationships, each checked after creation. At publication, all 32 issues were open and listed dvkam as their author. Current issue states are on GitHub.

Suggested labels are `phase:0` through `phase:3`, `kind:decision`, `kind:research`, `kind:experiment` and `kind:gate`. Apply `status:draft` until the owner accepts the ticket. Assign named people before execution. Keep later implementation tickets separate from this decision backlog.

Use GitHub Projects for status and milestones for G0 through G3 if needed. These are recommendations. No labels, milestones, or project were created during issue publication. Check existing repository conventions before adding them.

Gate tickets are review records, not parent issues for their prerequisites. Add a program tracking issue if useful, and link all drafts to it without duplicating the plan.

