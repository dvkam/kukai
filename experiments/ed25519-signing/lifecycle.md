# Native Ed25519 share refresh and repair

The A1 experiment has three FROST participants. Participant 1 holds the device share, 2 the service share, and 3 the independent recovery share. Successful refresh requires all three members of this test roster. Exit requires only participants 1 and 3. The helpers generate fresh keys, execute the library rounds with local authenticated routing assumed, and verify successful user-quorum signatures with the Solana verifier. [Issue #14](https://github.com/dvkam/kukai/issues/14)

| Case | Intervention | Required observation |
| --- | --- | --- |
| Refresh | Run dealerless refresh for the entire DKG group. Retain both generations for comparison. | The group public key stays fixed. The two current user shares sign. Each old and current user-share mixture fails against both public packages. Both old user shares together still sign for the original account. |
| Interrupt | Withhold participant 1's private round-two delivery to participant 3. Discard tentative outputs and retry with fresh randomness. | The library reports a missing package. The original exit quorum signs after the interruption. The successful retry preserves the account and yields a working user quorum. |
| Restore | Serialize the recovery key package before and after refresh. Combine each restored package with the current device. | The stale recovery share fails. The updated backup and current device can sign. |
| Repair | Remove the device from the helpers' inputs. Let service and recovery run the library's repair protocol for the original device identity. Retain the lost device's old package outside the protocol. | The repaired verification share matches the expected public share. Both the repaired device and the retained device copy can sign with the recovery share. |

Repair restores the original share's authority. Refresh requires delivery of updated recovery material. The mixed-generation case demonstrates why changing the device and service while leaving the user's only recovery backup offline can break unilateral exit. Retained old quorums can still sign after refresh. Any compromise response that relies on destroying old material needs separate erasure evidence.

The interrupted run publishes the group only after all participants complete in the local process. Durable state, crashes after one real device commits, backup encryption, authenticated transport, replacement enrollment, erasure and the G3 service outage drill remain open. The owner and specialist reviewers retain the custody and admission decisions.

Run the existing Rust commands from the [experiment instructions](README.md#run-the-checks). The complete suite includes seven signing cases and four lifecycle cases. Filter by `lifecycle` to run just these four.
