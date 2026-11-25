import { TestBed } from '@angular/core/testing';
import { TzktService } from './tzkt.service';
import { storageMock, contractMetadataBigMapMock, tokenMetadataBigMapMock, contractIpfsMock, tokenIpfsMock, expectedResult } from './tzkt.mock';
import { CONSTANTS } from '../../../../environments/environment';
import { WatchWallet } from '../../wallet/wallet';

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

  it('rejects a failed token transfer read even when the native operations list is empty', async () => {
    const fetchResponse = spyOn(window, 'fetch').and.returnValues(Promise.resolve(new Response('[]')), Promise.resolve(new Response('[]', { status: 503 })));
    await expectAsync(service.getOperations('tz1Account', [], new WatchWallet())).toBeRejected();
    expect(fetchResponse).toHaveBeenCalledTimes(2);
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
