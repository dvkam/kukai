# Cryptographic library capabilities

Research for [P0-03](https://github.com/dvkam/kukai/issues/3), retrieved on 20 November 2026. Owner and current PoC reviewer: `dvkam`. This record supports experiments under [POC-001](../poc-scope.md). It admits no key type for production.

## Evidence and versions

[sources.json](sources.json) records released package checksums, package source revisions, inspected repository snapshots, and tool-release URLs. Release archives were downloaded from crates.io and checked against the registry checksums. A repository's current branch and its published package are separate evidence sources.

| Package | Released version inspected | Package source revision | Declared license | Declared minimum Rust |
| --- | --- | --- | --- | --- |
| cggmp24 | 0.7.0-alpha.3 | `d1ec5af47f93a909adc8a16aedd82a175f5b06b1` | MIT OR Apache-2.0 | Not declared in package metadata |
| frost-ed25519 and frost-core | 3.0.0 | `2016e44ba4a4757a996300350063b937a2ad33e8` | MIT OR Apache-2.0 | 1.81 |
| tsslib, from tsslib-rs | 0.2.17 | `999a8ebc16e84fbcbdd2350367eadb3b161266e5` | MIT | 1.95 |
| threshold_crypto | 0.4.0 | `7709462f2df487ada3bb3243060504b5881f2628` | MIT OR Apache-2.0 | Not declared in package metadata |

The FROST development snapshot `0966bd1529aa062ad3b621af99e277f976b1c0f0` declares Rust 1.86. That requirement must not be attributed to the released 3.0.0 package. CGGMP's development workspace names an alpha.4 refresh crate, while the inspected published signing package is alpha.3. No development branch is substituted into the experiment.

## Capability matrix

“Present” below means a documented API or source implementation was found. It does not mean the protocol has passed this program's tests. “Unconfirmed” means this survey cannot establish the capability. Refresh, membership resharing, lost-share repair, and full-key reconstruction remain separate operations.

| Candidate | DKG and signing | Refresh | Membership resharing | Lost-share repair | Key reconstruction |
| --- | --- | --- | --- | --- | --- |
| cggmp24 alpha.3 | Present. Threshold and n-of-n ECDSA. Features expose secp256k1, P-256, and Stark. | Absent from the signing crate. Separate development crate warns that its security is unvalidated and forbids production use. | No production-supported path established. | No supported path established. | `key_share::reconstruct_secret_key` is present. A qualifying set of shares is required. |
| FROST 3.0.0 Ed25519 | Present. DKG and two-round signing. | Dealer and DKG refresh modules are present. | Refresh can remove participants. Arbitrary replacement or threshold changes are not established by that fact. | `repair_share_part1`, `part2`, and `part3` are present. Replacement-device use needs protocol tests. | `keys::reconstruct` is present. It reconstructs a signing scalar, not a standard Ed25519 seed. |
| tsslib 0.2.17 FROST and DKLs23 | Source documents Ed25519 FROST and secp256k1 ECDSA keygen/signing. Other modules include Ristretto, BIP340, legacy GG18, and experimental ML-DSA. | Source documents FROST and DKLs refresh. | Source documents resharing APIs. | No distinct lost-share repair claim established here. | User-held export path unconfirmed. Import APIs and a resharing implementation do not establish independent export. |
| Celo threshold BLS snapshot | Threshold signing documented. DKG crates were removed as unstable. | Unconfirmed. | Unconfirmed. | Unconfirmed. | Unconfirmed for this wallet's export format. |
| threshold_crypto 0.4.0 | BLS threshold shares and combination are present. Trusted-dealer `SecretKeySet` is not a dealerless DKG proof. | Unconfirmed. | Unconfirmed. | Unconfirmed. | Unconfirmed for the exit tool. |
| ZenGo multi-party-bls snapshot | Threshold BLS over BLS12-381 documented. Repository warns against production use without consultation. | Unconfirmed. | Unconfirmed. | Unconfirmed. | Unconfirmed. |

FROST over secp256k1 produces Schnorr signatures, not EVM ECDSA. tsslib's BIP340 module is therefore not an Ethereum/Base substitute. Ed25519 scalar reconstruction does not reverse the RFC 8032 seed hash. The exit requirement still needs independent signing and an asset-move path.

## Security and audit boundaries

CGGMP's [September 2023 Kudelski report](https://github.com/LFDT-Lockness/cggmp21/blob/3c9c065c5e1a81be25837afe614571067c18259d/docs/audit_report.pdf) lists cggmp21 revision `d2b8494a480c638d2db81d41e7eb5833b2ebba3b`, generic-ec `c418c93b19fced622382d3df34368911b6b99731`, and paillier-zk `4f034852bd61d199b3b4462a3079fb7c0fa1adc9`. That report is not an audit of alpha.3 or the new refresh crate.

[RUSTSEC-2025-0127](https://rustsec.org/advisories/RUSTSEC-2025-0127.html), also CVE-2025-66017, describes presignature attacks in cggmp21. HD derivation can reduce security to about 85 bits, and raw-hash signing can allow forgery. The advisory identifies API changes in cggmp24 alpha.2 as the fix. The PoC uses alpha.3 and must not enable `insecure-assume-preimage-known` or restore the removed unsafe signing behavior. No complete dependency-advisory scan has run in this ticket.

CGGMP's own README distinguishes its general-threshold extension from the original paper's n-of-n protocol. That extension and every implementation departure need review. A paper proof does not establish the safety of this implementation or the application's transport, state handling, and backup rules.

FROST's [audit statement](https://github.com/ZcashFoundation/frost/blob/0966bd1529aa062ad3b621af99e277f976b1c0f0/README.md#ncc-audit) names v0.6.0, commit prefix `5fa17ed`. NCC reviewed the listed core ciphersuites, dealer keygen, DKG, and signing. The statement excludes Taproot and rerandomized FROST. It does not establish that the later 3.0.0 repair and refresh paths were audited. Those paths need their own review and tests.

The tsslib README requires callers to authenticate peers. DKLs and legacy ECDSA VSS messages need confidential point-to-point transport because the library sends those shares in cleartext. It marks legacy GG18 ECDSA, legacy EdDSA, and threshold ML-DSA as experimental or unsuitable for production. An independent audit of the selected 0.2.17 FROST/DKLs implementation was not established in this survey. Its broker, HD derivation, and refresh extensions require review beyond the cited protocol papers.

FROST nonces and ECDSA presignatures are single-use material. Later experiments must test concurrent requests, aborts, retry, backup restore, and process crashes without nonce or presignature reuse. No nonce or presignature may enter a recovery backup. A successful build exercises none of these properties.

## BLS survey and admission gaps

The inspected repository snapshots are pinned in sources.json. Celo's snapshot declares Apache-2.0 and says it has not been audited. It removed its DKG crates. The threshold_crypto repository cites a historical audit, but this survey has not confirmed the audit's exact covered revision or a delta review through the inspected package. Its insecure mock-crypto feature must remain disabled.

ZenGo's multi-party-bls repository includes GPL-3.0 license text. Whether that grant is GPL-3.0-only or permits later versions needs clarification from the complete grant evidence. Its compatibility with the intended distribution is unresolved, and no code from it is selected.

No BLS candidate has demonstrated Octez-compatible signature serialization, group orientation, hash-to-curve domain separation, threshold proof of possession for tz4 reveal, recovery, or unilateral exit. `blst` is a BLS implementation, not by itself a threshold DKG/recovery protocol. P2-05 must select or defer a complete scheme. This survey does not close Q-28.

## Build evidence

The [reproducible library build check](../../../experiments/library-build-check/README.md) checks checksum-pinned FROST 3.0.0 and CGGMP24 alpha.3 sources using retained dependency locks. CGGMP24 enables `curve-secp256k1`. Rust 1.100.0 checks both libraries on Linux x86_64 and `wasm32-unknown-unknown` successfully.

The [recorded run](build-evidence/results.json) retains the exact commands, compiler, host, exit codes, and adjacent logs. These are `cargo check` results. They do not run a signature, link a browser application, measure latency, validate entropy, or test a physical iPhone. The original application remains unchanged. Runtime, curve compatibility, recovery, compromise response, and exit are unrun.

[Toolchain constraints](toolchains.md) distinguish declared compatibility from measured builds. The [experiment record template](experiment-template.md) defines the evidence required for subsequent feasibility work.
