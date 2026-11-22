# Bounded recovery timing check

TLC explores one pending recovery under an honest signer. The old device may object before completion. The observer records the first objection separately from the service's dispute state. The claimant's possession of the additional factor is fixed for each execution. The three safety properties were recorded before the model in commit `18735a97`. [Properties and bounds](properties.md) · [Issue #21](https://github.com/dvkam/kukai/issues/21)

The example uses logical ticks 0 through 8, a base deadline of 2 and a dispute delay of 3. The first objection sets the later of the original deadline and three ticks after the objection. The device may object again on any pending tick. A lost device can stay silent. When an objection and completion are both enabled, TLC explores both orders. There is no fairness assumption. Time and a pending recovery may stop indefinitely. Notification attempts, channel delivery and factor authentication have no transitions in this model. The owner still needs to select the recovery policy.

| Case | Expected and observed | Status and evidence |
| --- | --- | --- |
| Unmodified model | TLC exhausted the reachable state graph and found no violation of the three timing and factor invariants or the type invariant. | Bounded check passed · [log](evidence/baseline.txt) |
| Ordinary completion | A claimant without the extra factor can complete an undisputed request once the base delay has elapsed. | Witness found · [trace](evidence/ordinary_witness.txt) |
| Disputed completion | A claimant with the factor can complete after the extended deadline. | Witness found · [trace](evidence/dispute_witness.txt) |
| Renew deadline on repeat | A later objection changes the deadline. REC6COnce detects the change. | Mutation detected · [trace](evidence/restart_dispute.txt) |
| Skip all waiting | The service completes before the base deadline. REC6BTime detects it. | Mutation detected · [trace](evidence/skip_delay.txt) |
| Ignore the extended deadline | The service completes a disputed request at the base deadline. REC6BTime detects it. | Mutation detected · [trace](evidence/ignore_dispute_delay.txt) |
| Ignore the extra factor | A disputed request completes without the factor. REC6CFactor detects it. | Mutation detected · [trace](evidence/skip_factor.txt) |

The runner checks the named invariant and the final state of every witness and counterexample. The baseline must exhaust the reviewed graph of 143 distinct states. The default replay checks the retained inputs and logs against their recorded digests before running TLC. The two witness cases refute the claim that the corresponding completion is unreachable. They establish that those paths exist within the finite model. They give no deadline by which a claimant will actually complete.

From the repository root, use Python 3.12 and Java 21. The runner downloads the checksum-pinned TLA+ tools release v1.7.4. An existing copy supplied with `--jar` must match the same digest. To retain fresh logs, pass a new directory with `--logs`.

```sh
python experiments/recovery-model/check.py
```

The [run record](evidence/run.json) pins the source, tool, command and output digests. One worker explores both initial factor states using the configured fingerprint polynomial. The trusted components include TLC, its fingerprint-based state storage, the JVM and the model-to-policy interpretation. The agent ran the check for dvkam. General proofs, symbolic factor checks, notification and recovery liveness, implementation trace validation and independent specialist review remain open.
