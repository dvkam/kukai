# Social-first multichain wallet: program plan v0.5.1

Status: planning, baseline for decision and feasibility tickets. Date: 20 November 2026. Version 0.5.1 is a narrow patch from review round 3: proof obligations now state their signing paths and trust assumptions, and the claim that an iOS share could be required only above a limit is corrected. Version 0.5 applies the second round of the external review (appendix R, round 2) and narrows DEC-025 to unilateral exit. Version 0.4 applied the first round and three new decisions (DEC-025 to DEC-027). Appendix R lists each review point, the verdict and where it is addressed. v0.3 applied a two-reviewer interrogate pass on v0.2, which built the plan on the expert handover v0.1 (`C:\Users\David\Desktop\kukai.txt`). This plan supersedes the Kukai migration plan v2 (17 November 2026), whose web foundation lives on in appendix W. Appendix C lists every change from the handover. No code has been written.

Every statement carries one of four labels, so nothing unresolved can pass for a decision:

| Label | Meaning |
| --- | --- |
| Fact | Checked against a source on the date given. "Fact (secondary)" means a vendor test or community report, which is re-measured before anything depends on it. |
| Decision | Agreed with the project owner. Changing it needs a new decision entry. |
| Proposal | Recommended but not agreed. It needs an ADR and an explicit decision. |
| Open | Unresolved, with a register entry in section 11 that names the phase it closes in. Nothing may be built on it until it becomes a Decision. |

## 1. Summary

We are building a new open-source, social-first wallet for Tezos, EVM networks and Solana. The repository starts as a fork of `kukai-wallet/kukai`. Kukai's code is a reference and a source of selective reuse, and its architecture, accounts and UI are not kept. Users sign in with a familiar identity. Keys come from distributed key generation and threshold signing that we operate on open-source protocols, with no proprietary wallet infrastructure. Security-critical behavior is specified and verified before it is implemented. The UI and UX are redesigned from research.

Release 1 ships on iOS and the web, with Solana, Ethereum, Base and Tezos (tz1 owned, tz2 to tz4 owned if each passes its admission gate, all five types recognized as addresses), including a full NFT gallery. Android follows in release 2.

Scope (Fact): this is a new wallet and a new signing infrastructure with selective reuse of Kukai code. It is a much larger undertaking than modernizing Kukai. Plan v2 and its dependency ledger are history. They are not a backlog, and implementation tickets come only from this plan, after the decisions they depend on are settled (Phases 0 to 3).

## 2. Decision log

From the expert handover (all Decision):

| ID | Decision |
| --- | --- |
| DEC-001 | Build a new social-first multichain wallet |
| DEC-002 | Support Tezos, EVM networks and Solana |
| DEC-003 | No proprietary wallet infrastructure: no Web3Auth, Privy or similar for authentication, keys, signing or recovery. They are architectural references only, and no non-public material is copied. Data providers (RPC, indexers, prices, metadata) are not wallet infrastructure; section 6 sets the rules for them. |
| DEC-004 | Social identity providers such as Google and Apple are acceptable external dependencies |
| DEC-005 | Our own authentication orchestration |
| DEC-006 | Open-source threshold cryptography (MPC) |
| DEC-007 | Formally specify security-critical behavior before production implementation |
| DEC-008 | No ambiguity in architecture, requirements and verification, enforced by the labels above |
| DEC-009 | Latest compatible stable toolchains, pinned, upgraded deliberately |
| DEC-010 | Native iOS and Android apps plus a web app. DEC-016 sets the timing (Android in release 2) and does not reduce the scope. |
| DEC-011 | UI and UX redesign is a core workstream |
| DEC-012 | Investigate agent capabilities without unrestricted signing authority |

Added on 18 November 2026 (all Decision):

| ID | Decision |
| --- | --- |
| DEC-013 | This program replaces the Kukai migration plan v2. The repository is a fork of `kukai-wallet/kukai`, built over with the new architecture. Kukai compatibility (accounts, keystores, derivation paths, UI, embedded protocol) is not required. |
| DEC-014 | The web foundation of plan v2 carries over to `apps/web` (appendix W). Everything Kukai-specific in v2 is dropped (appendix X). |
| DEC-015 | The services' language is decided by a Phase 3 bake-off under the DEC-023 rule. The same authorization and recovery state machine is built in OCaml (Gospel, Cameleer, Why3) and in Rust (Creusot or Verus). Rust is fixed for cryptography, the signer and the client core either way. |
| DEC-016 | Release 1 platforms: iOS (SwiftUI) and web (React). Android (Kotlin, Jetpack Compose) is release 2. |
| DEC-017 | Release 1 chains: Tezos, Solana, Ethereum mainnet and Base. Arbitrum and Polygon come later. |
| DEC-018 | Verification tools in two roles (section 8): gate tools that must pass, and cross-check tools whose disagreements block. |
| DEC-019 | Tezos, amended by v0.4. All five address types (tz1 Ed25519, tz2 secp256k1, tz3 P-256, tz4 BLS12-381, tz5 ML-DSA-44) are recognized everywhere: parsed, validated, displayed, stored as contacts, shown in history and in dApp requests. Recognizing an address does not mean an operation involving it is offered. Each operation is offered only where the protocol of the connected network allows it, read from the node's protocol constants (section 3: with `tz5_account_enable` off, a transfer to a tz5 address is invalid). Owned accounts: tz1 in release 1, and tz2, tz3 and tz4 in release 1 only if each passes the DEC-027 admission gate. The default type for new users is chosen in Phase 3 (Q-27). Owned tz5 accounts come after Tezos enables tz5 on mainnet and a reviewed threshold ML-DSA scheme exists (R-16). |
| DEC-020 | NFTs: a full gallery in release 1 on all four chains. View, send, images, video, 3D, collections and floor prices. All media goes through a media proxy we run under the rules in section 6, and spam filtering applies. |
| DEC-021 | Repository: fork privately, do the day-0 cleanup (section 7), then make it public and develop in the open from Phase 0 on |
| DEC-022 | License for our own code: Apache-2.0 OR MIT (dual) |
| DEC-023 | Bake-off rule. (1) Pass or fail: a version that cannot prove every specified safety property of the state machine is out. (2) Weighted scores from 0 to 5: proof effort 30%, library support 25% (measured in a separate spike on OIDC, WebAuthn, PostgreSQL and Tezos encoding), defects found 15%, tooling friction 15%, cross-language sync cost 15% (Rust-only scores 5). (3) If the totals are within 5% of each other, Rust wins, because one language is simpler. Scores and raw notes are committed. |
| DEC-024 | Release 1 includes the agent work of Phase 7a only: read-only explanations. Preparation and delegation (Phase 7b) come after release 1. |

Added on 20 November 2026 after the external review (all Decision):

| ID | Decision |
| --- | --- |
| DEC-025 | Unilateral exit, amended by v0.5. The user alone holds a complete signing quorum, and exit needs no authorization or share release from us or from any third party. Public RPC access and the availability of the blockchains themselves remain operational dependencies. While all of our infrastructure is permanently unavailable (shut down, refusing to cooperate, or having lost the service share), the user can: (1) sign independently; (2) export every exportable key; (3) move every transferable asset; and (4) revoke or move every supported authority (EVM and FA2 operator grants, token approvals, Tezos delegation). Exceptions are documented per asset type: frozen or non-transferable tokens, soulbound NFTs, timelocked positions, and contract roles that cannot be reassigned. Moving assets does not retire the old key, which still controls anything left behind or sent to it later. v0.3's plain 2-of-2 A2 and v0.4's escrow candidate A2e are out. An open-source exit tool shows this at G3 with every host we run blocked. Redundant signers cover outages only and do not count towards this. |
| DEC-026 | Web trust model. The web app's promise explicitly assumes we deliver the client honestly (section 6, web delivery). The release process is hardened against that assumption failing. Web signatures above a limit also need confirmation on an independent enrolled device, the iOS app, which decodes and shows the payload itself. The signer service enforces this as policy. Whether it is also enforced structurally depends on the Q-01 design (section 6, the web limit). Web-only wallets get the Q-26 limits. The limit and the request types it covers are Q-30. |
| DEC-027 | Per-curve admission. A key type is owned in release 1 only after it passes its admission gate (section 9): a pinned implementation, reviewed protocol assumptions, feasibility on iPhone and in WASM, recovery, compromise-response and exit tests, and an independent review that is funded and booked. A signature that a chain's verifier accepts shows compatibility only, not security. The release 1 floor is Ed25519 (Solana, tz1) and secp256k1 (Ethereum, Base). If the floor fails, release 1 waits. tz2, tz3 and tz4 are admitted one by one, and any that fail move to a later release, with address support kept (DEC-019). |

Carried from plan v2 for `apps/web` (Decision, appendix W): TypeScript 7, React 19 with the native React Compiler, Vite 8, pnpm 12 with `autoDedupe`, Node 26 LTS, Oxlint (type-aware) and Oxfmt, Vitest, Playwright and MSW, a strict tsconfig, no `any` and no `useEffect` except through an accepted ADR, the state placement order, TanStack Router, Query, Form and Virtual, Zod mini, CSS Modules, a Baseline 2025 browser floor, performance budgets, StrictMode and the Profiler, no telemetry by default.

## 3. Facts and corrections

Checked on 18 November 2026 unless stated otherwise.

| Topic | Label | Finding | Source |
| --- | --- | --- | --- |
| Web3Auth incident | Fact | Around 6 to 14 November 2026, unauthorized parties accessed some Google and Apple login embedded wallets, including Torus Wallet and Keplr users. Third-party figures put losses near $6M, which Web3Auth disputes. New registrations on legacy networks are paused until 23 November, and SDK v9 and earlier are deprecated. | [MetaMask Builder Hub](https://builder.metamask.io/t/a-security-incident-with-web3auth-embedded-wallets/3663), [Crypto Briefing](https://cryptobriefing.com/web3auth-pauses-embedded-wallet-keplr/) |
| Toolchains | Fact | Rust 1.100.0 (12 November 2026), OCaml 5.5.2 (23 October 2026), Dune 3.25.0 (12 November 2026), Swift 6.4.2 (30 October 2026), Apalache 0.63.0 (10 November 2026), Tamarin 1.12.0 (March 2026), TLA+ tools 1.7.4 (latest tagged release, 2024) | GitHub releases |
| CGGMP24 status | Fact, correcting v0.2 and the handover | The handover called CGGMP21 "audited". The Kudelski audit is from September 2023. RUSTSEC-2025-0127 (CVE-2025-66017) came later. It names two weaknesses in versions up to 0.6.3: presignatures combined with HD derivation cut security to about 85 bits, and presignatures used to sign a raw hash allow forgery. The fix is in the successor crate `cggmp24`, still at 0.7.0-alpha.3 (December 2025). Its README says it does not support key refresh for threshold or non-threshold keys. Refresh lives in a separate `cggmp24-key-refresh` crate marked "Work In Progress… Do not use it in production". A threshold refresh specification was merged on 17 November 2026. | [Audit](https://rust-digger.code-maven.com/src/cggmp21-0.5.0/docs/audit_report.pdf), [RUSTSEC-2025-0127](https://osv.dev/vulnerability/RUSTSEC-2025-0127), repository README and `cggmp24-key-refresh/README.md` |
| FROST | Fact | `frost-ed25519` 3.0.0 (April 2026, Zcash Foundation) implements RFC 9591, whose Ed25519 ciphersuite is designed to produce RFC 8032 signatures. `frost-core` has a refresh module (which can also remove participants) and a repair module that rebuilds a lost share. | crates.io, [RFC 9591](https://www.rfc-editor.org/rfc/rfc9591.html), `frost-core/src/keys/` |
| Refresh, reshare and repair are different | Fact | Refresh renews the shares of the same parties. Resharing moves the key to a new set of parties, for example a new device. Repair rebuilds one lost share with help from the others. Device replacement needs resharing or repair, not refresh. | Protocol definitions in the sources above |
| Ed25519 export | Fact | A threshold Ed25519 key is a secret scalar. Standard Solana keypairs and Tezos `edsk` keys are RFC 8032 seeds, which are hashed into the scalar, and that hash cannot be reversed. A threshold Ed25519 key can therefore never be exported to a standard wallet. Users can only move funds to a new address. secp256k1, P-256 and BLS12-381 keys are scalars in their standard formats, so they can be exported, but only by whoever holds enough shares to reconstruct the key. A curve that has an export format does not make export available to the user alone. | RFC 8032 section 5.1.5 |
| Threshold export | Fact | Reconstructing a threshold key, or producing a signature, needs a qualifying set of shares. Under 2-of-2 the device share and its backup are the same share, so without the service the user can neither sign nor export (DEC-025). | Access structure definition |
| Ed25519 HD derivation | Fact | SLIP-10 defines only hardened derivation for Ed25519, so threshold-friendly non-hardened derivation would be non-standard | SLIP-0010 |
| Tezos tz5 | Fact | tz5 is a post-quantum account type (ML-DSA-44) from the Ushuaia protocol. It is behind a `tz5_account_enable` flag that is off on mainnet. Taquito 25.1.0 supports tz5 addresses. On test networks with the flag on, tz5 accounts cannot be delegates or consensus keys. | [Nomadic Labs](https://research-development.nomadic-labs.com/ushuaia-announcement.html), [Octez U025](https://octez.tezos.com/docs/protocols/025_u025.html) |
| tz5 and tz4 operation validity | Fact, checked 20 November 2026, correcting v0.3 | In `src/proto_025_PsUshuai/lib_protocol/validate.ml`, `check_tz5_account_enabled` runs on the source of every manager operation and on the destination of every Transaction and Transfer_ticket. With the flag off, sending to a tz5 address is invalid, not only owning one. The same file checks a BLS proof of possession when a tz4 key is revealed, and accepts tz4 delegates only when `allow_tz4_delegate_enable` is set. A threshold BLS scheme must therefore also produce the proof of possession (Q-28). | Octez `master` on GitLab |
| Rust support for Tezos | Fact | `tezos_crypto_rs` and `tezos_data_encoding` were last published in July 2024. Octez, the reference node, is OCaml. | crates.io |
| Rust support for EVM and Solana | Fact | `alloy` 2.6.1 (16 November 2026), `solana-transaction` 6.0.0 (October 2026) | crates.io |
| Secure Enclave | Fact (secondary for iOS 26) | For classical curves the Secure Enclave holds only P-256 keys, so an MPC share is encrypted under an enclave P-256 key, not stored in the enclave. iOS 26 adds enclave-backed ML-KEM and ML-DSA keys, per third-party guides, to be confirmed against Apple's documentation. | [Guide](https://dev.to/jcaso/post-quantum-signing-keys-that-never-leave-the-secure-enclave-1g88) |
| Passkey PRF | Fact (secondary) | Vendor tests report PRF in Safari 18+ with iCloud Keychain, Chrome 132+ and Firefox 139+. Third-party password managers are inconsistent: one report says 1Password's result is non-compliant, and one table lists Bitwarden and Dashlane as unsupported in Chrome. Coverage across credential managers is re-measured in Phase 2 (Q-07). | [Corbado](https://www.corbado.com/blog/passkeys-prf-webauthn) |
| Kukai licenses | Fact | kukai-mobile-ios is Apache-2.0. kukai-core-swift and kukai-crypto-swift are MIT. Kukai's CustomAuth fork and test-dapp have no license, so they are reference only. The web repo's `License.md` (Apache 2.0) conflicts with its `package.json` (MIT). We comply with Apache 2.0 and also keep the MIT notice, because MIT requires its own notice to be retained, and Apache compliance does not replace that. It does not establish provenance: whether every file in Kukai was Kukai's to license (section 7 adds a provenance check). It also gives us no right to relicense inherited code under our dual license, which applies to our own contributions only. | GitHub API |
| Kukai web version | Fact, correcting the handover | The handover says Angular 15. The code at commit f0fa722 is Angular 17.3. | `package.json` |
| dApp providers | Fact | EIP-1193, EIP-6963 and the Solana Wallet Standard need a provider injected into the dApp's page, which only a browser extension or an in-app browser can do | The standards |

## 4. Product

Vision (Decision): make digital assets as easy to use as a good consumer finance app, without giving up self-custody, transparency or user control.

Differentiation hypotheses (Proposal, validated by research):

1. Invisible multichain. Users work with assets and intentions, not networks, gas tokens and bridges. Release 1 limit (Fact): with no swaps, bridging or on-ramps, a new user still needs the chain's native token for the first fee unless Q-18 adds fee sponsorship.
2. Comprehensible, verifiable security. Every signing request says what leaves, what is granted, what can go wrong and what is unknown, using transaction simulation (section 5) and deterministic authorization.
3. Bounded intelligent assistance. Agents explain, and later prepare. They never hold authority over funds.
4. Portability (Decision, DEC-025). Users can leave without authorization or share release from us or anyone else, including after we are gone. The exit tool combines the device share with the user's recovery share, both under the user's control, and works against public RPC nodes. For secp256k1, P-256 and BLS12-381 keys it can reconstruct and export the key. For Ed25519 keys (Solana, Tezos tz1) it moves transferable assets to a new address, because those keys cannot be exported (section 3). The exceptions in DEC-025 are shown to the user before they leave. The formats and the per-library reconstruction path are Q-05 and Q-32.

Target audience for release 1 (Open, Q-11): mainstream newcomers, existing multichain wallet users, advanced users or agent builders. Phase 1 picks one primary audience on research evidence.

UX research workstream (Decision, from the handover, starts in Phase 0):

- Competitive teardown of Phantom, Coinbase Wallet, MetaMask, Rainbow, Rabby, Trust Wallet, Exodus, Zerion and Kukai on iOS, Android and web.
- Non-crypto references: Apple Wallet and Apple Pay, Revolut, Wise, Cash App, and selected banking apps.
- Each product is studied across the handover's 16 research dimensions.
- Questions to test: whether a wallet needs an asset-list home, whether users should pick networks, whether receiving should require understanding addresses, how signing is presented, assets versus accounts versus intentions as the organizing model, and whether AI should be a primary way to navigate.
- Three competing concepts (asset-first, intent-first, contextual) are prototyped and tested against each other, not merged early.

Quality targets (Proposal). The Phase 1 gate must fix the exact devices, network profiles, task scripts, participant counts and pass thresholds for each, and G4 then applies those numbers.

| Metric | Target |
| --- | --- |
| New wallet onboarding | p90 under 60 s, excluding provider delays. The Phase 2 latency spike checks that DKG fits this budget (R-15). |
| Returning authentication | p90 under 3 s on the reference devices |
| Primary interactions, as listed in the Phase 1 UX specification | 60 fps, 120 fps on ProMotion iPhones |
| Transaction comprehension | Pass rate per task fixed at the Phase 1 gate |
| Accessibility | WCAG 2.2 AA on web, VoiceOver and Dynamic Type on iOS |
| Recovery | Completed unaided by the share of participants fixed at the Phase 1 gate |
| Web performance | Appendix W budgets |

## 5. Release 1 scope

| Area | Release 1 | Label | Closes in |
| --- | --- | --- | --- |
| Platforms | iOS (SwiftUI) and web (React) | Decision (DEC-016) | |
| Chains | Tezos, Solana, Ethereum mainnet, Base | Decision (DEC-017) | |
| Tezos addresses | All five types recognized. Operations to or from a type are offered only where the network's protocol constants allow them. | Decision (DEC-019) | |
| Owned key types | Floor: Ed25519 (Solana, tz1) and secp256k1 (Ethereum, Base). tz2, tz3 and tz4 if each passes its admission gate. The default Tezos type is Q-27. | Decision (DEC-019, DEC-027) | Admission at G3, Q-27 in Phase 3 |
| Exit without us | Open-source exit tool that works with all of our infrastructure unavailable | Decision (DEC-025) | Shown at G3 |
| Keys | One threshold secp256k1 key shared by Ethereum and Base. Separate keys for Solana (Ed25519) and for each Tezos type. No key is used across chain families. | Proposal | Q-06 in Phase 3 |
| Identity providers | Candidates: Google, Apple, email and passkeys | Open | Q-03 in Phase 1 |
| Custody model | Section 6 | Open | Q-01 in Phase 2 |
| Operations | Receive, send native assets and tokens (FA1.2, FA2, ERC-20, SPL), balances, history, fee estimation | Proposal | Phase 2 gate |
| NFTs | Full gallery on all four chains (FA2, ERC-721 and ERC-1155, Metaplex): view, send, images, video, 3D, collections, floor prices, through our media proxy | Decision (DEC-020) | |
| Token lists and spam filtering | Curated token lists and spam filtering per chain, for fungible tokens and NFTs | Proposal | Phase 2 gate |
| Prices and metadata | At least two providers per chain behind our proxy, with one able to replace the other | Proposal | Phase 2 gate |
| Signing policy | One policy per request type (section 6, signing policy): what is decoded, simulated, bound into the approval, warned about or refused | Proposal | Q-31 in Phase 2 |
| Transaction simulation | Before every transaction signature: Tezos through the node's simulation RPC, EVM through `eth_simulateV1` or a trace call on our nodes, Solana through `simulateTransaction`. Message signatures are not simulated and follow the signing policy instead. When a result is unknown the UI says so, and the policy decides whether the request is refused. | Proposal | Phase 2 gate |
| Wrong-network safeguards | Address entry checks the address format against the selected chain family. Ethereum and Base addresses cannot be told apart by format, so EVM sends always show the target network by name and chain ID, and warn when a recipient is known only on another network (contacts, exchange deposit lists). | Proposal | Phase 1 gate |
| First fee for a zero-balance user | Not decided | Open | Q-18 in Phase 2 |
| Notifications | Not decided | Open | Q-23 in Phase 1 |
| dApps | WalletConnect (EVM, Solana, Tezos) and Beacon (Tezos) on iOS and web, plus an in-app dApp browser on iOS that injects EIP-1193 and EIP-6963 and the Solana Wallet Standard | Proposal | Phase 2 gate |
| Agents | Phase 7a: read-only explanations of activity and transactions | Decision (DEC-024) | |
| Later | Android, Arbitrum, Polygon | Decision (DEC-016, DEC-017) | |
| Later | Agent preparation and delegation (Phase 7b) | Decision (DEC-024) | |
| Later | Owned tz5 accounts | Decision (DEC-019) | |
| Later | Browser extension, swaps and bridging, on-ramps, hardware wallets | Proposal | Phase 0 gate |

## 6. Architecture

Principle (Decision): a social account proves identity. On its own it never gives anyone, us included, the ability to sign or to recover.

Separate state machines (Proposal), each with its own model: social authentication, wallet ownership, device enrollment, signing authorization, threshold participation, recovery authorization, account linking and unlinking, session revocation.

### Custody candidates

Each candidate is stated as its access structure: the sets of shares that can sign, and the sets that can recover. A rule the service enforces, such as a time delay, is not part of the access structure, because a compromised service skips it (R-03).

| Candidate | Can sign | Can recover | Consequence |
| --- | --- | --- | --- |
| A1. 2-of-3 with device, service and a user-held recovery share | {device, service}, {device, recovery}, {service, recovery} | Same sets | Fact: in a 2-of-3 scheme any pair that can reshare can also sign. The recovery share is encrypted under a factor only the user holds, so {service, recovery} needs that factor (obligations 9 and 14). Meets DEC-025 through {device, recovery}. Losing the device while we are gone loses the funds. The recovery factor must not be usable from the device alone, so a passkey synced to the same phone does not qualify (Q-02). |
| B. Advanced policy | Several devices or guardians in a larger threshold | Guardian quorum | Meets DEC-025 only if the user-held shares alone form a complete signing quorum. In a 3-of-5 scheme that means three user-held shares, not two. Guardians the user does not control do not count. Larger models, more complex to operate. |
| Excluded: v0.3's A2, 2-of-2 without escrow | {device, service} only | Device-share backup | Excluded by DEC-025: the device share and its backup are the same share, so without the service the user can neither sign nor export |
| Excluded: v0.4's A2e, 2-of-2 plus an escrowed service share | {device, service}, and {device, escrowed share} after release | Device-share backup | Excluded by DEC-025 as amended: exit depends on a third party releasing the share, so it is not unilateral |
| Comparison: passkey smart accounts | On-chain verification of passkey signatures | On-chain guardians | Not available on Tezos or for EVM externally owned accounts without EIP-7702. Kept only as a fallback comparison if MPC fails an admission gate on one chain family. |

### Compromise response

Restoring a share onto a new phone leaves a stolen copy of that share usable. A signature that has already been assembled is valid on-chain whatever our database says. The plan therefore separates three responses (Proposal):

| Level | What it does | What it protects against | Release 1 availability |
| --- | --- | --- | --- |
| L1. Device authentication revocation | The service rejects the old device's credentials and sessions | A stolen device, while the service is honest | Every curve |
| L2. Share replacement | Refresh or reshare, so the stolen share no longer combines with the current shares | A stolen device together with a later service compromise, if every party erased its old shares (obligation 12) | Ed25519 through frost-core. Not available for secp256k1 or P-256 (cggmp24, section 3). Open for BLS12-381 (Q-28). |
| L3. On-chain migration | New key by a fresh DKG, transferable assets moved to the new address, and supported authorities revoked or moved | Earlier share theft, for the assets and authorities that were moved | Every curve. The address changes, because Tezos, Solana and EVM accounts cannot rotate their spending key. |

L3 does not neutralize share theft in general. The old key stays live, so an attacker holding a qualifying set of old shares still controls whatever was left behind (the DEC-025 exceptions) and anything sent to the old address later. The wallet keeps watching old addresses and lists the residual exposure to the user. Within our wallet and supported integrations (contacts, address entry, connected dApps), it warns anyone sending to an old address. Senders using unrelated wallets cannot be warned.

In-flight cutoff (Proposal): a candidate cutoff is the point where the service irreversibly releases its signing material for a session, for example its final protocol message. It is established separately for each signing protocol (CGGMP, FROST, the BLS scheme), because the rounds differ. The race between a revocation and that release is modelled in TLA+ (obligation 5). The cutoff exists only on the service-assisted path. Under A1, the device-plus-recovery path involves no service message, so no revocation can stop it. The only protection there is that the recovery factor stays with the user (obligations 9 and 14).

After the cutoff, the device can assemble a valid signature, and the wallet can only race it on-chain:

- EVM: replace it with a transaction that uses the same nonce.
- Tezos: consume the counter, or let the branch expire.
- Solana, ordinary transactions: wait for the blockhash to expire.
- Solana, durable-nonce transactions: these never expire, so they are invalidated only by advancing the nonce account, which needs its nonce authority. In release 1 the wallet signs a durable-nonce transaction only if its nonce authority is the user's own account, shows it as "does not expire", and refuses all others (Q-31).

Backups (Proposal): a backup holds only the long-term share and its generation number, never nonces, presignatures or session state. Restoring raises the device generation, and the service refuses every session from an earlier generation (obligation 17).

Library capabilities per curve (Fact, section 3), which limit the candidates:

| Curve, used by | Library | Refresh | Reshare to a new party | Repair a lost share |
| --- | --- | --- | --- | --- |
| secp256k1 (EVM, tz2) and P-256 (tz3) | cggmp24 0.7.0-alpha.3 | Separate crate, marked not for production | Not provided | Not provided |
| Ed25519 (Solana, tz1) | frost-ed25519 3.0.0 | Yes (frost-core) | Partly: refresh can remove participants | Yes (frost-core) |
| BLS12-381 (tz4) | Open (Q-28) | Open | Open | Open |
| ML-DSA-44 (tz5) | None reviewed | | | |

Presignatures (Open, Q-19): CGGMP allows precomputed presignatures for one-round signing. They are in-flight secret state, and the advisory shows misuse with HD derivation and raw-hash signing. Release 1 uses presignatures only if Q-19 shows they are needed for the latency targets. If used, each one is bound to a message, a derivation path and a device generation, and revocation destroys it.

### Where the device share lives

| Platform | Storage | Label |
| --- | --- | --- |
| iOS | Encrypted under a Secure Enclave P-256 key and kept in the Keychain with this-device-only availability and a biometric access control. Whether that control is tied to the current biometric set (re-enrollment destroys the share) or to any enrolled biometric is Q-25. The decrypted share is in app memory while a signature runs, and the threat model includes that exposure. | Proposal |
| Web | Wrapped with a key from the passkey PRF extension. A fallback exists for credential managers without working PRF (Q-07). Web-only wallets may get lower limits (Q-26). PRF protects the stored share only. While the share is unlocked, it is exposed to any code we deliver (web delivery, below). | Proposal |
| Android (release 2) | Wrapped with a StrongBox or hardware-backed Keystore key | Proposal |

### Web delivery (DEC-026)

Fact: JavaScript served from the wallet's own origin can read an unlocked share and can show the user something other than what gets signed. Rust in WASM, a worker and CSP do not change that, because the attacker would control the code we deliver. The web promise therefore rests on a stated assumption: the client we serve is the client we released.

The threat model covers each way that assumption can fail: hosting or CDN compromise, stolen deployment credentials, a malicious dependency update (R-13), and a compromised release process. Mitigations (Proposal):

- Releases are reproducible builds, signed by two people with separate hardware keys. Release hashes go into a public append-only log.
- Deploy credentials are separate from source access and from the service share's infrastructure.
- Subresource Integrity on every script and WASM file, and an immutable versioned path per release.
- Signed releases and the public log support detection. They prevent an attack only if something the attacker does not control checks them before the code runs. An attacker who controls the top-level HTML can also rewrite its SRI attributes. Release 1 has no such independent verifier, so the log is a detection control. An independent check, for example by the iOS app or a browser extension, is a later item.

The web limit (Proposal, values in Q-30):

- Enforced by the signer service, never by the web client.
- Cumulative per account over a rolling window, across every session, device and request, so splitting a transfer into amounts under the limit does not help.
- Concurrent requests reserve against the budget before signing starts, and the service serializes the reservations.
- Permissions count at their full potential value: token approvals, operator grants, delegations and EIP-7702 authorizations always need iOS confirmation, whatever they move immediately.
- Above the limit, DEC-026 requires confirmation on an enrolled iOS device, which decodes the payload in its own Rust core and binds its approval to the same digest (obligation 15).

This enforcement assumes an honest signer service (Fact, by construction). A malicious web release on its own is bounded by the limit. A malicious web release together with a compromised signer service defeats both the limit and the iOS confirmation, because the web device share and the service share form a signing quorum. That combination is a stated residual risk (R-22).

Fact: threshold signing does not enforce quorums that depend on the amount. For one key, any set of shares that can sign at all can sign any amount, so if the web share plus the service share can sign without iOS, that pair can sign everything once both are compromised. Adding shares does not change this. Q-01 therefore compares designs that are enforceable:

- iOS on every service-assisted path. The web share plus the service share is not a quorum, so every web signature needs the iOS device. Web-only wallets then cannot exist.
- Separate accounts with deliberately limited exposure. A web spending account, whose quorum is web plus service, holds only what the user moves into it. A vault account's quorum always needs iOS. The limit is then the spending account's balance, which no compromise can exceed.
- On-chain policy. A smart account or contract enforces the limit on-chain. That is not available for EVM externally owned accounts without EIP-7702, for Tezos implicit accounts, or for ordinary Solana accounts.
- A reviewed mechanism that enforces transaction policy cryptographically, if one exists for the curve. This is research only.

Until Q-01 picks one, the service-enforced limit is policy, and the combined case stays a stated residual risk.

Identity and backup on one account (Open, Q-29): Sign in with Apple and an iCloud Keychain passkey can be recovered from the same Apple account, and the same holds for Google sign-in and Google Password Manager. Whoever takes over that account then holds both the social identity and the factor that unlocks the user's share or backup. Phase 2 tests every provider and credential-manager pairing, and obligation 14 forbids recovery on the strength of one recoverable cloud account.

### Signing policy (Proposal, thresholds in Q-31)

Parsing the final bytes faithfully proves what will be signed. It does not prove that this matches what the user meant, because data sources can influence the proposed recipient, the token's identity, its decimals and the simulation. Each approval is bound to a digest of the chain ID, the account, the exact payload bytes, the simulation context (block and result hash) and the rendering version. The signer and, above the DEC-026 limit, the confirming device recompute it and refuse on any mismatch.

| Request type | Shown and checked | Refused in release 1 |
| --- | --- | --- |
| Native and token transfers | Recipient as a full address, with any name-service result marked as resolved. Token identity from the curated list, otherwise marked unknown. Decimals from the token metadata paths below. Simulated balance changes. | Simulation fails, or the token contract cannot be read |
| Approvals and operator grants (ERC-20 `approve` and `permit`, `setApprovalForAll`, FA2 `update_operators`, SPL delegate) | Shown as a grant, with the spender, amount and expiry. Unlimited amounts and spenders on no curated list are flagged. | Unlimited grants to unknown spenders, unless the user turns that on per dApp |
| Typed messages (EIP-712) | Decoded fields. Known permit types are shown as approvals. The domain chain ID must match the connected chain. | A domain chain ID mismatch |
| Arbitrary payloads | EVM `personal_sign` as UTF-8 text. Tezos only as Micheline-packed data (prefix `05`). Solana `signMessage` only as UTF-8 or the off-chain message format. | Non-text payloads, raw hashes, and any payload that parses as a transaction on any supported chain |
| Unknown contract calls | Decoded where an ABI or entrypoint type is known, with simulated effects | Calls whose simulation fails, and calls with no simulation result above a limit (Q-31) |

### Token metadata paths (Proposal)

None of these establishes that a token is trustworthy. Each only gives the decimals and symbol the token claims. Identity comes from the curated list. Every read goes to our nodes and is cross-checked against a second provider, because a node response is still a data source.

| Standard | Decimals source | When it is missing or disagrees |
| --- | --- | --- |
| SPL | The mint account's `decimals` field, which every mint has | The two providers disagree: refuse |
| ERC-20 | The optional `decimals()` call | Absent or reverting: show raw base units with an "unknown decimals" warning, never assume 18 |
| FA2 | The TZIP-12 `token_metadata` big map on-chain | Off-chain TZIP-16 metadata (IPFS or HTTPS) is shown as unverified. Without on-chain decimals: raw base units with a warning |
| FA1.2 | No standard decimals. TZIP-16 or TZIP-21 metadata where present. | Raw base units with a warning |

Fail-closed rule: when the decimals are unknown, an amount is never shown scaled. Above the Q-31 limit, such a transfer is refused.

### Media proxy (Proposal, DEC-020)

A proxy alone is not a security boundary. The rules:

- No server-side request forgery: resolve DNS ourselves, refuse private, loopback, link-local and cloud-metadata ranges, and check again after every redirect. At most 3 redirects. HTTPS only, plus IPFS and Arweave through gateways we choose.
- Size, time and pixel-count limits for every fetch and decode. Decoding runs in a sandboxed worker with a format allowlist.
- Images are re-encoded. SVG is rasterized on the server. Video is limited to allowlisted containers and codecs. 3D accepts glTF and GLB only, within size limits.
- HTML, JavaScript and interactive NFTs are never rendered in release 1, only shown as a static preview.
- Media is served from a separate cookieless origin with `X-Content-Type-Options: nosniff`, `Content-Security-Policy: sandbox` and no access to app credentials.

### Components

| Component | Language | Label |
| --- | --- | --- |
| Web app | TypeScript, React (appendix W) | Decision |
| iOS app | Swift 6.4, SwiftUI | Decision |
| Client core: share handling, threshold protocol client, transaction building and parsing, policy checks | Rust 1.100, UniFFI for Swift, wasm-bindgen for the web | Decision for Rust; Proposal for the split |
| Read path: balances, history, metadata, prices, NFT media | Platform-native (TypeScript, Swift) against one shared API contract with conformance tests, through our proxy | Proposal |
| Services: identity, authorization, recovery, coordinator | OCaml or Rust (DEC-015) | Open until Phase 3 |
| Signer service holding the service share | Rust | Decision |
| Media proxy and data-provider proxy | Language follows DEC-015 | Proposal |
| Service-to-service protocol | Versioned and authenticated. A signer re-checks the authorization evidence and the transaction digest itself and never trusts the coordinator blindly. | Decision |

Data providers (Proposal): RPC nodes, indexers, price and metadata sources are replaceable. Each chain has at least two, behind our proxy. The client core and the signer parse and check the exact bytes themselves, so a provider cannot change the bytes after approval. A provider can still influence what the user chooses to approve, which the signing policy above addresses.

Transaction building and parsing live in Rust, because the signer must parse the exact bytes it signs. `alloy` covers EVM and the split `solana-*` crates cover Solana. Tezos covers forging and signing for every admitted key type (tz1 to tz4) plus tz5 address parsing, and its library is Open (Q-09). The options are our own Rust code with Octez and Taquito as differential test oracles, or Octez's OCaml libraries if the bake-off picks OCaml.

## 7. Repository

The repository is a fork of `kukai-wallet/kukai` (DEC-013), kept private until the day-0 cleanup is done (DEC-021):

1. Add `LICENSE-APACHE` and `LICENSE-MIT`. The dual grant (DEC-022) covers files and changes we write, and nothing inherited.
2. Inherited files keep their upstream license, headers and notices. Every file carries an SPDX identifier assigned from provenance evidence (item 5), not from a blanket rule. Kukai's own web files get `Apache-2.0` and keep the MIT notice as well, because their declarations conflict. Files Kukai copied from third parties keep their own license. Files from Kukai's MIT Swift libraries stay `MIT` with their notices. Our own files get `Apache-2.0 OR MIT`. A modified inherited file keeps its identifier, with our changes noted.
3. Add a `NOTICE` crediting Kukai and listing the inherited licenses.
4. Every file changed from Kukai gets a "modified by" header.
5. Provenance check: list any third-party code that Kukai itself copied in, with its license, and remove anything whose license we cannot confirm.
6. Remove Kukai's name, logos and branding.
7. Scan the full history for secrets and credentials, and rotate or purge anything found.
8. Contributions to our code are made under the Developer Certificate of Origin.

After that the repository is public.

Layout (Proposal):

```text
wallet/
  reference/kukai-web/   Kukai's Angular tree at f0fa722, read-only, not built in CI
  apps/web/              React app (appendix W)
  apps/ios/              SwiftUI app
  apps/android/          release 2
  crates/                Rust: wallet-core, wallet-crypto, wallet-mpc, wallet-policy,
                         wallet-recovery, chain-tezos, chain-evm, chain-solana, wallet-ffi
  services/              identity, authorization, recovery, coordinator, signer, proxy
  bakeoff/               Phase 3 only: ocaml/ and rust/ versions of the same state machine
  verification/          tla/, tamarin/, proverif/, code-proofs/, test-vectors/, traceability/
  tests/                 conformance/, integration/, adversarial/, end-to-end/
  research/              competitors/, interviews/, ux-experiments/
  design/                interaction-models/, prototypes/, design-system/
  docs/                  product/, architecture/, threat-model/, adr/
```

Kukai's iOS app stays in a separate fork repository as a reference. Code copied from it or from the MIT Swift libraries keeps its upstream license, its headers and a "modified by" note, and gets a NOTICE entry.

Build tools (Proposal): Cargo, pnpm 12, Xcode, and opam with Dune for the OCaml bake-off. No Nx and no Bazel. Toolchains are pinned in `rust-toolchain.toml`, `package.json` (`devEngines` and `packageManager`), an opam lock file and `.xcode-version`, and rechecked on the day the repository is initialized. Minimum OS versions are Q-22.

## 8. Formal verification

Rules (Decision): nothing is called verified without the exact model, assumptions, tool, version and result. A failed proof or an open counterexample blocks the related gate. Custom cryptographic primitives are never written.

Mandatory property list (Proposal): each model gets a fixed list of the properties it must prove, written before the model and frozen at the start of Phase 2. "Prove what it can state" is not a gate. Each listed property is classed in one of two ways:

- Non-waivable: every safety property of signing authorization, recovery, revocation, approval binding and share independence. That covers obligations 1, 2, 4, 5, 6(b) and 6(c), 7, 8, 9, 12(a), 12(b), 14, 15(a), 15(b) and 17, each under its stated assumptions. These are also the safety properties DEC-023 requires. A gate passes only when each one is proved.
- Eligible for an exception: liveness under fairness assumptions (obligations 6(d) and 16, which G3 also shows by demonstration), performance-related properties, and properties outside the security core. An exception is written down, names the risk it leaves, is accepted by the project owner, and has a closing date.

Two different outcomes are never treated the same way:

- An incomplete proof (a timeout, or "cannot be proved") leaves the property unverified. For a non-waivable property the gate stays blocked. For an eligible one it may pass under an exception.
- A concrete counterexample within the property's stated assumptions shows that the stated guarantee does not hold. It is never waived. The design or the guarantee changes, and the change goes back through the gate.

Trust boundaries (Proposal): every obligation below names the signing paths it covers and the assumptions it is proved under. The paths have different enforcement mechanisms:

- S: service-assisted signing.
- R: recovery.
- X: unilateral exit with the user's quorum, without our services.

Each model also runs an attacker that breaks each listed assumption. The counterexample this produces is expected. It must match the residual named in the obligation's last column, and it is recorded as that residual, not as a gate failure. A counterexample that matches no named residual blocks the gate, like any other.

A property under an accepted exception has the status "Accepted exception, unverified". It is never called verified, and risk acceptance never changes that status.

Verification report (Proposal): every result records its bounds, assumptions, trusted code (the code that is assumed correct, such as libraries, the compiler, the tool itself and the mapping from logs to TLA+ actions) and the properties that remain unverified. Trace validation shows that the recorded executions conform to the specification. It shows nothing about executions that were not recorded, and the report says so.

Assumptions taken from published proofs (Decision): the unforgeability and share privacy of FROST and CGGMP under their stated models. We verify our integration, orchestration and policy, not the schemes. These assumptions are recorded in the traceability matrix with their papers.

### Tools and roles (DEC-018)

| Role | Tool | Used for |
| --- | --- | --- |
| Gate | TLA+ checked with TLC and Apalache 0.63 | Every state machine in section 6: safety, and liveness under explicit fairness assumptions. Initial TLC bounds: 3 devices, 2 identity providers, 2 concurrent sessions, 4 signing requests, 1 recovery in flight. Apalache checks inductive invariants without bounds where they exist. |
| Gate | TLA+ trace validation | The client core and services log protocol events with a logical clock per component. A mapping table assigns each event to one TLA+ action. Every trace recorded by the conformance and adversarial suites must be a behavior of the specification. One trace that is not fails the gate. This is conformance evidence for those traces, not a proof for all executions. |
| Gate | Tamarin 1.12 | Authentication, session binding, transaction-bound authorization, enrollment, revocation, recovery and linking, with an active attacker, compromised parties and replay. Threshold signing is an abstract oracle here, under the assumptions above. |
| Gate | Creusot or Verus (chosen in Phase 3) | Every Rust component's pure state transitions and policy functions, whatever DEC-015 decides, because the signer and the client core are Rust |
| Gate | Gospel, Cameleer and Why3 | The services' pure cores, only if DEC-015 picks OCaml |
| Gate | Kani | Bounded checks of Rust parsers, serialization and policy code: no panic, no overflow, no out-of-bounds access |
| Gate | Rocq | Any lemma for which Rocq gives the only full proof, for example amount and fee arithmetic |
| Cross-check | ProVerif | A second, independent model of the Tamarin protocols |
| Cross-check | The other language's verifier | During the Phase 3 bake-off only |

A disagreement between tools means one tool proves a property and another produces a concrete counterexample trace for the same property. That blocks the gate until the models are reconciled. A "cannot be proved" result or a timeout is not a disagreement. It is recorded with a time-boxed task to refine the model, and the property stays unverified meanwhile.

Every proven property gets a deliberate mutation of the model or code that the tools must catch. Models are reviewed by someone other than their author.

Requirement template (Decision): ID, normative statement, preconditions, state transitions, attacker and trust assumptions, safety or liveness property, model file, proof or check result, implementation reference, test evidence, known limits, review status. Lifecycle: Proposed, Specified, Reviewed, Verified, Implemented, Conformance-tested, Audited.

### Proof obligations (Proposal)

Assumptions used below:

| Code | Assumption |
| --- | --- |
| A-crypto | The published security proofs of FROST, CGGMP and the chosen BLS scheme hold (section 8) |
| A-signer | The signer service is honest |
| A-client | The client on the approving device runs the code we released: true by assumption for the web (DEC-026), and by App Store delivery for iOS |
| A-factor | The user-held recovery factor is secret, and is not recoverable from the user's identity provider account (Q-29) |
| A-erase | Every party erases replaced shares |
| A-fair | Fairness: messages are eventually delivered, and the user eventually acts |
| A-chain | Public RPC nodes and the blockchains are available |

| # | Property | Paths | Assumes | When an assumption fails |
| --- | --- | --- | --- | --- |
| 1 | Every signature released by the signer service corresponds to an authorized request: □(Released(r) ⇒ Authorized(r)), with Authorized, Released, transaction identity and freshness defined precisely | S | A-crypto, A-signer | A compromised signer plus a device share can sign (R-03, R-22); obligation 8 bounds what the signer alone can do |
| 2 | A compromised social account alone can neither authorize a signature nor complete a recovery | S, R | A-crypto, A-factor | Without A-factor, see obligation 14 |
| 3 | Share privacy | All | An assumption from the published proofs, not proved by us | |
| 4 | Signing sessions cannot be replayed or confused with another transaction | S | A-crypto, and A-client or A-signer | Both compromised: covered by obligation 1's residual |
| 5 | Revocation cutoff, per signing protocol: a revocation recorded before the service irreversibly releases its signing material stops that signature, and no session from a revoked device or an earlier device generation starts. A signature assembled before the cutoff stays valid on-chain, and the models state that. Presignatures made before a revocation are destroyed by it. The race between revocation and release is modelled. | S only. Path X has no service message, so no revocation can stop it (obligations 9 and 14). | A-crypto, A-signer | A compromised signer ignores revocation: L2 or L3 (section 6) |
| 6 | Recovery. (a) The service attempts notification on every enrolled device and every independent channel, and records the attempts; delivery is not required. (b) No recovery completes before the recovery delay ends. (c) An objection from an enrolled device moves the recovery into one dispute state, which needs an additional factor and a longer delay; further objections neither restart nor extend it. Provided the user holds the additional factor and the thief does not, a thief with only a stolen device can delay recovery by at most the dispute delay. (d) With the device lost or destroyed, recovery completes after the delay. Values are Q-33. Lost, destroyed, stolen and intermittently connected devices, repeated objections, and a user without the additional factor are separate test scenarios. | R | (a) to (c): A-signer, A-factor. (d): A-fair as well. | A compromised signer together with a stolen recovery factor skips the delay (R-04). A user who lost the additional factor can be blocked by a thief with the device, which is stated to the user. |
| 7 | Chain, destination and amount cannot change after the user approves them | S, X | A-crypto, A-client | A malicious client shows one thing and signs another (R-22); obligation 15(b) is the second check |
| 8 | A compromised coordinator and signer together, without the user-held shares or factors, cannot sign or recover | S, R | A-crypto, A-factor | Without A-factor, see obligation 14 |
| 9 | Recovery independence: no party that holds or can reach the service share can also reach the recovery share or the factor that unlocks it | R, X | A-factor | Design review and Tamarin; the residual is obligation 14's |
| 10 | DKG and signing messages relayed by the coordinator are delivered by authenticated broadcast, so a compromised coordinator cannot show different messages to different parties. Otherwise this is stated as a trust assumption with its consequence. | S, DKG | A-crypto | |
| 11 | The address a client shows comes from the DKG transcript that client took part in | DKG | A-client | A malicious client can show an attacker's address (R-22) |
| 12 | (a) Authentication revocation (L1): a revoked device cannot start a service-assisted session. It does not invalidate the device's share material. (b) Share replacement (L2): after a refresh or reshare, old shares do not combine with current ones. The models include an attacker who stole shares before the change. (c) Migration (L3) protects only the assets and authorities that were moved. | (a) S. (b) S, R, X. (c) X or S. | (a) A-signer. (b) A-crypto, A-erase. | (a) Old shares still sign wherever a quorum can be formed without the service. (b) Without A-erase, old shares stay usable, and only L3 helps. |
| 13 | An agent cannot extend its own permissions or bypass policy (Phase 7) | S | A-signer, A-client | |
| 14 | One cloud account is never enough: an attacker controlling a single recoverable account (an Apple ID, a Google account) cannot both pass social authentication and unlock a user-held share or backup | S, R, X | A-crypto, and the pairing rules from Q-29 | A pairing that Q-29 allows by mistake: found by the Phase 2 pairing tests |
| 15 | (a) A signature is released only for the digest the approving client displayed: chain ID, account, payload bytes, simulation context, rendering version. (b) Above the DEC-026 limit, only if the enrolled iOS device approved the same digest. | (a) S, X. (b) S. | (a) A-crypto, A-client. (b) A-crypto, A-signer, unless the Q-01 design makes iOS structurally required. | (a) A malicious web release can display one thing and sign another, up to the limit. (b) A malicious web release plus a compromised signer bypasses the iOS confirmation (R-22). |
| 16 | Exit: with every service we run unavailable and no third party involved, the user's shares form a complete signing quorum. They suffice to sign, to export every exportable key, and to move every transferable asset and supported authority (DEC-025). A liveness property, demonstrated end to end at G3 with the DEC-025 exceptions listed. | X | A-crypto, A-factor, A-fair, A-chain | Without A-chain, exit waits until a node or the chain is reachable |
| 17 | Backup freshness: a restored backup never brings back nonces, presignatures or session state, and the device generation only increases | R | Device side: A-client. Generation check: A-signer. | A compromised signer accepts an old generation; the backup still holds no session state |

## 9. Phases and gates

Gates are named once and used everywhere: G0 to G5 close Phases 0 to 3, 6 and 8, and C1 to C3 are checkpoints between the parallel workstreams.

| Phase | Work | Gate and pass criteria |
| --- | --- | --- |
| 0 Charter and research | Product charter, audience candidates, competitive UX teardown, identity provider survey, threshold library survey (cggmp24, frost, tsslib-rs, threshold BLS candidates), license audit of Kukai repos, a written request for a legal opinion on custody, capacity plan with audit capacity (Q-24), day-0 provenance check, risk register | G0: every item in sections 2 to 11 carries a label; every Open item has an owner and a closing phase; the legal request is sent; Q-24 is closed with named people and booked audit capacity, and the release 1 scope is cut to match before any later phase starts |
| 1 UX exploration (parallel with 2) | Journey maps, three competing concepts, prototypes, usability tests, native design principles, the measurement conditions and pass thresholds for every section 4 target, initial design system, PRD | G1: one concept chosen by task-completion and comprehension scores against the other two; every section 4 target has devices, profile, task, sample size and threshold written down |
| C1 | Phase 1 findings on the organizing model (assets, intents, context) are handed to Phase 2 before its account model is fixed | Written handover note |
| 2 Threat model and formal architecture | Trust boundaries, attacker capabilities including web delivery compromise (DEC-026), the custody choice (Q-01), state machines, mandatory property lists, first TLA+ and Tamarin models, traceability matrix, signing policy (Q-31), smart-account comparison. Feasibility spikes moved here from Phase 3 because the custody choice depends on them: resharing or repair per curve, DKG and signing latency on a reference iPhone and in WASM, PRF coverage (Q-07), identity provider and credential manager pairings (Q-29). | G2: TLC finds no counterexample within the section 8 bounds; every non-waivable property is proved by Apalache or Tamarin, and every other listed property is proved or carries an accepted exception; the legal opinion is received; the spikes show that the chosen custody model's recovery, compromise response and exit work on every floor curve |
| C2 | The custody choice goes back to Phase 1 for recovery usability tests | Recovery test results recorded |
| 3 Feasibility and language bake-off | DKG and threshold signing for secp256k1, P-256, Ed25519 and BLS12-381; chain-native signature checks on Tezos (tz1 to tz4), Solana, Ethereum and Base; device-share storage prototypes; the exit tool; the OCaml and Rust state machines plus the library spike (DEC-023) | G3, with one admission verdict per key type (DEC-027). A key type is admitted when: its implementation is pinned; its protocol assumptions are reviewed by someone outside the team; it meets the latency budgets on the reference iPhone and in WASM; its recovery, compromise-response (L1 to L3) and exit tests pass; its independent review is funded and booked; and the chain's own verifier accepts its signatures. The exit drill passes with every host we run blocked. The floor curves are admitted, or release 1 waits. DEC-015 and Q-27 are decided with evidence. |
| C3 | Measured latencies go back to Phase 1 to confirm or revise the onboarding targets | Revised targets recorded |
| 4 Identity and wallet infrastructure | Social sign-in, passkeys, device enrollment, wallet creation, threshold signing, recovery, revocation, auditable authorization, deployment | Takeover, replay, concurrent recovery and lost-device scenarios from the adversarial suite all rejected; trace validation passes on every conformance trace |
| 5 Chains | Tezos, Solana, Ethereum and Base adapters: addresses, transfers, tokens, NFTs, fees, simulation, signing, history, WalletConnect and Beacon | The transaction conformance suite (one vector set per operation and chain, defined in Phase 2) passes in full |
| 6 Apps | iOS and web on the chosen concept, design system, iOS dApp browser, NFT gallery, accessibility, performance, UX regression tests | G4: the shared conformance suite passes on iOS and web; every section 4 target meets the thresholds fixed at G1 |
| 7a Agents, read-only | Explanations of activity and transactions, adversarial agent tests | The agent has no path to a signing request |
| 8 Audit and launch | Independent cryptographic and protocol audit of every admitted key type, penetration test including the media proxy, recovery and exit drills, compromised-infrastructure exercises including a malicious web release, monitoring, incident response, reproducible and two-person-signed release builds, limited beta | G5: no open finding rated critical or high (CVSS 4.0 for implementation findings, and the threat model's own severity scale for protocol findings); residual risks accepted in writing |
| 7b Agents, preparation | After release 1: preparation behind deterministic policy, then bounded delegation with its own formal model | Proof obligation 13 verified |
| Release 2 | Android on the same Rust core and conformance suite, Arbitrum and Polygon | The conformance suite passes on all three platforms |

Loop-back rule (Decision): a failed G3 reopens every Phase 2 decision it contradicts. Until G3 passes, Phase 4 may only start work that does not depend on the custody model. A key type outside the floor that fails admission leaves release 1 and reopens nothing else (DEC-027).

## 10. Risk register

| ID | Risk | Severity | Mitigation |
| --- | --- | --- | --- |
| R-01 | No production-ready refresh, resharing or repair for threshold ECDSA (cggmp24 alpha, refresh crate marked not for production), so a stolen secp256k1 or P-256 share cannot be replaced | Critical | Compromise response L3 (on-chain migration) on every curve, L2 where available. Admission gate per key type (DEC-027). Phase 2 spikes per curve. Smart-account fallback for EVM. |
| R-02 | Threshold implementation bug | Critical | Reviewed libraries, published proofs, Kani on the integration, funded independent review per key type, vectors |
| R-03 | Our coordinator or signer is compromised (the Web3Auth lesson) | Critical | User-held recovery share (DEC-025); signers re-check authorization; obligations 8 to 10 |
| R-04 | Account takeover through recovery | Critical | Separate recovery model, recovery delay with a dispute state, obligations 2, 6, 9 and 14, Tamarin analysis |
| R-05 | Formal models diverge from code | Critical | Trace validation as a gate, traceability matrix, conformance tests |
| R-06 | Weak device-share protection on the web | High | PRF wrapping, the Q-07 fallback, Q-26 limits |
| R-07 | Transaction parsing or simulation errors | High | Rust parsers checked by Kani, chain-native validation, uncertainty shown to the user |
| R-08 | Scope: a new wallet and signing infrastructure, 4 chains, up to 4 Tezos key types, NFTs, 2 platforms | High | DEC-016, DEC-017, DEC-024 and DEC-027 cuts, staged phases, Q-24 closed at G0 with booked audit capacity |
| R-09 | Overcomplicated UX | High | Research first, competing prototypes, measured tasks |
| R-10 | Identity provider changes or bans | High | Several providers, passkeys, independent recovery |
| R-11 | Regulatory classification as a custodian | High | Legal opinion required at G2 |
| R-12 | Thin Rust support for Tezos | Medium | Our own forging with differential oracles, or OCaml if chosen |
| R-13 | Dependency compromise | High | Appendix W supply-chain settings, cargo-vet or cargo-deny, pinning, reproducible builds |
| R-14 | Agents gain authority | Critical | DEC-024, deterministic policy, obligation 13 |
| R-15 | DKG and signing too slow for the onboarding and login targets on phones and in WASM | High | Phase 2 latency spike, C3 loop, presignatures only under Q-19 |
| R-16 | Post-quantum migration: tz5 and no reviewed threshold ML-DSA | Medium | Address support now, owned tz5 later (DEC-019), research watch |
| R-17 | Ed25519 keys cannot be exported, which weakens the portability promise | Medium | Fund-move path in the exit tool, clear user messaging, Q-05 |
| R-18 | Signer service unavailable, so nobody can sign through us (liveness), or the service share is lost | High | Redundant signers and availability targets for outages; the DEC-025 exit path for shutdown, refusal or loss |
| R-19 | App Store rules for crypto wallets and in-app dApp browsers | High | Apple guideline review in Phase 0, an early TestFlight build |
| R-20 | Operating cost of signers, proxies and nodes | Medium | Cost model in Phase 0 |
| R-21 | Presignature misuse | High | Q-19 policy, obligations 5 and 17 |
| R-22 | A malicious web release reads unlocked shares or misrepresents approvals. Combined with a compromised signer service, it defeats the limit and the iOS confirmation. | Critical | DEC-026: hardened two-person releases, a public release log (detection), SRI, a cumulative limit enforced by the service, iOS confirmation above it, Q-26 limits, obligation 15. The combined case is a stated residual risk until Q-01 picks an enforceable design (section 6). |
| R-23 | One cloud account controls both the social identity and the factor that unlocks a share | Critical | Obligation 14, the Q-29 pairing tests, recovery delay and dispute state |
| R-24 | A data source steers what the user approves: recipient, token identity, decimals or simulation | High | Signing policy, approval binding, on-chain decimals, refusal rules (Q-31) |
| R-25 | The media proxy is used for server-side request forgery, or malicious media exploits a decoder | High | Media proxy rules in section 6, penetration test at G5 |
| R-26 | The exit tool stops working after we are gone (dependencies, RPC changes, protocol upgrades) | Medium | No dependency on our hosts, a reproducible build, public RPC lists, an exit drill each release |
| R-27 | Assets or authorities that cannot move stay under an old, possibly compromised key | Medium | DEC-025 exceptions listed per asset type, old-address watching and sender warnings, residual exposure shown to the user |

## 11. Open questions register

| ID | Question | Closes in |
| --- | --- | --- |
| Q-01 | Custody model (A1 or B), both bound by DEC-025, together with the enforceable design that bounds web exposure under a combined web and signer compromise: iOS on every service-assisted path, separate spending and vault accounts, on-chain policy, or a reviewed cryptographic mechanism (section 6, the web limit) | Phase 2 |
| Q-02 | The user-held recovery share or backup factor: what it is (printed code, second device, hardware key, separately synced passkey), how independent it is from the device and from the identity provider | Phase 2 |
| Q-03 | Identity providers at launch | Phase 1 |
| Q-04 | Identity linking, separation and recovery rules | Phase 2 |
| Q-05 | Portability: export format for exportable keys, fund-move flow for Ed25519 | Phase 2 |
| Q-06 | Key derivation: one DKG per key, or threshold-compatible derivation (non-standard for Ed25519) | Phase 3 |
| Q-07 | Web device-share fallback when PRF is missing, and measured PRF coverage | Phase 2 |
| Q-08 | Services language (DEC-015, DEC-023) | Phase 3 |
| Q-09 | Tezos encoding library in Rust or OCaml | Phase 3 |
| Q-10 | Self-hosted signing as a launch requirement | Phase 2 |
| Q-11 | Primary audience for release 1 | Phase 1 |
| Q-12 | Navigation and interaction model | Phase 1 |
| Q-13 | Agent preparation and delegation model | Phase 7b |
| Q-14 | Browser extension as a platform | After release 1 |
| Q-15 | Custody regulation: request in Phase 0, opinion required at G2 | Phase 2 |
| Q-16 | Which Kukai components to reuse | Phase 0 |
| Q-17 | Product name and branding | Phase 1 |
| Q-18 | How a zero-balance user pays the first fee: no sponsorship, Solana fee-payer sponsorship, EIP-7702 paymaster on Base, or something else for Tezos | Phase 2 |
| Q-19 | Presignature policy | Phase 2 |
| Q-20 | Chain abstraction and cross-chain transactions (from the handover) | Phase 2 |
| Q-21 | Nonce management, share rotation, offline and malicious signers (handover section 7.3) | Phase 2 |
| Q-22 | Minimum iOS version and supported devices | Phase 1 |
| Q-23 | Notifications: which events, through which channel | Phase 1 |
| Q-24 | Capacity: who does the work in each phase | Phase 0 |
| Q-25 | iOS biometric binding: current set or any enrolled biometric | Phase 2 |
| Q-26 | Limits for web-only wallets | Phase 2 |
| Q-27 | Default Tezos account type for new users | Phase 3 |
| Q-28 | Threshold BLS12-381 library and scheme for tz4, including the proof of possession needed to reveal a tz4 key | Phase 0 survey, decided in Phase 2 |
| Q-29 | Which identity provider and credential manager pairings put the social identity and the share-unlocking factor in one recoverable account, and what recovery then requires | Phase 2 |
| Q-30 | The web limit's value and window, how permissions are valued, the reservation rule for concurrent requests, and which request types always need iOS confirmation | Phase 2 |
| Q-31 | Signing policy thresholds: when an unknown call, an unavailable simulation or unknown decimals cause a refusal rather than a warning, and the durable-nonce rule | Phase 2 |
| Q-32 | Key reconstruction from a complete user-held quorum, per library, for the exit tool | Phase 2 spike, shown at G3 |
| Q-33 | Recovery delay, notification channels, dispute delay and the additional factor | Phase 2 |

## 12. Required artifacts

All are version-controlled and change through reviewed PRs: PRD, competitive UX research, UX interaction specification, ADRs, threat model, cryptographic architecture, formal verification master plan, traceability matrix, cross-platform conformance specification, security audit plan, release acceptance criteria, risk register, open questions register. Each decision records its reasoning, alternatives, evidence, open assumptions and history.

## Appendix W. Web foundation carried from plan v2

These parts of plan v2 apply to `apps/web` (Decision, DEC-014). Versions are Fact as read from npm on 17 November 2026 and are re-pinned when the repository is initialized.

| Area | Carried decision |
| --- | --- |
| Toolchain | Node 26.13.1 LTS through `devEngines.runtime`; pnpm 12.21.0; TypeScript 7.0.2; Vite 8.3.8 with `@vitejs/plugin-react` 6.3.0 and `oxc-transform-react` 0.156.0 (`compiler: true`); Oxlint 1.94 with `oxlint-tsgolint`; Oxfmt 0.79 pinned exactly; Vitest 5.1; Playwright 1.65; MSW 3.0.x with `@msw/playwright` 0.7.0 |
| pnpm-workspace.yaml | `autoDedupe`, `dedupePeers`, `strictPeerDependencies`, `minimumReleaseAge: 1440` with `minimumReleaseAgeStrict`, `trustPolicy: no-downgrade`, `blockExoticSubdeps`, `strictDepBuilds` with `allowBuilds: {}`, `engineStrict`, `lockfile.includeResolutionSettings`; CI runs `pnpm install --frozen-lockfile` and `pnpm dedupe --check` |
| tsconfig | Target ES2025, `module: preserve`, `moduleResolution: bundler`, `verbatimModuleSyntax`, `erasableSyntaxOnly`, `noUncheckedSideEffectImports`, `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noPropertyAccessFromIndexSignature`, `skipLibCheck: false`, per-project libs |
| Guarded rules | No `any` and no `useEffect`, `useLayoutEffect` or `useInsertionEffect`, overridable only with `-- ADR-NNNN: reason` pointing at an accepted ADR, checked by `scripts/check-lint-exceptions.ts` |
| Generated WASM bindings | wasm-bindgen output can contain `any`. Generated files live in `packages/core-wasm/generated/`, are excluded from lint, and are reached only through a hand-written typed facade that is linted and tested. ADR-0001 records this exception. |
| State placement | Derive first, then URL state (Zod-validated, never sensitive values, never a pre-filled transaction), then the owning store, then `useState` or `useReducer` for short-lived UI state |
| Effects replaced | The plan v2 table, plus two rows. The WASM core is initialized once by a module-level lazy promise, which components read with React's `use()` inside a Suspense boundary. A worker's life is tied to `useSyncExternalStore`: the first subscriber starts it and the last unsubscribe stops it, inside `apps/web/src/platform/`. |
| Libraries | TanStack Router, Query, Form and Virtual; Zod 4 through `zod/mini`; our own typed i18n catalog |
| Styling and browsers | CSS Modules, with design tokens from the Phase 1 design system as custom properties. The v2 rule that class names keep Kukai's names is dropped. Generated CSS Module types until the TS 7.1 content mapper is stable. Baseline 2025 browsers (Chrome and Edge 140, Firefox 140 ESR, Safari and iOS 18.4) with no global polyfills. Passkey PRF is outside that guarantee and handled by Q-07. |
| Security headers | CSP `script-src 'self' 'wasm-unsafe-eval'` (the WASM core requires it), no inline scripts, Trusted Types where supported, `frame-ancestors 'none'`. Release 1 WASM is single-threaded, so no COOP or COEP cross-origin isolation is needed. Threads would need an ADR. |
| React | StrictMode everywhere; Profiler around key views; `vite build --mode profile` with `react-dom/profiling` and the `__PERF__` buffer |
| Performance | Deterministic gates on every PR: bytes per chunk and per route, requests, absence checks, and a separate size gate for the WASM core chunk, which loads only on routes that sign. Timing gates on one dedicated runner (Chromium, 4x CPU throttle, p95 over 10 runs). The numbers are set at G1. |
| Tests | Vitest for TypeScript packages, Playwright journeys and visual regression (a pinned Linux container, frozen clock and randomness, stubbed media), MSW as the only mocking layer, a quarantine policy for flaky tests |
| Supply chain | Every dependency is decided and recorded, and own code is preferred where it is bounded. Cryptography comes from the Rust core through WASM. |
| Telemetry | None by default, behind a typed `reportEvent` and `reportError` interface with a no-op sink |

## Appendix X. Dropped from plan v2

Same features and UI as Kukai; the pixel gate against Angular; the frozen legacy test oracle; Kukai regression vectors as acceptance (they remain references for Tezos encoding); the 125-entry Kukai dependency ledger; Torus and Web3Auth social login; Kukai keystore, mnemonic and exported-social-key compatibility; the kukai-embed protocol and partner matrix; liquidity-baking swaps and the chart; Kukai-hosted services; the ported Ledger client (hardware wallets are a later item); the milestones M0 to M7.

## Appendix C. Changes from the expert handover

| Handover | This plan | Why |
| --- | --- | --- |
| Web in Angular at first | React from the start | DEC-013, DEC-014 |
| Nx and pnpm monorepo | Cargo, pnpm, Xcode, no Nx | Nx adds no value across these toolchains |
| OCaml backend (preferred) | Bake-off under DEC-023 | DEC-015 |
| Verus for Rust | Creusot or Verus, chosen in Phase 3 | Creusot uses the same Why3 engine as the OCaml path, so the comparison is fair |
| iOS and Android together | Android in release 2 | DEC-016 |
| Device-required signing as one candidate | Candidates stated as access structures: A1 with a user-held recovery share, and B with a user-held quorum. v0.3's plain 2-of-2 A2 and v0.4's escrow candidate A2e are excluded. | Reviewer findings in v0.3, v0.4 and v0.5, DEC-025 |
| CGGMP21 described as audited | Audit date, later CVE and alpha status recorded | Section 3 |
| Tezos account type undecided | All five recognized as addresses, operations gated by protocol constants; tz1 owned, tz2 to tz4 owned after admission | DEC-019, DEC-027 |
| Gates 1 to 5 | G0 to G5 plus checkpoints C1 to C3 | Numbering defined once in section 9 |
| tsslib-rs to benchmark | Kept in the Phase 0 library survey | |
| Open questions on chain abstraction, nonce management, share rotation, minimum OS versions | Q-20, Q-21, Q-22 | |
| Agent capabilities | 7a read-only in release 1, 7b after | DEC-024 |

## Appendix R. External review (20 November 2026)

An architecture review, not a cryptographic audit. Every point was checked against the plan, and round 1 point 5 also against the Octez source.

Round 1, on v0.3, applied in v0.4:

| Point | Verdict | Where addressed |
| --- | --- | --- |
| 1. Portability conflicts with A2: without the service, a 2-of-2 user can neither sign nor export | Valid | DEC-025, section 3 (threshold export), section 4 hypothesis 4, custody candidates, obligation 16, Q-32, R-26 |
| 2. Restoring a backup does not revoke a stolen share; assembled signatures stay valid | Valid | Compromise response L1 to L3, in-flight cutoff, backup freshness, obligations 5 and 17, R-01 |
| 3. Web delivery belongs in the threat model; one cloud account may hold both identity and backup | Valid | DEC-026, section 6 (web delivery), obligations 14 and 15, Q-29, Q-30, R-22, R-23 |
| 4. Recovery cannot require notifying a destroyed device, and a stolen device must not hold a permanent veto | Valid | Obligation 6 rewritten (attempts, delay, dispute state, separate scenarios), Q-33 |
| 5. Sending to tz5 is invalid while `tz5_account_enable` is off | Valid, confirmed in `validate.ml` | DEC-019 amended, section 3 (tz5 and tz4 operation validity), section 5 |
| 6. Correct bytes do not guarantee an informed approval | Valid | Section 6 (signing policy), data providers paragraph, wrong-network row (EVM addresses), simulation row, Q-31, R-24 |
| 7. Release 1 commits to curves before their production suitability is shown | Valid | DEC-027, G3 admission verdicts, G0 capacity close, R-08 |
| License: shipping both texts does not settle provenance or allow relicensing inherited code | Valid in part. Apache-2.0 compliance does meet MIT's terms, but provenance and the scope of our grant were not stated. | Section 3 (Kukai licenses), section 7 items 1, 2, 5 and 8 |
| Formal verification: traces show conformance only; "prove what it can state" is no gate | Valid | Section 8 (mandatory property list, verification report, trace validation row), G2 |
| NFT media: a proxy alone is not a security boundary | Valid | Section 6 (media proxy), R-25, G5 penetration test |
| Project definition: keep plan v2 from becoming a backlog | Valid. Plan v2 already carries a superseded banner. | Section 1 scope statement |

Round 2, on v0.4, applied in v0.5:

| Point | Verdict | Where addressed |
| --- | --- | --- |
| 1. "Move every asset" cannot be guaranteed, and moving funds does not retire the old key | Valid | DEC-025 amended (transferable assets, supported authorities, exceptions), L3 wording and residual exposure, obligation 16, R-27 |
| 2. A2e is exit through a third party, not unilateral; B needs a user-held complete quorum, not two shares | Valid. The project owner chose unilateral exit. | DEC-025 amended, A2e excluded, B row, obligations 8 and 9, Q-01, Q-02, R-03 |
| 3. The web limit is not yet a damage limit; SRI and release logs only detect; iOS confirmation needs an honest service | Valid | Section 6 (the web limit, enforcement assumption, detection only), R-22, Q-01, Q-30 |
| 4. The cutoff depends on the protocol and the path; dispute rules need preconditions; Solana durable nonces never expire | Valid | In-flight cutoff per protocol, A1 path outside it, durable-nonce rule, obligations 5 and 6(c), Q-31 |
| 5. Owner acceptance of an unproved property contradicts the strict gates | Valid | Section 8 (non-waivable and exception-eligible properties, incomplete proof versus counterexample, status naming), G2 |
| License: Apache compliance does not replace MIT notices; identifiers must follow provenance | Valid | Section 3 (Kukai licenses), section 7 item 2 |
| Token decimals: not always on-chain, and a node is still a data source | Valid | Section 6 (token metadata paths, fail-closed rule), signing policy transfers row, Q-31 |

Round 3, on v0.5, applied in v0.5.1. The reviewer accepted v0.5 as the baseline for decision and feasibility tickets and asked for narrow fixes only.

| Point | Verdict | Where addressed |
| --- | --- | --- |
| 1. Threshold signing cannot require an iOS share only above an amount | Valid. v0.5's "iOS share required above the limit" was wrong for a single key. | Section 6 (the web limit: Fact and the four enforceable designs), DEC-026, Q-01, R-22 |
| 2. Obligations must carry the architecture's trust boundaries, or the gate demands guarantees the design cannot give | Valid | Section 8 (assumption codes, obligations table with paths, assumptions and residuals; counterexample rule scoped to stated assumptions) |
| Q-32: a complete user-held quorum, not two shares | Valid | Q-32 |
| Obligation 12: revoking credentials does not invalidate shares | Valid | Obligation 12(a) to (c) |
| Old-address warnings only reach our wallet and supported integrations | Valid | Section 6, after the compromise response table |
| Unilateral exit still depends on public RPC and the chains | Valid | DEC-025, section 4, A-chain in obligation 16 |
