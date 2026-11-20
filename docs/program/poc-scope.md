# Solo proof-of-concept scope

Execution decision POC-001. Owner and PoC reviewer: `dvkam`. Accepted by the owner in chat on 20 November 2026.

The current project is an unfunded, solo proof of concept. The owner directed the project to defer jurisdiction, revisit it later, and arrange Mac and physical iPhone access later. Independent specialist review, paid audit bookings, and counsel are not arranged. The owner is the only current human reviewer.

This decision changes the execution scope. It does not amend the preserved v0.5.1 baseline or mark its production gates passed. Published ticket dependencies continue to describe that baseline. PoC investigations can proceed without production staffing, legal advice, or audit bookings. Each investigation must still identify its technical prerequisites and unresolved assumptions before it runs.

## Current work

The agent prepares and reviews changes under the owner's standing instruction, fixes demonstrated findings, and merges reviewed pull requests. `dvkam` retains authority over product and architecture decisions. Agent reviews are development checks, not independent security audits or legal advice.

PoC experiments use test keys and test assets. An experiment can establish that a particular implementation runs, meets a measured local target, or fails a test. A PoC result cannot establish production safety, independent review, regulatory status, or physical iPhone readiness.

## Deferred dependencies

| Baseline ticket | Current treatment | Condition for resuming |
| --- | --- | --- |
| P0-04, issue #4 | Record solo ownership and unfunded status. Do not invent staffing, funding, or review bookings. | The owner decides to fund or expand the project. |
| P0-05, issue #5 | Jurisdiction and counsel engagement are deferred. Platform research can proceed. No jurisdiction is inferred from the owner's location. | The owner supplies the operating context and requests the legal work. |
| P0-06, issue #6 | Draft proof obligations and technical review rules for PoC work. Specialist acceptance remains unfilled. | The baseline's required specialist review is arranged. |
| P0-07 and later production gates | Keep the baseline verdict blocked or unreviewed. Record PoC evidence separately. | The required evidence and reviewer conditions are met. |
| iOS and device-dependent experiments | Prepare reproducible experiments, but mark physical-device cases unrun. Linux or browser results cannot substitute. | Mac, Xcode, and physical iPhone access are established. |

Questions and risks in the owner register remain open unless a later decision explicitly settles them. Q-15 has no jurisdiction assumption. Q-24 is answered only for the present solo PoC, and remains open for the baseline's funded release scope. No fixed spending limit, custody design, curve admission, or release commitment follows from this decision.
