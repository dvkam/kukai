# Recovery timing properties, version 1

This PoC covers the recovery path R in obligations 6(b) and the safety part of 6(c). This property list precedes the model. The product recovery timings and the identity of the additional factor remain open under Q-33. The model assumes an honest service, a service clock that advances by one logical tick at a time, and an independently protected additional factor. Only an eligible enrolled old device can object. The claimant has already met all ordinary recovery conditions. [Frozen source obligations](../../docs/program/verification/initial-obligations-v0.1.json) · [Issue #21](https://github.com/dvkam/kukai/issues/21)

| Property | Required invariant |
| --- | --- |
| REC-6B-TIME | Completion occurs at or after the original deadline. After an objection, it occurs at or after the deadline derived from the first objection. |
| REC-6C-ONCE | Before an objection the service deadline equals the original deadline. Once the observer records a first objection at tick f, the deadline always equals max(original deadline, f + dispute delay). Another objection cannot change it. |
| REC-6C-FACTOR | If completion occurs after an objection, the claimant possesses the additional factor. |

All three are safety properties. Check them exhaustively within one active recovery, one abstract eligible device, a claimant with or without the additional factor, logical ticks 0 through 8, a base delay of 2 and a dispute delay of 3. The extra-factor flag is fixed per run. The device can object on any tick while the request is pending, including the first eligible completion tick. Explore both orderings of completion and objection. Repeated objections can occur at the same or later ticks. Terminal completion freezes the result.

The observer records the first objection independently of the service deadline. Deliberately renew the deadline on a later objection, bypass the completion delay, and bypass the extra-factor guard separately. Each mutation must produce a counterexample to its named property. No fairness condition or eventual-completion claim is part of this model. The finite horizon can end with a still-pending request. Notifications, factor authentication, durable clocks, concurrent recoveries, implementation trace mappings and production recovery remain outside this check. An in-scope counterexample blocks reliance on the corresponding property. Owner dvkam retains all architecture and gate decisions. Specialist review is outstanding.
