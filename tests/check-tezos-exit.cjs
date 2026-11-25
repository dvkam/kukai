const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { createRequire } = require('node:module');
const { LocalForger, ProtocolsHash, VERSION } = require('@taquito/local-forging');
const { sign } = require('tweetnacl');
const reference = require('../experiments/tezos-encoding/references.json');
const synthetic = require('../experiments/tezos-encoding/synthetic.json');

// Resolve the utils used by this forger. The wallet lock also includes older releases.
const requireForger = createRequire(require.resolve('@taquito/local-forging'));
const { b58Encode, b58DecodeAndCheckPrefix, getPkhfromPk, PrefixV2, verifySignature, VERSION: utilsVersion } =
  requireForger('@taquito/utils');
const forger = new LocalForger(ProtocolsHash.PsUshuai9);
const managerWatermark = Uint8Array.of(0x03);

async function main() {
  assert.deepEqual(VERSION, reference.taquito);
  assert.deepEqual(utilsVersion, reference.taquito);
  const account = readFileSync(process.argv[2]);
  assert.equal(account.length, 32, 'pinned Ed25519 account key length');
  const publicKey = b58Encode(account, PrefixV2.Ed25519PublicKey);
  const source = getPkhfromPk(publicKey);

  // Public test seed for the synthetic user recipient. The FROST key has no exported seed.
  const recipientKey = sign.keyPair.fromSeed(new Uint8Array(32).fill(0xa5)).publicKey;
  const recipientPublicKey = b58Encode(recipientKey, PrefixV2.Ed25519PublicKey);
  const destination = getPkhfromPk(recipientPublicKey);
  assert.notEqual(source, destination);
  const transfer = { ...synthetic.transaction, source, destination };
  const operation = { branch: synthetic.branch, contents: [transfer] };
  const expected = await forger.forge(operation);

  const rows = readFileSync(0, 'utf8').split('\n');
  assert.equal(rows.length, 3, 'signer outputs unsigned hex and a Base58Check signature');
  const [unsigned, signature, end] = rows;
  assert.equal(end, '', 'signer terminates its output with a newline');
  assert.equal(unsigned, expected, 'signer bytes must match independently forged bytes');
  assert.deepEqual(await forger.parse(unsigned), operation);
  const [rawSignature, prefix] = b58DecodeAndCheckPrefix(signature, [PrefixV2.Ed25519Signature]);
  assert.equal(prefix, PrefixV2.Ed25519Signature);
  assert.equal(rawSignature.length, 64);
  assert.equal(verifySignature(expected, publicKey, signature, managerWatermark), true, 'Taquito verifies the edsig');

  const changedAmount = await forger.forge({
    ...operation,
    contents: [{ ...transfer, amount: (BigInt(transfer.amount) + 1n).toString() }]
  });
  // Preserve the distinct bytes for explicit default Unit. Taquito normalizes them on forge.
  const explicitUnit = `${expected.slice(0, -2)}ff0000000002030b`;
  const checks = {
    changed_amount: [changedAmount, publicKey, managerWatermark],
    explicit_default_unit: [explicitUnit, publicKey, managerWatermark],
    wrong_watermark: [expected, publicKey, Uint8Array.of(0x02)],
    missing_watermark: [expected, publicKey, undefined],
    wrong_public_key: [expected, recipientPublicKey, managerWatermark]
  };
  for (const [name, [bytes, key, watermark]] of Object.entries(checks)) {
    assert.equal(verifySignature(bytes, key, signature, watermark), false, name);
  }

  console.log(JSON.stringify({
    taquito: VERSION,
    protocol: ProtocolsHash.PsUshuai9,
    operation,
    public_key: publicKey,
    unsigned_hex: unsigned,
    watermark_hex: '03',
    signature,
    taquito_verified: true,
    taquito_rejected: Object.keys(checks)
  }));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
