# secp256k1 signing experiment

This is test-only native work for [issue #15](https://github.com/dvkam/kukai/issues/15), under [POC-001](../../docs/program/poc-scope.md). The accountable owner is `dvkam`. The agent implements and checks the experiment. Independent specialist review and owner acceptance are not claimed.

## Question and prerequisites

Can the pinned CGGMP24 implementation generate a two-of-three key, sign Ethereum and Base transaction bytes with only the user's device and recovery shares, and reconstruct the same private key without the service share?

The tested boundaries come from issue #15: dealerless key generation, threshold signing, user-quorum reconstruction, transaction verification, and restored key-share material. Participant 0 represents the device, participant 1 the service, and participant 2 the recovery share. This is an A1 candidate experiment, not a custody decision. The audience decision in #8 and the full threat model in #12 remain open.

All parties run in one Linux process through the library's in-memory simulator. It stands in for confidential, authenticated channels and agreed participant identities. No network or authentication security is established. Randomness comes from the operating system. Each protocol execution needs a fresh random execution ID. Keys are temporary and hold no assets. No transaction is broadcast.

The user is assumed to hold the recovery share separately from the device. Removing the service material tests signing inputs, not memory erasure or a firewall-blocked exit tool. Reconstruction deliberately places the complete test private key in one process. It does not demonstrate safe export, backup encryption, or a secure recovery interface.

## Inputs and expected outcomes

The manifest pins CGGMP24 0.7.0-alpha.3 and Alloy transaction libraries. Cargo.lock pins transitive dependencies and registry checksums. Rust 1.100.0 is the compiler. CGGMP24 uses its default security level with the num-bigint backend. The `spof` feature enables reconstruction for the exit experiment. The unsafe raw-hash feature and HD derivation are disabled. Signing must hash the complete transaction preimage with Keccak-256 through `DataToSign`.

An unconstrained lockfile initially selected incompatible alpha.4 versions of `cggmp24-keygen` and `paillier-zk`. The retained lockfile pins both to alpha.3. A dependency update needs a fresh compatibility run. The [capability survey](../../docs/program/capabilities/README.md) records the limited audit coverage and advisory history. The older audit does not establish coverage of this alpha release or its general-threshold extension.

Expected outcomes are successful user-quorum signing and reconstruction, rejection of a single share and duplicated share identities, and verification of signed transaction encodings for chain IDs 1 and 8453. Changed transaction fields must not verify as the original account. Restoring key-share material must not require saved nonces or presignatures.

The library has no production refresh support. Restoring a backup or changing authentication cannot invalidate a stolen share. A retained old quorum must still be expected to control the old account. Migration, remaining assets, approvals, and other authorities need separate on-chain work.

The setup generates four fresh 1536-bit safe primes for each participant, using three worker threads. The in-memory protocol simulator executes the auxiliary protocol and signing rounds. Printed elapsed times are single observations on a shared host, not latency percentiles or device benchmarks. Setup includes all three participants. User-quorum signing begins after the service key package is removed.

The backup probe serializes only long-lived key packages into a temporary memory buffer. It restores those packages and runs a fresh signing session. No nonces, presignatures, key packages, or reconstructed keys are written to disk or printed. The buffer is not an encrypted backup, and the test does not establish memory erasure.

## Commands and review

Pinned commands cover the complete native suite, formatting and Clippy in PR CI. The quorum target has three test functions. Its full signing case shares one parameter-generation run across its related checks to avoid generating unused test keys. [Run the experiment](verify.md)

The experiment exercises complete EIP-1559 transaction encodings with synthetic values and chain IDs 1 and 8453. Alloy decodes the signed bytes and recovers the account. CGGMP24 also checks its own signature. These checks do not establish node acceptance, sufficient account balances, fee validity, Base-specific network rules, or asset migration.

The test-only approval target exercises deterministic review comparison for the native-transfer subset of issue #19. [Approval binding](approval-binding.md)

## Native results

The 20 November 2026 Linux x86_64 run passed formatting, Clippy with warnings denied, and all three tests. The [result record](evidence/native-results.json) identifies the tested source commit, platform, compiler, commands, exit codes, dependency lock digest, and output digests. Captured outputs cover [formatting](evidence/format.txt), [Clippy](evidence/clippy.txt), and [tests](evidence/tests.txt).

| Case | Expected and observed outcome | Status |
| --- | --- | --- |
| Device and recovery shares reconstruct without the service share | The reconstructed scalar produces the original public key. A standard k256 signing key signs transactions for both chain IDs. | Passed |
| Device or recovery share alone reconstructs | Reconstruction returns an error. | Passed |
| Duplicate identities or shares from separate DKG keys reconstruct | Reconstruction returns an error. | Passed |
| Each participant alone attempts threshold signing | Each participant returns an error. | Passed |
| Device and recovery shares sign with the service package removed | Both chain transaction encodings decode and recover the original account. | Passed |
| Change the value or chain ID after signing | The changed transaction does not recover the original account. | Passed |
| Restore long-lived user shares from the memory buffer | A new threshold-signing session succeeds without saved nonces or presignatures. | Passed |
| Retain original shares after restoration | The original quorum still reconstructs the private key for the same account. | Passed |

The retained run took about 169 seconds for safe-prime generation and 57 seconds for the auxiliary protocol. Its three signing sessions took about 2.7 to 3.0 seconds each. These are raw observations under the recorded conditions. They do not choose a presignature policy or predict browser or iPhone latency.

## Remaining evidence

The separate [EIP-1559 exit experiment](exit/README.md) exercises retained core packages in fresh processes. It reconstructs the exportable key and signs synthetic Ethereum and Base transactions in a runner designed for a private Linux network namespace.

The issue stays open until its full acceptance criteria are met. Browser and physical iPhone execution are Deferred under POC-001. Authenticated transport, malicious and offline participants, concurrent requests, crash-safe nonce handling, presignature reuse attacks, protocol release cutoffs, migration, and the full G3 exit drill are Unrun. Independent review and the presignature-policy decision are Deferred. Native results cannot establish those properties or pass a production gate.
