import bs58check from 'bs58check';
import { createHash } from 'crypto-browserify';
import { ActivityService } from '../../src/app/services/activity/activity.service';
import { IndexerService } from '../../src/app/services/indexer/indexer.service';
import { MetadataSource, TzktService } from '../../src/app/services/indexer/tzkt/tzkt.service';
import type { LookupService } from '../../src/app/services/lookup/lookup.service';
import type { MessageService } from '../../src/app/services/message/message.service';
import { SubjectService } from '../../src/app/services/subject/subject.service';
import { TokenService } from '../../src/app/services/token/token.service';
import { WalletService } from '../../src/app/services/wallet/wallet.service';
import { CONSTANTS } from '../../src/environments/environment';

function check(condition, message) {
  if (!condition) throw new Error(message);
}

function equal(actual, expected, message) {
  check(JSON.stringify(actual) === JSON.stringify(expected), message);
}

function address(prefix, number) {
  const hash = createHash('sha256').update(`portfolio-fixture:${number}`).digest().subarray(0, 20);
  return bs58check.encode(Buffer.concat([Buffer.from(prefix), hash]));
}

const accountAddress = address([6, 161, 159], 1);
const otherAddress = address([6, 161, 159], 2);
const storageKey = 'kukai-wallet';
const contract = (index) => address([2, 90, 121], index);
const contracts = Array.from({ length: 80 }, (_, index) => contract(index));
const tokenId = (index) => `${contracts[index % 40]}:${Math.floor(index / 40)}`;
const token = (index, balance) => ({ tokenId: tokenId(index), balance: String(balance) });
const compareIds = (left, right) => (left.tokenId < right.tokenId ? -1 : left.tokenId > right.tokenId ? 1 : 0);

function tzktBalance(entry, index) {
  const [contractAddress, id] = entry.tokenId.split(':');
  return {
    id: 1000 + index,
    account: { address: accountAddress },
    token: { id: 2000 + index, contract: { address: contractAddress }, tokenId: id, standard: 'fa2', metadata: { name: `Collectible ${id}`, decimals: '0' } },
    balance: entry.balance,
    firstLevel: 1000,
    lastLevel: 1001,
    transfersCount: 2
  };
}

function catalog(tokens, size, mode) {
  const known = new Set();
  const metadata = { name: 'Collectible', status: 1, decimals: 0, symbol: '', description: '', thumbnailAsset: '', displayAsset: '' };
  const result = { ...CONSTANTS.ASSETS };
  for (const [contractAddress, contract] of Object.entries(CONSTANTS.ASSETS)) {
    for (const id of Object.keys(contract.tokens)) known.add(`${contractAddress}:${id}`);
  }
  const add = (contractAddress, id) => {
    result[contractAddress] ??= { kind: 'FA2', tokens: {}, category: 'NFT' };
    result[contractAddress].tokens[id] = metadata;
    known.add(`${contractAddress}:${id}`);
  };
  for (let index = 0; index < tokens.length; index += mode === 'returning' ? 2 : 10) {
    const [contractAddress, id] = tokens[index].tokenId.split(':');
    add(contractAddress, id);
  }
  const unrelated = mode === 'returning' && size === 1 ? 3000 : size;
  for (let index = 0; index < unrelated; index++) {
    add(contracts[40 + (index % 40)], String(Math.floor(index / 40)));
  }
  return { known, result };
}

function makeScenario(mode, size) {
  const previous = mode === 'returning' ? Array.from({ length: size }, (_, index) => token(index, 1)).reverse() : null;
  const responseTokens = Array.from({ length: size }, (_, index) =>
    token((mode === 'returning' ? Math.floor(size / 5) : 0) + index, index % 3 === 0 ? 2 : 1)
  ).reverse();
  const { known, result } = catalog(responseTokens, size, mode);
  const byId = new Map(responseTokens.map((entry) => [entry.tokenId, entry]));
  const previousIds = new Set(previous?.map((entry) => entry.tokenId));
  const expected = [
    ...responseTokens
      .filter((entry) => !previousIds.has(entry.tokenId))
      .sort(compareIds)
      .reverse(),
    ...(previous ?? []).filter((entry) => byId.has(entry.tokenId)).map((entry) => byId.get(entry.tokenId))
  ];

  return {
    mode,
    size,
    previous,
    metadata: result,
    knownCount: known.size,
    expected,
    responseTokens,
    unknown: responseTokens.filter((entry) => !known.has(entry.tokenId)).map((entry) => entry.tokenId),
    body: JSON.stringify(responseTokens.map(tzktBalance))
  };
}

let active;
const accountBody = JSON.stringify({ address: accountAddress, balance: 9000000, counter: 1234, stakedBalance: 1000000, unstakedBalance: 2000000 });
const nativeOperation = {
  type: 'delegation',
  status: 'applied',
  id: 1234,
  block: 'BLSynthetic',
  hash: 'opSynthetic',
  sender: { address: accountAddress },
  newDelegate: { address: otherAddress },
  timestamp: '2000-01-01T00:00:00Z'
};
const operationsBody = JSON.stringify([nativeOperation]);

globalThis.fetch = async (url, { signal }: RequestInit = {}) => {
  check(active, 'Fetch outside a fixture');
  check(!signal?.aborted, 'Unexpected aborted fixture request');
  const request = new URL(url as string);
  active.requests.push(request.pathname);
  if (request.pathname === '/v1/accounts/' + accountAddress) return new Response(accountBody);
  if (request.pathname === '/v1/tokens/balances') {
    check(request.searchParams.get('account') === accountAddress, 'Wrong portfolio request');
    check(request.searchParams.get('balance.ne') === '0', 'Wrong balance filter');
    return new Response(active.scenario.body);
  }
  if (request.pathname === '/v1/accounts/' + accountAddress + '/operations') return new Response(operationsBody);
  if (request.pathname === '/v1/tokens/transfers') return new Response('[]');
  throw new Error('Unexpected request ' + request.pathname);
};

function makeTracker(scenario) {
  const requests = [];
  active = { scenario, requests };
  const subject = new SubjectService();
  const wallet = new WalletService(null, null, null, subject);
  const other = [{ tokenId: tokenId(400000), balance: '45' }];
  wallet.deserializeStoredWallet(
    {
      implicitAccounts: [
        {
          pkh: accountAddress,
          pk: '',
          originatedAccounts: [],
          state: scenario.previous ? 'cached' : '',
          tokens: scenario.previous === null ? null : scenario.previous.map((entry) => ({ ...entry })),
          activities: scenario.previous ? [] : null
        },
        { pkh: otherAddress, pk: '', originatedAccounts: [], state: 'other', tokens: other.map((entry) => ({ ...entry })), activities: [] }
      ]
    },
    'WatchWallet'
  );
  wallet.initStorage();
  const provider = new TzktService(subject);
  const indexer = new IndexerService(provider);
  const metadataRequests = [];
  const metadata = Object.create(TokenService.prototype);
  metadata.contracts = scenario.metadata;
  metadata.searchAllMetadata = (ids) => metadataRequests.push(ids);
  const activity = new ActivityService(wallet, {} as MessageService, { check() {} } as unknown as LookupService, indexer, metadata, subject);
  let balanceUpdates = 0;
  let walletUpdates = 0;
  activity.tokenBalanceUpdated.subscribe((state) => {
    if (state) balanceUpdates++;
  });
  subject.walletUpdated.subscribe(() => walletUpdates++);
  return {
    requests,
    wallet,
    subject,
    metadataRequests,
    provider,
    activity,
    other,
    metadata,
    indexer,
    counts: () => [balanceUpdates, walletUpdates - 1]
  };
}

function verify(tracker, scenario, result) {
  check(result?.upToDate === false, 'Refresh did not update');
  equal(
    [result.balance, result.stakedBalance, result.unstakedBalance, result.availableBalance],
    [9000000, 1000000, 2000000, 6000000],
    'Native balances changed'
  );
  equal(tracker.wallet.wallet.getAccount(accountAddress).tokens, scenario.expected, 'Token amount, visibility or order changed');
  equal(tracker.wallet.wallet.getAccount(otherAddress).tokens, tracker.other, 'Other account tokens changed');
  const rawWallet = JSON.parse(localStorage.getItem(storageKey));
  check(rawWallet.type === 'WatchWallet' && rawWallet.localStorageId > 0, 'Wallet did not serialize');
  const [saved, other] = rawWallet.data.implicitAccounts;
  equal(saved.tokens, scenario.expected, 'Persisted tokens changed');
  check(/^[0-9a-f]{128}$/.test(saved.state) && saved.activities[0]?.hash === nativeOperation.hash, 'Activity did not complete');
  equal(other.tokens, tracker.other, 'Other persisted account changed');
  equal(tracker.metadataRequests, [scenario.unknown, []], 'Metadata requests changed');
  equal(tracker.counts(), [1, 2], 'Balance or wallet publication changed');
  equal(
    tracker.requests,
    ['/v1/accounts/' + accountAddress, '/v1/tokens/balances', '/v1/accounts/' + accountAddress + '/operations', '/v1/tokens/transfers'],
    'Provider calls changed'
  );
  const first = scenario.responseTokens[0];
  const metadata = tracker.provider.tokenBalanceCache[first.tokenId];
  check(metadata?.token?.metadata?.name && metadata.balance === first.balance, 'Provider metadata cache changed');
}

async function sample(tracker, mark) {
  if (mark) performance.mark('portfolio-refresh-start');
  const start = performance.now();
  const result = await tracker.activity.updateTransactions(accountAddress).toPromise();
  const duration = performance.now() - start;
  if (mark) {
    performance.mark('portfolio-refresh-end');
    performance.measure('portfolio-refresh', 'portfolio-refresh-start', 'portfolio-refresh-end');
  }
  return { duration, result };
}

async function run(mode, size, count, mark = false) {
  const scenario = makeScenario(mode, size);
  const samplesMs = [];
  const failures = [];
  for (let index = 0; index < count; index++) {
    try {
      const tracker = makeTracker(scenario);
      const { duration, result } = await sample(tracker, mark);
      verify(tracker, scenario, result);
      samplesMs.push(Number(duration.toFixed(3)));
    } catch (error) {
      failures.push({ index, message: error.message });
    }
  }
  return { mode, size, knownCount: scenario.knownCount, attempts: count, samplesMs, failures };
}

async function controls() {
  const scenario = makeScenario('returning', 10);
  const tracker = makeTracker(scenario);
  const first = await sample(tracker, false);
  verify(tracker, scenario, first.result);
  const same = await sample(tracker, false);
  check(same.result?.upToDate === true, 'Unchanged refresh did not use persisted counter');
  equal(tracker.counts(), [1, 2], 'Unchanged refresh rewrote balances');

  const change = { ...scenario, body: '[]' };
  const emptied = makeTracker(change);
  const empty = await sample(emptied, false);
  check(empty.result && emptied.wallet.wallet.getAccount(accountAddress).tokens.length === 0, 'Empty refresh did not remove stale tokens');
  equal(emptied.wallet.wallet.getAccount(otherAddress).tokens, emptied.other, 'Empty refresh changed a different account');

  const existing = [{ tokenId: 'legacy-id', balance: '2' }, token(100, 5), token(101, 5), token(102, 5)];
  const mixed = makeTracker({ ...scenario, previous: existing });
  mixed.indexer.accountInfo = async () => ({
    counter: 'mixed',
    unknownTokenIds: [],
    tokens: [
      token(100, 0),
      token(101, -1),
      { tokenId: 'legacy-id', balance: '7' },
      { tokenId: 'unknown-short-id', balance: '8' },
      token(104, 10),
      token(103, 1),
      token(103, 2),
      token(105, 0),
      token(106, -1)
    ]
  });
  await sample(mixed, false);
  const mixedExpected = [token(103, 2), token(104, 10), { tokenId: 'legacy-id', balance: '7' }];
  equal(mixed.wallet.wallet.getAccount(accountAddress).tokens, mixedExpected, 'Legacy, new, zero, negative, duplicate or stale balances changed');
  equal(JSON.parse(localStorage.getItem(storageKey)).data.implicitAccounts[0].tokens, mixedExpected, 'Mixed balances did not persist');

  const matched = token(80, 1);
  const unrecognized = token(81, 2);
  const duplicate = token(81, 3);
  const duplicateFixture = makeTracker({
    ...scenario,
    body: JSON.stringify([unrecognized, matched, duplicate].map(tzktBalance))
  });
  const info = await duplicateFixture.provider.accountInfo(accountAddress, [matched.tokenId, matched.tokenId]);
  equal(info.unknownTokenIds, [unrecognized.tokenId, duplicate.tokenId], 'Provider changed duplicate unknown metadata IDs or list order');
  equal(info.tokens, [matched, unrecognized, duplicate].sort(compareIds), 'Provider changed duplicate response tokens or balance order');
  check(duplicateFixture.provider.tokenBalanceCache[duplicate.tokenId].balance === '3', 'Provider changed the latest cached balance row');
  const duplicateMetadata = await duplicateFixture.provider.getTokenMetadata(contracts[1], '2', MetadataSource.TzktOnly);
  check(duplicateMetadata?.name === 'Collectible 2', 'Provider did not reuse cached duplicate metadata');
  return { unchanged: true, empty: true, legacy: true, zero: true, negative: true, duplicate: true, accountScoped: true, persisted: true };
}

globalThis.portfolioFixture = { run, controls };
