# Ed25519 signing experiment

This is PoC work for [issue #14](https://github.com/dvkam/kukai/issues/14), under [POC-001](../../docs/program/poc-scope.md). It exercises published FROST APIs with temporary test keys. It does not select a custody design or admit a curve for production.

## Scope and prerequisites

The experiment uses the A1 candidate with three participants and a threshold of two. Participant 1 represents the device, participant 2 the service, and participant 3 the user-held recovery material. The roles are labels inside one process. DKG runs separately for each group. No dealer creates or splits a complete key.

The tested boundaries come from issue #14: dealerless key generation, signing with only user-held material, and verification through the relevant chain libraries. Negative tests exercise insufficient shares, changed messages, and mixed signing material. These are library integration checks. No transport, login, backup encryption, user interface, or approval policy exists here.

Before relying on these results, retain these assumptions.

- The host and random generator are honest. Each run gets new test material from the operating system.
- The in-memory DKG routing stands in for confidential, authenticated channels and consistent round-one broadcast. No test here establishes those network properties.
- A signing attempt creates fresh nonces. Test helpers consume each attempt once and do not serialize nonces. This is not crash-safe nonce storage.
- Dropping the service key package removes it from the signing input. It does not prove memory erasure, process isolation, or resistance to a compromised host.
- Native chain-library verification checks signed byte conventions. The messages are synthetic bytes, not forged transactions. No node accepts an operation in this experiment.

The audience decision in #8 and the full threat model in #12 remain open. This experiment assumes a user can keep a second share separately from the device. That assumption must be tested before custody selection. No product or production-gate decision follows from it.

## Run the checks

Use Rust 1.100.0 with rustfmt and Clippy. Run these commands from the repository root.

```sh
rustup toolchain install 1.100.0 --profile minimal --component rustfmt --component clippy
cargo +1.100.0 fmt --manifest-path experiments/ed25519-signing/Cargo.toml -- --check
cargo +1.100.0 clippy --manifest-path experiments/ed25519-signing/Cargo.toml --locked --all-targets -- -D warnings
cargo +1.100.0 test --manifest-path experiments/ed25519-signing/Cargo.toml --locked
```

Dependencies are exact direct versions, with transitive versions and registry checksums in `Cargo.lock`. FROST 3.0.0 is the version already compiled in the [capability checks](../../docs/program/capabilities/README.md). Solana verification uses `solana-signature` 3.6.0 with its `verify` feature. Tezos verification uses `tezos_crypto_rs` 0.6.0 without its optional BLS feature. These verifier versions are experiment dependencies, not a production dependency approval.

## Observed native results

On 20 November 2026, the Linux x86_64 run with Rust 1.100.0 passed all seven tests, formatting, and Clippy with warnings denied for the experiment. The [native result record](evidence/native-results.json) identifies the tested source commit, compiler, platform, dependency lock digest, commands, exit codes, and output digests. It links the captured [formatting output](evidence/format.txt), [Clippy output](evidence/clippy.txt), and [test output](evidence/tests.txt). The record does not claim the owner personally reviewed or accepted the results. CI repeats these checks on every PR, with a run log for that commit.

| Case | Observed result |
| --- | --- |
| Device and recovery shares, with the service package removed | Solana's signature verifier accepts the signature and rejects changed message bytes. |
| Separate Tezos DKG, with the service package removed | Tezos's verifier accepts a signature over Blake2b-256 of the watermarked message. It rejects removal of the watermark and a different public key. |
| Each participant alone | FROST rejects signing with `IncorrectNumberOfCommitments`. |
| Recovery share from a separate DKG | Signing fails for the intended account. |
| Old signature share inserted into a fresh round for the same message | Both original rounds succeed. The mixed round fails aggregation. |
| Coordinator changes the message after collecting shares | The original transcript succeeds. The changed transcript fails aggregation. |
| Each of the three possible two-share combinations | Solana's verifier accepts signatures for the same account. |

The last case illustrates the static threshold boundary. The library does not restrict a valid quorum by amount, role label, or service policy. The signing helpers are test-only code, not a wallet signing API.

These checks exercise the chain libraries' verification APIs, not independent cryptographic proofs. They do not establish agreement across every node or protocol version. Cargo also reports a future Rust compatibility warning for the transitive `parse-display-derive` 0.4.1 dependency. The pinned compiler accepts it. Replacing or upgrading the Tezos verifier requires a separate compatibility check.

## Remaining evidence

Issue #14 stays open. The [native refresh and repair cases](lifecycle.md) cover in-memory changes to the test group. Participant replacement with a new identity, durable multi-device commit, encrypted offline recovery, reference iPhone measurements, and browser runtime measurements still need experiments. Key reconstruction does not produce an Ed25519 seed. This experiment does not export a wallet seed or test an import format.

The G3 exit drill still requires an independent tool with every project service blocked, supported asset migration, permission handling, and chain availability. Removing one key package in a single-process test does not complete that drill. Protocol-specific revocation cutoffs, recovery disputes, approval binding, and formal obligations remain separate work.

The [Chromium WebAssembly run](browser/README.md) records key generation and signing with the two user shares for both chains. The native lifecycle tests have separate coverage.
