import { Injectable } from '@angular/core';
import { TzktService, MetadataSource } from './tzkt/tzkt.service';
import { WalletObject } from '../wallet/wallet';
import { Asset } from '../token/token.service';

export interface Indexer {
  getContractAddresses(pkh: string): Promise<any>;
  accountInfo(address: string, knownTokenIds: string[], signal?: AbortSignal): Promise<any>;
  getOperations(address: string, knownTokenIds: string[], wallet: WalletObject, signal?: AbortSignal): Promise<any>;
}
@Injectable({
  providedIn: 'root'
})
export class IndexerService {
  constructor(public tzktService: TzktService) {}
  async isUsedAccount(address: string): Promise<boolean> {
    return this.tzktService.isUsedAccount(address);
  }
  async getContractAddresses(address: string): Promise<any> {
    return this.tzktService.getContractAddresses(address);
  }
  async accountInfo(address: string, knownTokenIds: string[] = [], signal?: AbortSignal): Promise<any> {
    return this.tzktService.accountInfo(address, knownTokenIds, signal);
  }
  async getOperations(address: string, knownTokenIds: string[], wallet: WalletObject, signal?: AbortSignal): Promise<any> {
    return this.tzktService.getOperations(address, knownTokenIds, wallet, signal);
  }
  async getTokenMetadata(contractAddress: string, id: string, metadataSource = MetadataSource.Any): Promise<any> {
    return this.tzktService.getTokenMetadata(contractAddress, id, metadataSource);
  }
}
