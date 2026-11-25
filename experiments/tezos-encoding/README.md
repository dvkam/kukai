# Tezos unsigned operation encoding

This experiment supplies serialization evidence for P3-07 and sample inputs for P2-08. Q-09 and Q-31 remain open. P3-07 still depends on the P2-12 review. [P3-07](https://github.com/dvkam/kukai/issues/30) · [P2-08](https://github.com/dvkam/kukai/issues/19) · [P2-12](https://github.com/dvkam/kukai/issues/23)

## Results

On 25 November 2026, the pinned Octez codec encoded each input to the expected unsigned bytes and decoded those bytes to the original JSON. The three upstream samples also matched their committed regression rows. Taquito 25.1.1 forged, parsed, and reforged the same bytes in all four configurations.

| Case | Bytes | Source of expected bytes |
| --- | ---: | --- |
| Plain tz1 to tz1 transfer | 86 | Pinned codec run on synthetic input |
| Plain tz1 to tz5 transfer | 86 | Pinned codec run on synthetic input |
| Implicit transaction to tz1 | 92 | Octez U025 regression row |
| tz1 reveal | 101 | Octez U025 regression row |
| tz4 reveal with a proof field | 210 | Octez U025 regression row |

The suite calls the public `@taquito/local-forging` API directly. It instantiates Rio and Seoul as `OperationService.getLocalForger()` does, uses the default `localForger` from the operations modal, and instantiates U025 explicitly. The installed package defaults to U025. Its `getCodec` ignores the protocol argument, and its Rio and Seoul instances also serialize the tz5 destination. [Wallet operation service](../../src/app/services/operation/operation.service.ts) · [Operations modal](../../src/app/components/modals/operations/operations.component.ts) · [Taquito source revision](https://github.com/ecadlabs/taquito/tree/1cc2663cf397066ce46065a2595aaeaf41c42552)

Changing the synthetic amount changes the Taquito bytes. Taquito rejects a missing amount, and both codecs reject bytes truncated before the parameters flag. Both codecs remove leading zeros from the amount during encoding. When the binary explicitly carries default `Unit` parameters, Octez omits `parameters` from the decoded JSON and Taquito retains it. Both encode that meaning to the canonical bytes with the absent-parameters flag. Approval binding therefore needs the original bytes even when a decoder returns familiar JSON.

These checks cover single unsigned manager operations. Network acceptance, counters, branch freshness, cryptographic verification of the reveal proof, signatures and simulation remain outside this experiment. P2-08 still requires the connected protocol's capability checks. U025 validation checks `tz5_account_enable` on the transaction destination and requires a proof field for tz4 reveal. U025 application verifies that proof cryptographically. [U025 validation source](https://gitlab.com/tezos/tezos/-/blob/8a624bedbe0c920521a7e4cc1b23bb0547890d6a/src/proto_025_PsUshuai/lib_protocol/validate.ml#L3343) · [U025 application source](https://gitlab.com/tezos/tezos/-/blob/8a624bedbe0c920521a7e4cc1b23bb0547890d6a/src/proto_025_PsUshuai/lib_protocol/apply.ml#L1029) · [DEC-019](../../docs/program/program-plan-v0.5.1.md#2-decision-log)

## Replay

Use Node 24.22.1 with the repository's locked npm installation. This command runs the synthetic fixtures and Taquito controls in CI without external fixtures, executable downloads, or chain I/O.

```sh
npm run test:tezos-encoding
```

Pass a local Git checkout that contains commit `8a624bedbe0c920521a7e4cc1b23bb0547890d6a` to add the three upstream cases. The check reads the pinned Git objects and verifies their SHA-256 digests. [Octez commit](https://gitlab.com/tezos/tezos/-/commit/8a624bedbe0c920521a7e4cc1b23bb0547890d6a)

```sh
npm run test:tezos-encoding -- --octez-source /path/to/tezos
```

On x86-64 Linux, also pass the static `octez-codec` artifact to encode and decode all five cases locally and replay the Octez controls. The script checks the executable's SHA-256 and version before using it. The single-file download is 92,812,224 bytes and reports `8a624bed (2026-11-12 16:30:32 +0000) (Octez 0.0+dev (build: 0))`. GitLab lists its expiration as 12 December 2026 at 16:48 UTC. [Pipeline 3060600752](https://gitlab.com/tezos/tezos/-/pipelines/3060600752) · [Job 17976854235](https://gitlab.com/tezos/tezos/-/jobs/17976854235)

```sh
octez_artifact_dir=$(mktemp -d)
curl --fail --show-error --location --max-time 90 --max-filesize 100000000 \
  --output "$octez_artifact_dir/octez-codec" \
  'https://gitlab.com/api/v4/projects/3836952/jobs/17976854235/artifacts/octez-binaries/x86_64/octez-codec'
chmod u+x "$octez_artifact_dir/octez-codec"
npm run test:tezos-encoding -- --octez-source /path/to/tezos --octez-codec "$octez_artifact_dir/octez-codec"
```

## Fixture provenance

- Octez uses the U025 encoding `025-PsUshuai.operation.unsigned`. The Tezt test driver carries an MIT notice and calls `octez-codec` for encode and decode. The U025 regression snapshot dates to `dab4dcbd9218b70fc3af6ce635f2fd317833a52b`, which copied the Alpha regression files. `references.json` records checksums for the original sample JSON files, committed regression output, and executable. The replay reads those files from the checkout and the artifact path. [Tezt driver](https://gitlab.com/tezos/tezos/-/blob/8a624bedbe0c920521a7e4cc1b23bb0547890d6a/tezt/tests/encoding.ml) · [Regression output](https://gitlab.com/tezos/tezos/-/blob/8a624bedbe0c920521a7e4cc1b23bb0547890d6a/tezt/tests/expected/encoding.ml/U025--%20protocol%20encoding%20regression%20test-%20operation.unsigned.out) · [Original samples](https://gitlab.com/tezos/tezos/-/tree/8a624bedbe0c920521a7e4cc1b23bb0547890d6a/tezt/tests/encoding_samples/u025/operation.unsigned)
- `synthetic.json` uses a 32-byte branch filled with `42` in hexadecimal, a source hash filled with `17`, and a destination hash filled with `a5`. The destinations differ only in address type. The pinned Octez codec produced the expected operation bytes. [Synthetic inputs and expected bytes](synthetic.json)
- The Taquito npm package is pinned at `25.1.1` in `package-lock.json`, with source revision `1cc2663cf397066ce46065a2595aaeaf41c42552` reported by the package. The suite checks both identifiers. [Package lock](../../package-lock.json)
