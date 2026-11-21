# Tezos tz4 candidate screen

P2-05 recommendation, 21 November 2026, pending acceptance by `dvkam` and review by the cryptography and Tezos reviewers. Defer owned tz4 accounts in the unfunded PoC. Keep tz4 recognition and protocol-aware recipient handling in scope. Q-28 stays open. The minimum Ed25519 and secp256k1 work can continue. [Issue #16](https://github.com/dvkam/kukai/issues/16) · [PoC scope](../../docs/program/poc-scope.md)

## Ushuaia requirements

Protocol 025 uses MinPk, with a compressed 48-byte G1 public key and a 96-byte G2 signature. The textual encodings use BLpk and BLsig. For a manager operation, Octez verifies the generic watermark byte 0x03 followed by the serialized unsigned operation. Its BLS verifier uses the signature domain `BLS_SIG_BLS12381G2_XMD:SHA-256_SSWU_RO_POP_`. [Operation signature check](https://gitlab.com/tezos/tezos/-/blob/8a624bedbe0c920521a7e4cc1b23bb0547890d6a/src/proto_025_PsUshuai/lib_protocol/operation_repr.ml#L2120) · [Watermarks](https://gitlab.com/tezos/tezos/-/blob/8a624bedbe0c920521a7e4cc1b23bb0547890d6a/src/lib_crypto/signature_v3.ml#L831) · [BLS encoding and signature checks](https://gitlab.com/tezos/tezos/-/blob/8a624bedbe0c920521a7e4cc1b23bb0547890d6a/src/lib_crypto/bls.ml)

The reveal encoding has an optional proof field. Validation requires it for a BLS key and rejects an unused proof on other key types. Application verifies the supplied proof over the compressed public key under `BLS_POP_BLS12381G2_XMD:SHA-256_SSWU_RO_POP_`. Octez also offers a threshold helper that receives a complete secret key, creates its proof and then splits the key. That helper assumes a trusted dealer. [Validation](https://gitlab.com/tezos/tezos/-/blob/8a624bedbe0c920521a7e4cc1b23bb0547890d6a/src/proto_025_PsUshuai/lib_protocol/validate.ml#L3200) · [Application](https://gitlab.com/tezos/tezos/-/blob/8a624bedbe0c920521a7e4cc1b23bb0547890d6a/src/proto_025_PsUshuai/lib_protocol/apply.ml#L1003) · [Domain definitions](https://gitlab.com/tezos/tezos/-/blob/8a624bedbe0c920521a7e4cc1b23bb0547890d6a/src/lib_bls12_381_signature/bls12_381_signature.ml#L428)

## Candidates

| Candidate and license | Protocol and implementation evidence | Platform and review evidence |
| --- | --- | --- |
| [threshold_crypto 0.4.0](https://github.com/poanetwork/threshold_crypto/tree/7709462f2df487ada3bb3243060504b5881f2628), MIT or Apache-2.0 | A dealer generated shares. Two shares produced a signature that the group key verified locally. Its default message mapping seeds ChaCha with SHA3-256 and samples a G2 point. Both Octez domain checks rejected the combined results. | Native Linux run below. The historical audit's coverage of this revision remains unconfirmed. |
| [Celo threshold BLS](https://github.com/celo-org/celo-threshold-bls-rs/tree/20964e5d745d3e4c8ac103c7ac76b25ef8601b8b), Apache-2.0 | Provides threshold signing. Upstream removed the unstable DKG crates. The survey found no complete protocol proof or tz4 possession evidence for the resulting wallet configuration. | Upstream documents iOS 15.2 builds and Node.js WASM bindings. Browser and physical-device conformance remain untested. Upstream describes the implementation as unaudited. |
| [ZenGo multi-party BLS](https://github.com/ZenGo-X/multi-party-bls/tree/304e506f036144746f01270bdf44c92afb65f846), GPL-3.0 text | Implements threshold keygen and signing based on GLOW. Its separate aggregated BLS protocol uses BDN. Exact implementation-to-proof coverage and Tezos compatibility remain unverified. | Upstream reports server measurements. Mobile and browser results, an applicable audit, and distribution-license clearance remain outstanding. |

For all three candidates, the evidence for wallet recovery, proactive refresh, repair, and unilateral exit on both target platforms remains incomplete. No candidate has a funded integration experiment or the required specialist review. [Pinned sources and capability table](../../docs/program/capabilities/README.md)

## Native compatibility result

The two reference fixtures each contain the first row of an Octez test-vector file. Each row contains the message, public test key material used to derive a key, and the expected compressed signature or proof. The reference test verifies those bytes using blst 0.3.17 and rejects the possession proof under the operation-signature domain. [Signature fixture source](https://gitlab.com/tezos/tezos/-/blob/8a624bedbe0c920521a7e4cc1b23bb0547890d6a/src/lib_bls12_381_signature/test/test_vectors/sig_g2_pop/sig_g2_pop_fips_186_3_P256_blst) · [Possession fixture source](https://gitlab.com/tezos/tezos/-/blob/8a624bedbe0c920521a7e4cc1b23bb0547890d6a/src/lib_bls12_381_signature/test/test_vectors/pop_g2/pop_g2_fips_186_3_P256_blst)

The candidate test uses fresh dealer-generated test shares and two messages, a synthetic watermarked payload and the compressed group public key. Both combined results pass the candidate verifier. Both parse as valid subgroup points and fail the corresponding Tezos domain verification. This result applies to the default byte-signing API. Running a node reveal, dealerless DKG, and a threshold possession protocol remain Phase 3 work.

Reopen Phase 3 when an owner funds a pinned candidate and reviewers can trace its DKG and signing assumptions to the implementation. Require an Octez sandbox reveal, operation verification, lifecycle and exit tests after member loss, and measurements on iPhone and browser. Record a domain mismatch, failed proof or unavailable user quorum as a failed admission case. [Phase 3 ticket](https://github.com/dvkam/kukai/issues/27)

Run from the repository root with Rust 1.100.0.

```sh
cargo +1.100.0 test --locked --manifest-path experiments/tz4-screen/Cargo.toml
```
