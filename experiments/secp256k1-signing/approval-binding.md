# Native Ethereum and Base approval binding

This test-only experiment checks whether a verifier can reconstruct the same typed review and reject changes to its approval inputs. The scope is a synthetic EIP-1559 native-value transfer on Ethereum mainnet (chain 1) or Base (chain 8453). Q-31, production policy, independent specialist review, and owner acceptance remain open. [Issue #19](https://github.com/dvkam/kukai/issues/19) · [Plan v0.5.1, section 6](../../docs/program/program-plan-v0.5.1.md#6-architecture)

## Inputs and checks

The request contains the exact unsigned EIP-1559 signing bytes, with type byte `0x02` followed by the nine RLP fields. The experiment bounds input to 128 bytes before calling pinned Alloy. The parser must consume every byte and Alloy's unsigned re-encoding must match the input. The validator refuses signed envelopes, noncanonical or malformed bytes, unsupported transaction types, and chain IDs outside its scope or inconsistent with the active network.

The experiment accepts nonzero value, 21,000 gas, an address destination, empty calldata and an empty access list. It refuses a zero maximum fee or a priority fee above that cap. The typed review contains the full account and destination addresses, chain ID, exact value in wei, gas limit, per-gas caps and maximum execution gas cost in wei. The cost is gas limit multiplied by the per-gas maximum. Base L1 data and operator fees are outside that figure.

The caller supplies the active account and chain, rendering version, session ID, device generation, selection epoch and trusted time. The selection epoch increases whenever the selected account or network changes, including switching away and back. The caller also supplies simulation evidence keyed to chain, account and SHA3-256 of the exact unsigned bytes. It tracks an immutable block hash and result hash and classifies the outcome. A supported outcome means a successful transfer to a code-empty recipient, including absence of delegated EIP-7702 code, with precompiles excluded. The validator checks the supplied subject and classification and rejects missing, failed, disagreeing or out-of-scope evidence. Code and precompile classification, provider agreement and calculation of the result hash happen outside this experiment.

Approval issuance supplies a review time and an expiry, expressed as integer seconds since the Unix epoch. The fixture bounds lifetime to 120 seconds and accepts checks during `reviewed_at <= now < expires_at`. A verifier supplies current context and simulation evidence, reruns validation and compares the digest. A changed block or result needs a new approval. Changes to balances, base fee and recipient code after simulation can affect later execution, and a previous block can be reorged.

The fixture assumes an honest reviewing client associates the digest with the displayed fields and an honest verifier authenticates the approval and supplies current context. Anyone can compute the unkeyed digest. Repeated checks against identical supplied evidence succeed until expiry, even if the chain has changed outside the verifier's view. The caller owns evidence freshness and atomic single-use consumption. Trusted clocks, session issuance, generation and epoch management, evidence acquisition, rendering, iOS confirmation and signature release remain outside the experiment. The fixtures use synthetic addresses and hashes and make no network calls. Formal proof and owner decisions remain open.

## Encoding and vector

Apply FIPS 202 SHA3-256 to these consecutive fields. Integers are unsigned, fixed-width and big-endian. Addresses and hashes are raw bytes. This digest belongs to the approval review.

| Field | Encoding |
| --- | --- |
| Domain | ASCII `kukai-approval-binding-v1` followed by one zero byte |
| Chain ID | 8 bytes |
| Active account | 20 bytes |
| Unsigned transaction length | 4 bytes |
| Unsigned transaction | That many exact bytes |
| Simulation block hash | 32 bytes |
| Simulation result hash | 32 bytes |
| Rendering version | 4 bytes |
| Session ID | 32 bytes |
| Device generation | 8 bytes |
| Selection epoch | 8 bytes |
| Review time | 8 bytes |
| Expiry | 8 bytes |

The [fixed Base vector](tests/approval/vector.json) includes exact bytes, supplied evidence, expected review fields, and digest `152f565f8636d2999f152c2877f9ec3a69f7b2728c8e6ae96846559ec21efd45`. The Rust test checks the byte encoding with Alloy and compares the digest to the vector. To reproduce the digest and simulation subject independently with Python's standard library, run this from the repository root.

```sh
python - <<'PY'
import hashlib
import json
import struct
from pathlib import Path

vector = json.loads(Path("experiments/secp256k1-signing/tests/approval/vector.json").read_text())
def raw(field):
    return bytes.fromhex(vector[field])

payload = raw("unsigned_transaction")
assert hashlib.sha3_256(payload).hexdigest() == vector["simulation_payload_hash"]
encoded = b"".join((
    b"kukai-approval-binding-v1\x00",
    struct.pack(">Q", vector["chain_id"]),
    raw("account"),
    struct.pack(">I", len(payload)),
    payload,
    raw("simulation_block_hash"),
    raw("simulation_result_hash"),
    struct.pack(">I", vector["rendering_version"]),
    raw("session_id"),
    struct.pack(">QQQQ", *(vector[key] for key in ("device_generation", "selection_epoch", "reviewed_at", "expires_at"))),
))
digest = hashlib.sha3_256(encoded).hexdigest()
assert digest == vector["approval_digest"]
print(digest)
PY
```

```sh
cargo +1.100.0 test --locked --manifest-path experiments/secp256k1-signing/Cargo.toml --test approval_binding
```

The conformance cases exercise both chains, refused envelopes and simulation findings, changed account, network, transaction, block and result, changed renderer, session and generation, switching away and back, and lifetime boundaries. The other request types in issue #19 and their policies require separate conformance cases.
