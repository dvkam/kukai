// Modified for dvkam: test the current balance update API without network dependencies.
import { BalanceService } from './balance.service';
import { WalletService } from '../wallet/wallet.service';
import { TzrateService } from '../tzrate/tzrate.service';
import { OperationService } from '../operation/operation.service';
import { ImplicitAccount, OriginatedAccount, WatchWallet } from '../wallet/wallet';

describe('[ BalanceService ]', () => {
  let service: BalanceService;
  let walletService: jasmine.SpyObj<WalletService>;
  let tzrateService: jasmine.SpyObj<TzrateService>;
  let account: ImplicitAccount;
  const balances = { balance: 10, stakedBalance: 3, unstakedBalance: 2, availableBalance: 5 };

  beforeEach(() => {
    walletService = jasmine.createSpyObj<WalletService>('WalletService', ['storeWallet']);
    walletService.wallet = new WatchWallet();
    account = new ImplicitAccount('tz1-test-account', 'test-public-key');
    walletService.wallet.implicitAccounts.push(account);
    tzrateService = jasmine.createSpyObj<TzrateService>('TzrateService', ['updateFiatBalances']);
    const operationService = jasmine.createSpyObj<OperationService>('OperationService', ['getBalance']);
    service = new BalanceService(walletService, tzrateService, operationService);
  });

  it('updates account balances, the total, fiat values, and storage', () => {
    service.updateAccountBalance(account, balances);

    expect(account.balanceXTZ).toBe(10);
    expect(account.stakedBalance).toBe(3);
    expect(account.unstakedBalance).toBe(2);
    expect(account.availableBalance).toBe(5);
    expect(walletService.wallet.totalBalanceXTZ).toBe(10);
    expect(tzrateService.updateFiatBalances).toHaveBeenCalledTimes(1);
    expect(walletService.storeWallet).toHaveBeenCalledTimes(1);
  });

  it('does not persist or recalculate unchanged balances', () => {
    service.updateAccountBalance(account, balances);
    walletService.storeWallet.calls.reset();
    tzrateService.updateFiatBalances.calls.reset();

    service.updateAccountBalance(account, { ...balances });

    expect(walletService.storeWallet).not.toHaveBeenCalled();
    expect(tzrateService.updateFiatBalances).not.toHaveBeenCalled();
  });

  it('persists staking changes when the total balance stays the same', () => {
    service.updateAccountBalance(account, balances);
    walletService.storeWallet.calls.reset();

    service.updateAccountBalance(account, { ...balances, stakedBalance: 4, availableBalance: 4 });

    expect(account.stakedBalance).toBe(4);
    expect(account.availableBalance).toBe(4);
    expect(walletService.wallet.totalBalanceXTZ).toBe(10);
    expect(walletService.storeWallet).toHaveBeenCalledTimes(1);
  });

  it('includes originated accounts and ignores unknown balances in the total', () => {
    account.balanceXTZ = 7;
    const originated = new OriginatedAccount('KT1-test-account', account.pkh, account.pk);
    originated.balanceXTZ = 3;
    account.originatedAccounts.push(originated);
    walletService.wallet.implicitAccounts.push(new ImplicitAccount('tz1-unknown', 'test-public-key'));

    service.updateTotalBalance();

    expect(walletService.wallet.totalBalanceXTZ).toBe(10);
  });

  it('keeps the total unknown until an account has a known balance', () => {
    service.updateTotalBalance();
    expect(walletService.wallet.totalBalanceXTZ).toBeNull();

    account.balanceXTZ = 0;
    service.updateTotalBalance();
    expect(walletService.wallet.totalBalanceXTZ).toBe(0);
  });

  it('ignores an absent account', () => {
    service.updateAccountBalance(null, balances);

    expect(walletService.storeWallet).not.toHaveBeenCalled();
    expect(tzrateService.updateFiatBalances).not.toHaveBeenCalled();
  });
});
