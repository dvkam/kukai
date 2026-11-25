import { Injectable } from '@angular/core';
import { WalletService } from '../wallet/wallet.service';
import { BehaviorSubject, defer, EMPTY, from, Observable, of } from 'rxjs';
import { delay, finalize, map, switchMap, takeUntil, tap, timeout } from 'rxjs/operators';
import { Activity, Account, OpStatus, Token, WalletObject } from '../wallet/wallet';
import { MessageService } from '../message/message.service';
import { LookupService } from '../lookup/lookup.service';
import { IndexerService } from '../indexer/indexer.service';
import { TokenService } from '../token/token.service';
import { SubjectService } from '../subject/subject.service';

export type ActivityState = 'loading' | 'empty' | 'ready' | 'stale' | 'unavailable';
const ACTIVITY_REFRESH_TIMEOUT_MS = 10000;

interface ActivityRefreshResult {
  upToDate: boolean;
  balance: number;
  delegate: string;
  stakedBalance: number;
  unstakedBalance: number;
  availableBalance: number;
}

@Injectable()
export class ActivityService {
  readonly maxTransactions = 10;
  public tokenBalanceUpdated = new BehaviorSubject(null);
  private readonly failedRefreshes = new WeakSet<Account>();
  private readonly activeRefreshes = new WeakSet<Account>();
  constructor(
    private walletService: WalletService,
    private messageService: MessageService,
    private lookupService: LookupService,
    private indexerService: IndexerService,
    private tokenService: TokenService,
    private subjectService: SubjectService
  ) {}
  getActivityState(account: Account): ActivityState {
    if (this.failedRefreshes.has(account)) {
      return Array.isArray(account.activities) ? 'stale' : 'unavailable';
    }
    if (!Array.isArray(account.activities)) {
      return 'loading';
    }
    return account.activities.length ? 'ready' : 'empty';
  }

  isRefreshing(account: Account): boolean {
    return this.activeRefreshes.has(account);
  }

  updateTransactions(pkh: string): Observable<ActivityRefreshResult> {
    return defer(() => {
      const wallet = this.walletService.wallet;
      const account = wallet?.getAccount(pkh);
      if (!account || this.isRefreshing(account)) {
        return EMPTY;
      }
      const controller = new AbortController();
      this.activeRefreshes.add(account);
      return this.getTransactionsCounter(account, wallet, controller.signal).pipe(
        timeout(ACTIVITY_REFRESH_TIMEOUT_MS),
        tap({
          next: () => this.failedRefreshes.delete(account),
          error: () => this.failedRefreshes.add(account)
        }),
        finalize(() => {
          this.activeRefreshes.delete(account);
          controller.abort();
        })
      );
    });
  }

  private getTransactionsCounter(account: Account, wallet: WalletObject, signal: AbortSignal): Observable<ActivityRefreshResult> {
    return defer(() => this.indexerService.accountInfo(account.address, this.tokenService.knownTokenIds(), signal)).pipe(
      switchMap((data) => {
        if (wallet !== this.walletService.wallet) {
          return EMPTY;
        }
        if (typeof data?.counter !== 'string') {
          throw new Error('Invalid indexer account response');
        }
        const { counter } = data;
        this.tokenService.searchAllMetadata(data.unknownTokenIds ?? []);
        this.tokenService.recheckMetadata(data.tokens);
        const upToDate = account.state === counter && (Array.isArray(account.activities) || !counter);
        const result: ActivityRefreshResult = {
          upToDate,
          balance: data.balance ?? 0,
          delegate: data.delegate ?? '',
          stakedBalance: data.stakedBalance ?? 0,
          unstakedBalance: data.unstakedBalance ?? 0,
          availableBalance: data.availableBalance ?? 0
        };
        if (!upToDate) {
          this.updateTokenBalances(account, data.tokens ?? []);
          return this.getAllTransactions(account, wallet, counter, signal).pipe(map(() => result));
        }
        if (!counter && (!account.activities || !account.tokens)) {
          account.activities ??= [];
          this.updateTokenBalances(account, []);
        }
        return of(result);
      })
    );
  }
  private updateTokenBalances(account: Account, tokens: Token[]): void {
    if (Array.isArray(tokens)) {
      const idsWithBalance: string[] = [];
      if (!tokens.length) {
        account.updateTokenBalance('', '');
      } else {
        for (const token of tokens) {
          idsWithBalance.push(token.tokenId);
          account.updateTokenBalance(token.tokenId, token.balance.toString());
        }
        const currentTokenIds = account.getTokenBalances().map((token) => {
          return token.tokenId;
        });
        for (const tokenId of currentTokenIds) {
          if (!idsWithBalance.includes(tokenId)) {
            account.updateTokenBalance(tokenId, '0');
          }
        }
      }
      this.tokenBalanceUpdated.next(true);
      this.walletService.storeWallet();
    }
  }
  private getAllTransactions(account: Account, wallet: WalletObject, counter: string, signal: AbortSignal): Observable<void> {
    const knownTokenIds = this.tokenService.knownTokenIds();
    return from(this.indexerService.getOperations(account.address, knownTokenIds, wallet, signal)).pipe(
      switchMap((response) => {
        if (wallet !== this.walletService.wallet) {
          return EMPTY;
        }
        if (!Array.isArray(response?.operations)) {
          throw new Error('Invalid indexer activity response');
        }
        const operations: Activity[] = response.operations;
        this.tokenService.searchAllMetadata(response.unknownTokenIds ?? []);
        const oldActivities = account.activities;
        const unconfirmedOps = (oldActivities ?? []).filter(
          (op) => (op.status === OpStatus.UNCONFIRMED || op.status === OpStatus.HALF_CONFIRMED) && !operations.some((incoming) => incoming.hash === op.hash)
        );
        const oldState = account.state;
        account.activities = unconfirmedOps.concat(operations);
        account.state = counter;
        this.walletService.storeWallet();
        if (oldState && oldActivities) {
          this.promptNewActivities(account, oldActivities, operations);
        }
        for (const activity of operations) {
          this.lookupService.check(this.getCounterparty(activity, account, false));
        }
        return of(undefined);
      })
    );
  }
  promptNewActivities(account: Account, oldActivities: Activity[], newActivities: Activity[]) {
    for (const activity of newActivities) {
      const index = oldActivities.findIndex((a) => a.hash === activity.hash && a.status === OpStatus.CONFIRMED);
      if (index === -1) {
        const now = new Date().getTime();
        const timeDiff = now - (activity?.timestamp ? activity.timestamp : now);
        if (timeDiff < 1800000) {
          // 1/2 hour
          if (activity.hash) {
            setTimeout(() => {
              this.subjectService.confirmedOp.next(activity.hash);
            }, 0);
          }
          if (activity.type === 'transaction') {
            if (account.address === activity.source.address) {
              this.messageService.addSuccess(account.shortAddress() + ': Sent ' + this.tokenService.formatAmount(activity.tokenId, activity.amount.toString()));
            }
            if (account.address === activity.destination.address) {
              const ref = activity.tokenId ? Date.now().toString() + activity.tokenId : '';
              this.messageService.addSuccess(
                (account.shortAddress() + ': Received ' + this.tokenService.formatAmount(activity.tokenId, activity.amount.toString())).replace(
                  '[Unknown token]',
                  'Token'
                ),
                undefined,
                ref
              );
              if (activity.tokenId && this.tokenService.getAsset(activity.tokenId) === null) {
                // unknown token
                this.subjectService.metadataUpdated.pipe(takeUntil(of(true).pipe(delay(8000)))).subscribe((token: any) => {
                  // unsub after 8s
                  if (token?.contractAddress && token.id !== undefined) {
                    const tokenId = token.contractAddress + ':' + token.id.toString();
                    if (activity.tokenId === tokenId) {
                      this.messageService.modify(
                        account.shortAddress() + ': Received ' + this.tokenService.formatAmount(activity.tokenId, activity.amount.toString()),
                        ref
                      );
                    }
                  }
                });
              }
            }
          } else if (activity.type === 'delegation') {
            this.messageService.addSuccess(account.shortAddress() + ': Delegate updated');
          } else if (activity.type === 'origination') {
            this.messageService.addSuccess(account.shortAddress() + ': Contract originated');
          } else if (activity.type === 'activation') {
            this.messageService.addSuccess(account.shortAddress() + ': Account activated');
          } else if (activity.type === 'staking') {
            this.messageService.addSuccess(account.shortAddress() + ': Stake updated');
          }
          const counter = this.getCounterparty(activity, account, false);
          if (counter?.address) {
            this.lookupService.check(counter.address, true);
          }
        }
      }
    }
  }
  getCounterparty(transaction: Activity, account: Account, withLookup = true): any {
    let counterParty = { address: '' };
    if (transaction.type === 'delegation') {
      if (transaction.destination) {
        counterParty = transaction.destination;
      } else {
        counterParty = { address: '' }; // User has undelegated
      }
    } else if (transaction.type === 'transaction') {
      if (account.address === transaction.source.address) {
        counterParty = transaction.destination; // to
      } else {
        counterParty = transaction.source; // from
      }
    } else if (transaction.type === 'origination') {
      if (account.address === transaction.source.address) {
        counterParty = transaction.destination ? transaction.destination : { address: '' };
      } else {
        counterParty = transaction.source;
      }
    } else if (transaction.type === 'staking') {
      counterParty = transaction.destination;
    } else {
      counterParty = { address: '' };
    }
    if (withLookup) {
      return this.lookupService.resolve(counterParty);
    } else {
      return counterParty;
    }
  }
}
