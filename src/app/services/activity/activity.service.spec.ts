// testing framework
import { CommonModule } from '@angular/common';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { fakeAsync, flushMicrotasks, TestBed, tick } from '@angular/core/testing';
import { WalletTools } from '../../../../spec/mocks/library.mock';
import { RouterTestingModule } from '@angular/router/testing';

// class under inspection
import { ActivityService } from './activity.service';
import { ActivityComponent } from '../../components/views/logged-in/account-view/activity/activity.component';

// dependencies
import { WalletService } from '../wallet/wallet.service';
import { MessageService } from '../message/message.service';
import { TranslateService, TranslateModule, TranslateLoader, TranslateFakeLoader } from '@ngx-translate/core';
import { OperationService } from '../operation/operation.service';
import { EncryptionService } from '../encryption/encryption.service';
import { ErrorHandlingService } from '../../services/error-handling/error-handling.service';
import { HttpClientModule } from '@angular/common/http';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { InputValidationService } from '../../services/input-validation/input-validation.service';

import 'rxjs/add/operator/mergeMap';
import { of } from 'rxjs/observable/of';
// import { forEach } from '@angular/router/src/utils/collection';
import { Observable } from 'rxjs/Observable';
import { HttpClient } from '@angular/common/http';
import { RSA_X931_PADDING } from 'constants';
import { CoordinatorService } from '../coordinator/coordinator.service';
import { IndexerService } from '../indexer/indexer.service';
import { TzktService } from '../indexer/tzkt/tzkt.service';
import { LookupService } from '../lookup/lookup.service';
import { SubjectService } from '../subject/subject.service';
import { TokenService } from '../token/token.service';
import { Activity, ImplicitAccount, OpStatus, WatchWallet } from '../wallet/wallet';

describe('[ ActivityService ]', () => {
  let service: ActivityService;
  let walletservice: WalletService;

  const mockLib = new WalletTools();

  //let pkh, blockhash, operationhash;
  //let acctIndex, activIndex;

  beforeEach(() => {
    //create new activity
    TestBed.configureTestingModule({
      imports: [
        HttpClientModule,
        HttpClientTestingModule,
        RouterTestingModule,
        TranslateModule.forRoot({
          loader: {
            provide: TranslateLoader,
            useClass: TranslateFakeLoader
          }
        })
      ],
      providers: [
        ActivityService,
        WalletService,
        MessageService,
        TranslateService,
        OperationService,
        EncryptionService,
        ErrorHandlingService,
        InputValidationService
      ]
    });

    // configure injected services
    service = TestBed.inject(ActivityService);
    walletservice = TestBed.inject(WalletService);

    // generate random wallet
    walletservice.wallet = mockLib.generateWalletV1();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  /*it('should get the transaction counter for given pkh', () => {
		const pkh = walletservice.wallet.accounts[0].pkh;
		const number_operations = [walletservice.wallet.accounts[0].numberOfActivites];

		// spyOn(tzscanservice, 'numberOperations').and.returnValue(Observable.of([number_operations]));
		// spyOn(service, 'getTransactions');

		// service.getTransactonsCounter(pkh); // TODO still need to manage observables

		//expect(service.getTransactions).toHaveBeenCalledWith(pkh, number_operations[0]);
	});*/

  /** TODO
	it('@TODO should get transactions', async() => {
		 // Mocks Required: (External Calls)
		 // tzscan.operations [done]
		 // tzscan.getOp serializer [todo]

		let pkh = 'tz1YyqaeFJFXLx9SSY1mfPrJM7jfoMazd8FK';
		let mockops = mockLib.getOperations();

		let x = mockLib.getOperations();
		let a = mockLib.getOp(x[0], pkh);
		let b = mockLib.getOp(x[1], pkh);
		let c = mockLib.getOp(x[2], pkh);

		await service.updateTransactions(pkh)

		expect(walletservice.wallet.accounts.length).toBe(3);
	})
	*/
});

describe('Activity refresh', () => {
  const address = 'tz1Account';
  let service: ActivityService;
  let wallet: WatchWallet;
  let account: ImplicitAccount;
  let indexer: jasmine.SpyObj<IndexerService>;

  beforeEach(() => {
    wallet = new WatchWallet();
    account = new ImplicitAccount(address, '');
    wallet.implicitAccounts.push(account);
    indexer = jasmine.createSpyObj<IndexerService>('IndexerService', ['accountInfo', 'getOperations']);
    service = new ActivityService(
      { wallet, storeWallet: jasmine.createSpy('storeWallet') } as unknown as WalletService,
      jasmine.createSpyObj<MessageService>('MessageService', ['addSuccess']),
      jasmine.createSpyObj<LookupService>('LookupService', ['check']),
      indexer,
      jasmine.createSpyObj<TokenService>('TokenService', { knownTokenIds: [], searchAllMetadata: undefined, recheckMetadata: undefined }),
      new SubjectService()
    );
  });

  it('fails a stalled refresh and ignores its late account response', fakeAsync(() => {
    let finishAccountInfo: (value: unknown) => void;
    indexer.accountInfo.and.returnValue(new Promise((resolve) => (finishAccountInfo = resolve)));
    const failed = jasmine.createSpy('refresh error');
    service.updateTransactions(address).subscribe({ error: failed });

    expect(service.getActivityState(account)).toBe('loading');
    tick(15000);
    expect(failed).toHaveBeenCalledTimes(1);
    expect(service.getActivityState(account)).toBe('unavailable');
    expect(indexer.accountInfo.calls.mostRecent().args[2].aborted).toBeTrue();

    finishAccountInfo({ counter: '', tokens: [] });
    flushMicrotasks();
    expect(account.activities).toBeNull();
  }));

  it('fails when an operations response is incomplete and preserves the cached history', fakeAsync(() => {
    const cachedActivities: Activity[] = [
      {
        type: 'delegation',
        block: 'block',
        status: OpStatus.CONFIRMED,
        amount: '0',
        source: { address },
        destination: { address: 'tz1Delegate' },
        hash: 'operation',
        timestamp: 0
      }
    ];
    account.activities = cachedActivities;
    account.state = 'previous counter';
    indexer.accountInfo.and.resolveTo({ counter: 'new counter', tokens: [] });
    indexer.getOperations.and.resolveTo({ unknownTokenIds: [] });
    const failed = jasmine.createSpy('refresh error');
    service.updateTransactions(address).subscribe({ error: failed });
    flushMicrotasks();

    expect(failed).toHaveBeenCalledTimes(1);
    expect(account.activities).toBe(cachedActivities);
    expect(account.state).toBe('previous counter');
    expect(service.getActivityState(account)).toBe('stale');
  }));

  it('marks activity unavailable if the provider returns an unexpected operation kind', async () => {
    const provider = new TzktService(new SubjectService());
    const returnedOperations = [{ type: 'proxy-heartbeat', hasInternals: true, target: { address } }];
    spyOn(window, 'fetch').and.returnValues(Promise.resolve(new Response(JSON.stringify(returnedOperations))), Promise.resolve(new Response('[]')));
    indexer.accountInfo.and.resolveTo({ counter: 'counter', tokens: [] });
    indexer.getOperations.and.callFake((...args) => provider.getOperations(...args));

    await expectAsync(service.updateTransactions(address).toPromise()).toBeRejected();
    expect(service.getActivityState(account)).toBe('unavailable');
    expect(account.activities).toBeNull();
  });

  it('confirms empty history only after a successful result and keeps refreshes scoped to each account', fakeAsync(() => {
    const other = new ImplicitAccount('tz1OtherAccount', '');
    wallet.implicitAccounts.push(other);
    let finishAccountInfo: (value: unknown) => void;
    indexer.accountInfo.and.returnValues(
      new Promise((resolve) => (finishAccountInfo = resolve)),
      Promise.resolve({ counter: '', tokens: [] }),
      Promise.resolve({ counter: 'counter', tokens: [] })
    );
    indexer.getOperations.and.resolveTo({ operations: [], unknownTokenIds: [] });

    service.updateTransactions(address).subscribe({ error: () => undefined });
    service.updateTransactions(address).subscribe();
    service.updateTransactions(other.address).subscribe();
    flushMicrotasks();
    expect(indexer.accountInfo.calls.count()).toBe(2);
    expect(service.getActivityState(other)).toBe('empty');
    expect(service.getActivityState(account)).toBe('loading');

    tick(15000);
    expect(service.getActivityState(account)).toBe('unavailable');
    expect(service.getActivityState(other)).toBe('empty');

    service.updateTransactions(address).subscribe();
    expect(service.isRefreshing(account)).toBeTrue();
    flushMicrotasks();
    expect(service.getActivityState(account)).toBe('empty');
    expect(indexer.getOperations).toHaveBeenCalledTimes(1);
    expect(indexer.getOperations.calls.mostRecent().args[0]).toBe(address);

    finishAccountInfo({ counter: 'expired counter', tokens: [] });
    flushMicrotasks();
    expect(account.state).toBe('counter');
  }));

  it('renders a retry after failure and shows a confirmed empty result on the same card', fakeAsync(() => {
    const update = jasmine.createSpy('refresh account').and.callFake((address) => service.updateTransactions(address).subscribe({ error: () => undefined }));
    TestBed.configureTestingModule({
      imports: [CommonModule],
      declarations: [ActivityComponent],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [
        { provide: ActivityService, useValue: service },
        { provide: CoordinatorService, useValue: { update } }
      ]
    });
    const fixture = TestBed.createComponent(ActivityComponent);
    fixture.componentRef.setInput('account', account);
    fixture.detectChanges();
    const panel: HTMLElement = fixture.nativeElement;
    const message = () => panel.querySelector('[role="status"]').textContent.trim();
    expect(message()).toBe('Loading activity...');

    indexer.accountInfo.and.rejectWith(new Error('Unreachable'));
    service.updateTransactions(address).subscribe({ error: () => undefined });
    flushMicrotasks();
    fixture.detectChanges();
    expect(message()).toBe('Recent activity is unavailable.');
    const retry = panel.querySelector('button');
    expect(retry.textContent.trim()).toBe('Retry activity');

    indexer.accountInfo.and.resolveTo({ counter: '', tokens: [] });
    retry.click();
    fixture.detectChanges();
    expect(message()).toBe('Retrying activity...');
    expect(retry.getAttribute('aria-disabled')).toBe('true');
    retry.click();
    expect(update).toHaveBeenCalledOnceWith(address);
    flushMicrotasks();
    fixture.detectChanges();
    expect(message()).toBe('No activity yet');
    expect(panel.querySelector('button')).toBeNull();
  }));
});
