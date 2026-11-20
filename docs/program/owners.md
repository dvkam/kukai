# Decision and risk owners

`dvkam` is the accountable owner of every entry, as confirmed on 20 November 2026. Specialist reviewers remain unfilled. Ownership does not establish expertise or independent review.

The [baseline question register](program-plan-v0.5.1.md#11-open-questions-register) defines each question. All questions remain open or deferred. A ticket's completion closes a question only when its decision evidence is accepted.

## Questions

| Question | Accountable owner | Closing phase | Decision ticket | Status |
| --- | --- | --- | --- | --- |
| Q-01 | dvkam | Phase 2 | [P2-06](https://github.com/dvkam/kukai/issues/17) | Open |
| Q-02 | dvkam | Phase 2 | [P2-02](https://github.com/dvkam/kukai/issues/13) | Open |
| Q-03 | dvkam | Phase 1 | [P1-01](https://github.com/dvkam/kukai/issues/8) | Open |
| Q-04 | dvkam | Phase 2 | [P2-07](https://github.com/dvkam/kukai/issues/18) | Open |
| Q-05 | dvkam | Phase 2 | [P2-06](https://github.com/dvkam/kukai/issues/17) | Open |
| Q-06 | dvkam | Phase 3 | [P3-01](https://github.com/dvkam/kukai/issues/24) | Open |
| Q-07 | dvkam | Phase 2 | [P2-02](https://github.com/dvkam/kukai/issues/13) | Open |
| Q-08 | dvkam | Phase 3 | [P3-07](https://github.com/dvkam/kukai/issues/30) | Open |
| Q-09 | dvkam | Phase 3 | [P3-07](https://github.com/dvkam/kukai/issues/30) | Open |
| Q-10 | dvkam | Phase 2 | [P2-09](https://github.com/dvkam/kukai/issues/20) | Open |
| Q-11 | dvkam | Phase 1 | [P1-01](https://github.com/dvkam/kukai/issues/8) | Open |
| Q-12 | dvkam | Phase 1 | [P1-02](https://github.com/dvkam/kukai/issues/9) | Open |
| Q-13 | dvkam | Phase 7b | [P0-01](https://github.com/dvkam/kukai/issues/1) (deferred-work tracking only) | Deferred |
| Q-14 | dvkam | After release 1 | [P0-01](https://github.com/dvkam/kukai/issues/1) (deferred-work tracking only) | Deferred |
| Q-15 | dvkam | Phase 2 | [P2-11](https://github.com/dvkam/kukai/issues/22) | Open |
| Q-16 | dvkam | Phase 0 | [P0-02](https://github.com/dvkam/kukai/issues/2) | Open |
| Q-17 | dvkam | Phase 1 | [P1-03](https://github.com/dvkam/kukai/issues/10) | Open |
| Q-18 | dvkam | Phase 2 | [P2-09](https://github.com/dvkam/kukai/issues/20) | Open |
| Q-19 | dvkam | Phase 2 | [P2-04](https://github.com/dvkam/kukai/issues/15) | Open |
| Q-20 | dvkam | Phase 2 | [P2-09](https://github.com/dvkam/kukai/issues/20) | Open |
| Q-21 | dvkam | Phase 2 | [P2-04](https://github.com/dvkam/kukai/issues/15) | Open |
| Q-22 | dvkam | Phase 1 | [P1-01](https://github.com/dvkam/kukai/issues/8) | Open |
| Q-23 | dvkam | Phase 1 | [P1-01](https://github.com/dvkam/kukai/issues/8) | Open |
| Q-24 | dvkam | Phase 0 | [P0-04](https://github.com/dvkam/kukai/issues/4) | Open |
| Q-25 | dvkam | Phase 2 | [P2-02](https://github.com/dvkam/kukai/issues/13) | Open |
| Q-26 | dvkam | Phase 2 | [P2-06](https://github.com/dvkam/kukai/issues/17) | Open |
| Q-27 | dvkam | Phase 3 | [P3-09](https://github.com/dvkam/kukai/issues/32) | Open |
| Q-28 | dvkam | Phase 0 survey, decided in Phase 2 | [P2-05](https://github.com/dvkam/kukai/issues/16) | Open |
| Q-29 | dvkam | Phase 2 | [P2-02](https://github.com/dvkam/kukai/issues/13) | Open |
| Q-30 | dvkam | Phase 2 | [P2-06](https://github.com/dvkam/kukai/issues/17) | Open |
| Q-31 | dvkam | Phase 2 | [P2-08](https://github.com/dvkam/kukai/issues/19) | Open |
| Q-32 | dvkam | Phase 2 spike, shown at G3 | [P2-06](https://github.com/dvkam/kukai/issues/17) | Open |
| Q-33 | dvkam | Phase 2 | [P2-07](https://github.com/dvkam/kukai/issues/18) | Open |

Q-13 and Q-14 have no implementation ticket in Phases 0 to 3. P0-01 records their owner and deferral only. Closing P0-01 does not close either question. Their owner creates a separate ticket when the deferred phase starts.

## Risks

The [baseline risk register](program-plan-v0.5.1.md#10-risk-register) retains each severity and mitigation. The closing phase below is the target for the first mitigation decision, not a claim that the risk disappears. At that review, the owner records evidence, residual exposure, and a follow-up phase and ticket for remaining work. A safety failure cannot be accepted as a waiver. Every risk is currently open.

| Risk | Description | Accountable owner | Mitigation decision phase | Tracking ticket | Status |
| --- | --- | --- | --- | --- | --- |
| R-01 | No production-ready refresh, resharing or repair for threshold ECDSA (cggmp24 alpha, refresh crate marked not for production), so a stolen secp256k1 or P-256 share cannot be replaced | dvkam | Phase 2 | [P2-04](https://github.com/dvkam/kukai/issues/15) | Open |
| R-02 | Threshold implementation bug | dvkam | Phase 3 | [P3-09](https://github.com/dvkam/kukai/issues/32) | Open |
| R-03 | Our coordinator or signer is compromised (the Web3Auth lesson) | dvkam | Phase 2 | [P2-10](https://github.com/dvkam/kukai/issues/21) | Open |
| R-04 | Account takeover through recovery | dvkam | Phase 2 | [P2-07](https://github.com/dvkam/kukai/issues/18) | Open |
| R-05 | Formal models diverge from code | dvkam | Phase 3 | [P3-05](https://github.com/dvkam/kukai/issues/28) | Open |
| R-06 | Weak device-share protection on the web | dvkam | Phase 2 | [P2-02](https://github.com/dvkam/kukai/issues/13) | Open |
| R-07 | Transaction parsing or simulation errors | dvkam | Phase 2 | [P2-08](https://github.com/dvkam/kukai/issues/19) | Open |
| R-08 | Scope: a new wallet and signing infrastructure, 4 chains, up to 4 Tezos key types, NFTs, 2 platforms | dvkam | Phase 0 | [P0-04](https://github.com/dvkam/kukai/issues/4) | Open |
| R-09 | Overcomplicated UX | dvkam | Phase 1 | [P1-02](https://github.com/dvkam/kukai/issues/9) | Open |
| R-10 | Identity provider changes or bans | dvkam | Phase 2 | [P2-02](https://github.com/dvkam/kukai/issues/13) | Open |
| R-11 | Regulatory classification as a custodian | dvkam | Phase 2 | [P2-11](https://github.com/dvkam/kukai/issues/22) | Open |
| R-12 | Thin Rust support for Tezos | dvkam | Phase 3 | [P3-07](https://github.com/dvkam/kukai/issues/30) | Open |
| R-13 | Dependency compromise | dvkam | Phase 0 | [P0-03](https://github.com/dvkam/kukai/issues/3) | Open |
| R-14 | Agents gain authority | dvkam | Phase 2 | [P2-10](https://github.com/dvkam/kukai/issues/21) | Open |
| R-15 | DKG and signing too slow for the onboarding and login targets on phones and in WASM | dvkam | Phase 3 | [P3-08](https://github.com/dvkam/kukai/issues/31) | Open |
| R-16 | Post-quantum migration: tz5 and no reviewed threshold ML-DSA | dvkam | Phase 3 | [P3-09](https://github.com/dvkam/kukai/issues/32) | Open |
| R-17 | Ed25519 keys cannot be exported, which weakens the portability promise | dvkam | Phase 3 | [P3-06](https://github.com/dvkam/kukai/issues/29) | Open |
| R-18 | Signer service unavailable, so nobody can sign through us (liveness), or the service share is lost | dvkam | Phase 3 | [P3-06](https://github.com/dvkam/kukai/issues/29) | Open |
| R-19 | App Store rules for crypto wallets and in-app dApp browsers | dvkam | Phase 0 | [P0-05](https://github.com/dvkam/kukai/issues/5) | Open |
| R-20 | Operating cost of signers, proxies and nodes | dvkam | Phase 0 | [P0-04](https://github.com/dvkam/kukai/issues/4) | Open |
| R-21 | Presignature misuse | dvkam | Phase 2 | [P2-04](https://github.com/dvkam/kukai/issues/15) | Open |
| R-22 | A malicious web release reads unlocked shares or misrepresents approvals. Combined with a compromised signer service, it defeats the limit and the iOS confirmation. | dvkam | Phase 2 | [P2-06](https://github.com/dvkam/kukai/issues/17) | Open |
| R-23 | One cloud account controls both the social identity and the factor that unlocks a share | dvkam | Phase 2 | [P2-02](https://github.com/dvkam/kukai/issues/13) | Open |
| R-24 | A data source steers what the user approves: recipient, token identity, decimals or simulation | dvkam | Phase 2 | [P2-08](https://github.com/dvkam/kukai/issues/19) | Open |
| R-25 | The media proxy is used for server-side request forgery, or malicious media exploits a decoder | dvkam | Phase 2 | [P2-09](https://github.com/dvkam/kukai/issues/20) | Open |
| R-26 | The exit tool stops working after we are gone (dependencies, RPC changes, protocol upgrades) | dvkam | Phase 3 | [P3-06](https://github.com/dvkam/kukai/issues/29) | Open |
| R-27 | Assets or authorities that cannot move stay under an old, possibly compromised key | dvkam | Phase 3 | [P3-06](https://github.com/dvkam/kukai/issues/29) | Open |

R-02 requires later independent audit results as well as G3 admission planning. R-05 and R-07 need continuing implementation conformance checks. R-13 requires supply-chain controls at repository initialization and each release. R-16 remains on a research watch after the owned-tz5 deferral. R-19 needs an actual platform submission after the Phase 0 guideline review. R-25 needs the G5 penetration test. R-26 needs an exit drill on every release. R-27 retains any immovable-asset exposure. The linked tickets must hand off these obligations rather than marking the underlying risks eliminated.
