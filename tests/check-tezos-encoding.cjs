const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const { createHash } = require('node:crypto');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const { test } = require('node:test');
const { parseArgs } = require('node:util');
const { LocalForger, ProtocolsHash, VERSION, localForger } = require('@taquito/local-forging');
const reference = require('../experiments/tezos-encoding/references.json');
const synthetic = require('../experiments/tezos-encoding/synthetic.json');

const { values: options } = parseArgs({
  options: {
    'octez-source': { type: 'string' },
    'octez-codec': { type: 'string' }
  }
});
const profiles = {
  Rio: new LocalForger(ProtocolsHash.PsRiotuma),
  Seoul: new LocalForger(ProtocolsHash.PtSeouLou),
  U025: new LocalForger(ProtocolsHash.PsUshuai9),
  'wallet modal default': localForger
};

function assertSha256(bytes, expected, label) {
  assert.equal(createHash('sha256').update(bytes).digest('hex'), expected, label);
}

function loadOctezCodec(path) {
  assert.ok(path, '--octez-codec requires a path to the pinned executable');
  const executable = resolve(path);
  assertSha256(readFileSync(executable), reference.octez.codecSha256, 'Octez codec artifact SHA-256');
  const command = (args) => execFileSync(executable, args, {
    encoding: 'utf8',
    env: {},
    stdio: ['ignore', 'pipe', 'pipe'],
    timeout: 45_000
  }).trim();
  assert.equal(command(['--version']).split(' ')[0], reference.octez.commit.slice(0, 8), 'Octez codec revision');
  return command;
}

const octez = options['octez-codec'] === undefined ? null : loadOctezCodec(options['octez-codec']);

function encodeOctez(operation) {
  return octez(['encode', reference.octez.encoding, 'from', JSON.stringify(operation)]);
}

function decodeOctez(hex) {
  return JSON.parse(octez(['decode', reference.octez.encoding, 'from', hex]));
}

function loadUpstreamCases(source) {
  assert.ok(source, '--octez-source requires a path to an Octez Git checkout');
  function readPinned(path, sha256) {
    const bytes = execFileSync('git', ['show', `${reference.octez.commit}:${path}`], { cwd: source, timeout: 10_000 });
    assertSha256(bytes, sha256, path);
    return bytes.toString('utf8');
  }

  const snapshotPath = 'tezt/tests/expected/encoding.ml/U025-- protocol encoding regression test- operation.unsigned.out';
  const lines = readPinned(snapshotPath, reference.octez.snapshotSha256).split('\n');
  return Object.entries(reference.octez.sampleSha256).map(([name, sha256]) => {
    const sample = `operation.unsigned-${name}`;
    const samplePath = `tezt/tests/encoding_samples/u025/operation.unsigned/${sample}.sample.json`;
    const operation = JSON.parse(readPinned(samplePath, sha256));
    const prefix = `${sample}: `;
    const rows = lines.filter((line) => line.startsWith(prefix));
    assert.equal(rows.length, 1, `one Octez regression row for ${sample}`);
    return { name: `Octez U025 sample ${name}`, operation, expected: rows[0].slice(prefix.length) };
  });
}

test('installed Taquito release and source revision match the evidence', () => {
  assert.equal(VERSION.version, reference.taquito.version);
  assert.equal(VERSION.commitHash, reference.taquito.commitHash);
});

function syntheticTransfer(fields) {
  return { branch: synthetic.branch, contents: [{ ...synthetic.transaction, ...fields }] };
}

const upstreamCases = options['octez-source'] === undefined ? [] : loadUpstreamCases(options['octez-source']);
const syntheticCases = Object.entries(synthetic.destinations).map(([type, { destination, expected }]) => ({
  name: `synthetic tz1 to ${type} transfer`,
  operation: syntheticTransfer({ destination }),
  expected
}));
for (const { name, operation, expected } of [...syntheticCases, ...upstreamCases]) {
  test(name, async (context) => {
    assert.match(expected, /^(?:[0-9a-f]{2})+$/);
    if (octez) {
      await context.test('pinned Octez encodes and decodes the expected bytes', () => {
        assert.equal(encodeOctez(operation), expected);
        assert.deepEqual(decodeOctez(expected), operation);
      });
    }
    for (const [profile, forger] of Object.entries(profiles)) {
      await context.test(`${profile} forges, parses and reforges the expected bytes`, async () => {
        assert.equal(await forger.forge(operation), expected);
        const parsed = await forger.parse(expected);
        assert.deepEqual(parsed, operation);
        assert.equal(await forger.forge(parsed), expected);
      });
    }
  });
}

const { destination, expected: transferHex } = synthetic.destinations.tz1;
const transfer = syntheticTransfer({ destination });

test('changing the amount changes the bytes in every Taquito profile', async () => {
  const operation = syntheticTransfer({ destination, amount: '1000001' });
  for (const [profile, forger] of Object.entries(profiles)) {
    const bytes = await forger.forge(operation);
    assert.notEqual(bytes, transferHex, profile);
    assert.deepEqual(await forger.parse(bytes), operation, profile);
  }
});

test('Taquito refuses missing amount and a transfer truncated at the parameter flag', async () => {
  const operation = structuredClone(transfer);
  delete operation.contents[0].amount;
  for (const [profile, forger] of Object.entries(profiles)) {
    await assert.rejects(async () => forger.forge(operation), { name: 'InvalidOperationSchemaError' }, profile);
    await assert.rejects(async () => forger.parse(transferHex.slice(0, -2)), Error, profile);
  }
});

const paddedAmount = syntheticTransfer({ destination, amount: `0${synthetic.transaction.amount}` });
const parameters = { entrypoint: 'default', value: { prim: 'Unit' } };
const explicitUnit = syntheticTransfer({ destination, parameters });
// Replace the absent-parameters flag with present, default entrypoint, and sized Micheline Unit.
const explicitUnitHex = `${transferHex.slice(0, -2)}ff0000000002030b`;

test('Taquito normalizes on forge and preserves explicit default Unit on parse', async () => {
  for (const [profile, forger] of Object.entries(profiles)) {
    assert.equal(await forger.forge(paddedAmount), transferHex, profile);
    assert.deepEqual(await forger.parse(explicitUnitHex), explicitUnit, profile);
    assert.equal(await forger.forge(explicitUnit), transferHex, profile);
  }
});

if (octez) {
  test('pinned Octez refuses a transfer truncated at the parameter flag', () => {
    assert.throws(() => decodeOctez(transferHex.slice(0, -2)), {
      status: 1,
      stderr: /Cannot parse the binary with the given encoding/
    });
  });

  test('pinned Octez drops explicit default Unit on decode and normalizes it on encode', () => {
    assert.equal(encodeOctez(paddedAmount), transferHex);
    assert.deepEqual(decodeOctez(explicitUnitHex), transfer);
    assert.equal(encodeOctez(explicitUnit), transferHex);
  });
}
