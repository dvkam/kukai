# Concurrent web spending reservations

Can an honest signing service keep two devices from spending the same remaining allowance? This SQLite experiment exercises the LIMIT case for issue #17. Two workers use separate database connections to compete for one account's allowance. The fixture limit is 100 base units of one asset in a rolling 60-second window. These numbers make the boundary observable in a test. The owner retains the decisions on assets, limits, windows and custody. [Issue #17](https://github.com/dvkam/kukai/issues/17) · [Shared experiment cases](../../docs/program/threat-model/cases.md)

The caller supplies a trusted account identifier, a stable request identifier, the exact synthetic payload, a decoded operation class, integer base units and the service clock. The shared database belongs to the signer. Session and device identifiers have no place in the accounting key. This fixture assumes one chain, one asset, a trusted decoder and a common database for every signer worker. A client-supplied amount, an omitted fee or authority, a separate database per device, or a compromised service invalidates that assumption.

A reservation counts immediately. Only one worker can claim it. A claimed request stays in flight until the honest signer acknowledges its final signing handoff. At time t, pending reservations, in-flight attempts and charges completed in (t − 60, t] all count. The service samples the completion time after its final handoff, before the acknowledgment write. A missing acknowledgment leaves the amount held, even across a restart. Closing a session or restarting the process cannot return its allowance. Cancelled and charged identifiers remain in the database to reject replay. A stale service time fails closed. The service still needs a trusted clock across restarts. A forward jump can age charges early.

| Case | Expected and observed | Status and evidence |
| --- | --- | --- |
| Two devices request 60 each | Exactly one can begin signing. Both arrival orders count the pending hold. Cancelling an unconsumed hold lets the other request proceed. | Passed · [test output](evidence/tests.txt) |
| Split transfers | Four charges of 25 fill the budget. The next unit needs enrolled iOS approval. | Passed · [test output](evidence/tests.txt) |
| Retried, changed and concurrent requests | The original intent reserves once and starts once. A changed account, payload, class or amount cannot consume or cancel that hold. | Passed · [test output](evidence/tests.txt) |
| Worker loss and rolling-window boundary | Abrupt exit after reservation, claim or completion preserves the recorded state. Both a pending hold and a stalled signing attempt survive the full window. A charge expires exactly 60 seconds after the supplied post-handoff timestamp. Backdated signing fails after reopening. | Passed · [test output](evidence/tests.txt) |
| Zero-value permissions and unknown requests | Approvals, permits, operator grants, delegations and EIP-7702 go to the iOS path. Unknown classes and invalid transfer amounts refuse. | Passed · [test output](evidence/tests.txt) |
| Independent confirmation, on-chain effects and recovery | An enrolled device must confirm the exact intent on the separate iOS path. The signing protocol, actual settlement, reorgs, database restoration and multi-region failure require separate experiments. | Unrun |

Completion is a trusted service event after handing off signing material. A transaction can settle later. A worker must never acknowledge completion before that handoff. A database rollback to an older snapshot can resurrect a spent allowance. Long-lived unresolved holds can deny further web spending. This experiment provides no iOS approval interface and releases no signature. Web-only users who receive the iOS verdict cannot proceed through this path. The unilateral user quorum remains outside service control.

Run from the repository root with Python 3.12 and SQLite 3.37 or later. No network or funded accounts are needed.

```sh
python -m unittest discover -s tests -p test_web_reservations.py -v
```

The [run record](evidence/run.json) pins the source and test output. The agent ran the experiment for dvkam. Custody selection, Q-26 and Q-30 remain open.
