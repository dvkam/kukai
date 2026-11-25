import { TestBed } from '@angular/core/testing';
import { TzktService } from './tzkt.service';
import { storageMock, contractMetadataBigMapMock, tokenMetadataBigMapMock, contractIpfsMock, tokenIpfsMock, expectedResult } from './tzkt.mock';
import { CONSTANTS } from '../../../../environments/environment';
import { ImplicitAccount, WatchWallet } from '../../wallet/wallet';

describe('TzktService', () => {
  let service: TzktService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TzktService);
  });

  it('distinguishes an unindexed account from a failed account request', async () => {
    const fetchResponse = spyOn(window, 'fetch').and.resolveTo(new Response(null, { status: 204 }));
    await expectAsync(service.accountInfo('tz1Account', [])).toBeResolvedTo({ counter: '', tokens: [] });

    fetchResponse.and.resolveTo(new Response(JSON.stringify({ message: 'Service unavailable' }), { status: 503 }));
    await expectAsync(service.accountInfo('tz1Account', [])).toBeRejected();
    expect(fetchResponse).toHaveBeenCalledTimes(2);
  });

  it('preserves unknown token order and duplicates when checking known metadata', async () => {
    const address = 'tz1Account';
    const contract = 'KT1TokenContract';
    const row = (tokenId: string, balance: string) => ({ token: { contract: { address: contract }, tokenId }, balance });
    const balances = [row('2', '1'), row('0', '3'), row('1', '5'), row('2', '8')];
    spyOn(window, 'fetch').and.returnValues(Promise.resolve(Response.json({ address, balance: 10, counter: 1 })), Promise.resolve(Response.json(balances)));

    const known = `${contract}:0`;
    const result = await service.accountInfo(address, [known, known]);

    expect(result.unknownTokenIds).toEqual([`${contract}:2`, `${contract}:1`, `${contract}:2`]);
    expect(result.tokens).toEqual([
      { tokenId: known, balance: '3' },
      { tokenId: `${contract}:1`, balance: '5' },
      { tokenId: `${contract}:2`, balance: '1' },
      { tokenId: `${contract}:2`, balance: '8' }
    ]);
  });

  it('rejects a failed token transfer read even when the native operations list is empty', async () => {
    const fetchResponse = spyOn(window, 'fetch').and.returnValues(Promise.resolve(new Response('[]')), Promise.resolve(new Response('[]', { status: 503 })));
    await expectAsync(service.getOperations('tz1Account', [], new WatchWallet())).toBeRejected();
    expect(fetchResponse).toHaveBeenCalledTimes(2);
  });

  it('returns empty activity for valid operation kinds intentionally filtered by the wallet', async () => {
    const address = 'tz1Account';
    const wallet = new WatchWallet();
    wallet.implicitAccounts.push(new ImplicitAccount(address, ''));
    const returnedOperations = [
      { type: 'transaction', hasInternals: true, target: { address } },
      { type: 'delegation', sender: { address: 'tz1Other' } }
    ];
    spyOn(window, 'fetch').and.returnValues(Promise.resolve(new Response(JSON.stringify(returnedOperations))), Promise.resolve(new Response('[]')));

    await expectAsync(service.getOperations(address, [], wallet)).toBeResolvedTo({ operations: [], unknownTokenIds: [] });
  });

  it('should return token metadata', async () => {
    const contractAddress = 'KT1RhzBigSQWQkEZQpNSyi4abTFm5fpMyihH';
    const bigMapId = { contract: 26006, token: 26009 };
    const tokenCloudUrl = 'https://ipfs.io/ipfs/QmZDycNwSy12vueaPnxuCMFUCHeQieT5wA5yNwqswwFn3V';
    const contractCloudUrl = 'https://ipfs.io/ipfs/QmVBdYhUXmF3QSRSYgoZfvUhLKgW4oCWC6xMzvHzV5TFVA';
    // spyOn(service, 'fetchApi')
    //   .withArgs(`${service.bcd}/contract/${CONSTANTS.NETWORK}/${contractAddress}/storage`)
    //   .and.callFake(async () => JSON.parse(storageMock))
    //   .withArgs(`${service.bcd}/bigmap/${CONSTANTS.NETWORK}/${bigMapId.token}/keys?size=1000`)
    //   .and.callFake(async function () {
    //     return JSON.parse(tokenMetadataBigMapMock);
    //   })
    //   .withArgs(`${service.bcd}/bigmap/${CONSTANTS.NETWORK}/${bigMapId.contract}/keys`)
    //   .and.callFake(async function () {
    //     return JSON.parse(contractMetadataBigMapMock);
    //   })
    //   .withArgs(tokenCloudUrl)
    //   .and.callFake(async function () {
    //     return JSON.parse(tokenIpfsMock);
    //   })
    //   .withArgs(contractCloudUrl)
    //   .and.callFake(async function () {
    //     return JSON.parse(contractIpfsMock);
    //   });
    // expect(await service.getBigMapIds(contractAddress)).toEqual(bigMapId);
    // expect(await service.getTokenMetadataDepricated(contractAddress, 0)).toEqual(expectedResult);
  });
});
