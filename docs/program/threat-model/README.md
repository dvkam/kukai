# Threat model for custody experiments

Use this specification to prepare PoC experiments for issue #12. It describes the A1 candidate exercised by the two native signing experiments. The owner has yet to select a custody design. The original obligations, paths, assumptions and waiver classifications remain authoritative. These cases have proposed outcomes and await execution unless a linked experiment supplies a narrower result. [Frozen obligations](../verification/README.md) · [Experiment cases](cases.md) · [PoC scope](../poc-scope.md)

## Participants and material

| Participant | Material and authority | Boundary to exercise |
| --- | --- | --- |
| User device | Device share, device credential, approval display, local signing sessions | Distinguish a locked stolen device, a usable authenticated device, and an attacker with an extracted share. Bind the displayed account to the DKG transcript. |
| Web client | Web release, browser storage, credentials for the web path and any share that path can use | Record which secret it can reach for each candidate. A page delivered by a hostile origin can alter the display and the approval. Separate the web release channel from the iOS release channel. |
| Recovery holder | Separate recovery share, encrypted backup, user-held unlocking factor | Track ciphertext access and the independent ability to unlock it. Identify all sync and account-recovery paths. Keep any additional dispute factor separate in the inventory. |
| Identity and credential providers | Social login, credential sync, account reset, device enrollment | Test account takeover through recovery as well as ordinary login. Two product names under one recoverable account can represent one authority. |
| Coordinator | Participant roster, public transcripts, routing and session IDs | Assume it can reorder, drop or duplicate messages. Test authenticated sender identity, private delivery and consistent broadcast separately. |
| Service signer | One share, policy checks, iOS confirmation records, reservation state, irreversible protocol releases | A malicious signer can bypass its own spending rules. Measure the ability to reach any other share separately. Test restart between reservation, release and accounting. |
| Recovery service and notification channels | Enrollment, generation, dispute state, delays, notification attempts | Include administrative resets, shared service credentials and restored server backups when testing factor independence. A delivery receipt and a recorded attempt are different observations. |
| Public infrastructure | RPC results, chain state, simulations, token metadata, finality | Record node, protocol, block reference, simulation context, and asset rules. A provider may supply stale or inconsistent data. Only a confirmed on-chain change moves an asset or authority. |

## Paths

1. **DKG.** Each participant has a distinct identity and agrees on one fresh execution ID for the group, authenticates peer messages, and checks the agreed roster and transcript. Before funding an address, derive it from the group key in that transcript and compare it across honest clients. Test a coordinator that substitutes a roster, group key or commitment. An in-process simulation assumes the routing that a deployed implementation must establish.
2. **Service-assisted signing.** Bind each authorization to the request, account, chain, exact payload, simulation reference, rendering version, device generation and signing session. A fresh approval reaches the signer through the applicable channel. Reserve cumulative spend before releasing signing material. Test the boundary at the first release that lets another party finish, including material already in flight. Establish that event separately for each pinned signing protocol.
3. **Recovery.** Authenticate the claimant and independent factors. Under A1 the service and recovery shares form a signing quorum, so the route that unlocks the recovery share also needs review. Record notification attempts, delay, one dispute and its additional factor. Update the generation on completion. Confirm the resulting user-held material still permits exit. Restore only long-lived material.
4. **Unilateral exit.** Start with the device and independent recovery share for A1. Remove project DNS, APIs, relays, signers, login and update services from the execution path. Use an independently available tool and public chain access. Inventory assets and authorities before and after the drill. Record export formats, transactions, receipts, exceptions and assets subsequently received at the old address. An unavailable public chain blocks settlement.

A1 has three signing pairs. Device plus service supports normal service-assisted signing. Device plus recovery supports exit. Service plus recovery can also sign if the recovery factor is accessible. Any pair can authorize any amount for the same account. For a B candidate, enumerate every minimal signing set and every recovery set before testing. In a three-of-five example at least three shares must remain under the user's sole control. Record physical, cloud and administrative common dependencies for each set. No concrete B roster has been chosen.

## Attacker combinations

| Actor controlled by the experiment | Expected boundary or residual |
| --- | --- |
| Coordinator alone | It can stop progress by withholding messages. Altered identities, sessions or transcript views must abort before an honest client accepts a key or releases a share. |
| Service signer and coordinator | Without user material they cannot reach quorum or complete recovery. Trace access to backups and provider recovery accounts, including shared administrator roles. |
| Social identity alone | Neither signing nor recovery completes. If the same account also unlocks a share under the proposed pairing, record that pairing as unsafe. |
| Web release alone | Treat its display as compromised. With an honest signer, require independent iOS confirmation bound to the same digest for high exposure and permission changes. |
| Web release and signer | If the web path and service possess a signing quorum, a service spending limit cannot bind it. Check the residual for the selected custody design. The proposed release process requires two people to sign the release with separate hardware keys and publishes its hash in an append-only log. |
| Device alone, then device plus recovery factor and accessible backup | Test revocation of service-assisted sessions first. If the attacker obtains a complete exit quorum, it can sign without service approval. L1 cannot stop that path. |
| Recovery share alone, then service plus unlocked recovery share | Under A1 the first set is below quorum. The second can sign. If service control alone provides access to both, the candidate fails recovery independence. |
| RPC or data provider alone | Return a stale simulation or altered asset metadata. Verify the binding to the approved context and the specified refusal behavior before signing. |

Exercise four web release failures independently: compromised hosting or CDN, stolen deployment credentials, a malicious dependency update, and a compromised release process. Record whether control of deployment also gives access to source or signer infrastructure. Compare the delivered build with the independently obtained signed release and its logged hash.

## Review status

The two native experiments provide evidence for quorum operations with simulated transport. Apply the cases below to future tests and record prospective expectations before running them. The initial native results predate this shared specification. [Ed25519 evidence](../../../experiments/ed25519-signing/README.md) · [secp256k1 evidence](../../../experiments/secp256k1-signing/README.md)

The service cutoff, exact approval encoding, factor pairings, dispute timing, supported migration inventory, B roster, and proof-tool feasibility remain open inputs. For each concrete model, split mixed obligations into formulas, record the assumptions and bounds, review the changes and freeze the list before constructing that model. Independent security and formal-methods review remain outstanding. [Verification review procedure](../verification/review-policy.md)
