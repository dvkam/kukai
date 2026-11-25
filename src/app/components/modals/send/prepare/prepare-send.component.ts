import { ChangeDetectorRef, Component, OnInit, Input, ViewChild, ElementRef, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationStart, Router } from '@angular/router';
import { filter } from 'rxjs/operators';
import { TokenService } from '../../../../services/token/token.service';
import { EstimateService } from '../../../../services/estimate/estimate.service';
import { DefaultTransactionParams } from '../../../../interfaces';
import { FullyPreparedTransaction, PartiallyPreparedTransaction, PrepareRequest } from '../../../misc/send/interfaces';
import { Account, ImplicitAccount, OriginatedAccount } from '../../../../services/wallet/wallet';
import { TorusService } from '../../../../services/torus/torus.service';
import Big from 'big.js';
import { TranslateService } from '@ngx-translate/core';
import { WalletService } from '../../../../services/wallet/wallet.service';
import { InputValidationService } from '../../../../services/input-validation/input-validation.service';
import assert from 'assert';
import { TezosDomainsService } from '../../../../services/tezos-domains/tezos-domains.service';
import { InvokedDialog } from '../../invoked-dialog';
import { ModalComponent } from '../../modal.component';
import { TokenBalancesService } from '../../../../services/token-balances/token-balances.service';

const zeroTxParams: DefaultTransactionParams = {
  gas: 0,
  storage: 0,
  fee: 0,
  burn: 0
};

type DraftField = 'recipient' | 'amount' | 'batch' | 'fee' | 'gas' | 'storage';

class DraftFieldError extends Error {
  constructor(readonly field: DraftField, message: string) {
    super(message);
  }
}

function assertDraftField(condition: unknown, field: DraftField, message: string): asserts condition {
  if (!condition) throw new DraftFieldError(field, message);
}

@Component({
  selector: 'app-prepare-send',
  templateUrl: './prepare-send.component.html',
  styleUrls: ['../../../../../scss/components/modals/modal.scss', '../../../../../scss/components/modals/prepare-send-dialog.scss']
})
export class PrepareSendComponent extends ModalComponent implements OnInit, OnChanges {
  @Input() prepareRequest: PrepareRequest = null;
  @Output() prepareResponse = new EventEmitter();
  @ViewChild('destType') public destType: ElementRef;
  @ViewChild('dialog', { static: true }) private dialog: ElementRef<HTMLDialogElement>;
  @ViewChild('content') private content: ElementRef<HTMLElement>;
  @ViewChild('recipient') private recipient: ElementRef<HTMLInputElement>;
  private invokedDialog?: InvokedDialog;
  activeAccount: Account = null;
  tokenTransfer: string = null;
  token = null;
  storageCostPerByte: string = this.estimateService.storageCostPerByte;

  defaultTransactionParams: DefaultTransactionParams = zeroTxParams;
  active = false;
  isMultipleDestinations = false;
  advancedForm = false;
  hideAmount = false;
  simSemaphore = 0;
  isNFT = false;
  accountDropdownIsOpen = false;

  torusVerifierName = 'Tezos Address';
  torusVerifier = '';
  torusLookupId = '';
  torusLookupAddress = '';
  torusTwitterId = '';
  torusPendingLookup = false;
  torusLastLookup = '';

  transactions = [];
  toMultipleDestinationsString = '';

  formInvalid = '';
  invalidField: DraftField | null = null;
  latestSimError = '';
  prevEquiClass = '';

  sendMax = null;

  amount = '';
  toPkh = '';
  customFee = '';
  customGasLimit = '';
  customStorageLimit = '';

  name = 'prepare-send';

  constructor(
    private tokenService: TokenService,
    private estimateService: EstimateService,
    public torusService: TorusService,
    private translate: TranslateService,
    private walletService: WalletService,
    public tezosDomains: TezosDomainsService,
    private inputValidationService: InputValidationService,
    private tokenBalancesService: TokenBalancesService,
    private changeDetector: ChangeDetectorRef,
    router: Router
  ) {
    super();
    router.events
      .pipe(
        filter((event) => event instanceof NavigationStart),
        takeUntilDestroyed()
      )
      .subscribe(() => this.closeModalAction(false));
  }

  ngOnInit(): void {}
  ngOnChanges(changes: SimpleChanges): void {
    if (changes?.prepareRequest?.currentValue) {
      this.reset(true);
      this.tokenTransfer = changes.prepareRequest.currentValue.tokenTransfer ?? null;
      this.token = this.tokenService.getAsset(this.tokenTransfer);
      this.isNFT = this.tokenBalancesService.isNFT(this.token);
      this.activeAccount = changes.prepareRequest.currentValue.account;
      this.amount = !this.token || !(this.token?.isBooleanAmount || this.token?.balance == 1) ? '' : '1';
      if (!this.isOpen) {
        this.openModal();
      }
    }
  }
  openModal() {
    ModalComponent.currentModel.next({ name: this.name, data: null });
    this.estimateService.preLoadData(this.activeAccount.pkh, this.activeAccount.pk);
  }

  override open(): void {
    this.isOpen = true;
    this.changeDetector.detectChanges();
    const dialog = this.dialog.nativeElement;
    const invocation = this.prepareRequest?.invocation;
    if (invocation) {
      // Only draft dismissal restores the Send focus. Preview and route changes move it elsewhere.
      const active = dialog.ownerDocument.activeElement;
      if (active instanceof HTMLElement) active.blur();
      this.invokedDialog = new InvokedDialog(dialog, this.content.nativeElement);
      this.invokedDialog.open(invocation);
    } else {
      dialog.inert = false;
      dialog.showModal();
    }
  }

  override close(restoreFocus = false): void {
    if (!this.isOpen) return;
    this.isOpen = false;
    this.reset();
    // Clear recipient, fees and scanner content before the dialog leaves the top layer.
    this.changeDetector.detectChanges();
    this.closeDialog(restoreFocus);
  }

  override ngOnDestroy(): void {
    this.isOpen = false;
    this.reset();
    this.closeDialog();
    super.ngOnDestroy();
  }

  private closeDialog(restoreFocus = false): void {
    if (this.invokedDialog) {
      this.invokedDialog.close({ restoreFocus });
      this.invokedDialog = undefined;
    } else {
      this.dialog?.nativeElement.close();
    }
  }

  cancel(event: Event): void {
    event.preventDefault();
    this.closeModalAction();
  }

  wrapFocus(event: KeyboardEvent): void {
    const dialog = this.dialog.nativeElement;
    const active = event.target as HTMLElement;
    if (active.closest('dialog') !== dialog) return;
    const controls = Array.from(dialog.querySelectorAll<HTMLElement>('button, input, textarea, a[href], [tabindex]')).filter(
      (element) => element.tabIndex >= 0 && !element.matches(':disabled') && !element.closest('[inert]') && element.getClientRects().length
    );
    const boundary = event.shiftKey ? controls[0] : controls.at(-1);
    if (active === boundary) {
      event.preventDefault();
      (event.shiftKey ? controls.at(-1) : controls[0])?.focus();
    }
  }

  closeModalAction(restoreFocus = true): void {
    if (!this.isOpen) return;
    this.close(restoreFocus);
    this.prepareResponse.emit(null);
    if (ModalComponent.currentModel.value.name === this.name) {
      ModalComponent.currentModel.next({ name: '', data: null });
    }
  }

  clearFieldError(field: DraftField): void {
    if (this.invalidField === field) {
      this.invalidField = null;
      this.formInvalid = '';
    }
  }

  reset(init = false) {
    if (!init) {
      this.prepareRequest = null;
    }

    this.defaultTransactionParams = zeroTxParams;
    this.active = false;
    this.isMultipleDestinations = false;
    this.advancedForm = false;
    this.hideAmount = false;
    this.simSemaphore = 0;

    this.tokenTransfer = null;
    this.token = null;
    this.isNFT = null;
    this.accountDropdownIsOpen = false;

    this.transactions = [];
    this.toMultipleDestinationsString = '';

    this.formInvalid = '';
    this.invalidField = null;
    this.latestSimError = '';
    this.prevEquiClass = '';
    this.torusVerifierName = 'Tezos Address';
    this.torusVerifier = '';

    this.sendMax = null;

    this.amount = '';
    this.toPkh = '';
    this.customFee = '';
    this.customGasLimit = '';
    this.customStorageLimit = '';
    this.clearTorus();
  }
  getTitle(): string {
    return `Send ${this.getAssetName(true)}`;
  }
  getAssetName(short = true): string {
    if (this.tokenTransfer) {
      return this.token?.symbol ?? this.token?.name ?? 'Unknown';
    } else {
      return !this.prepareRequest.symbol ? 'tez' : this.prepareRequest.symbol;
    }
  }
  getTotalAmount(): string {
    let totalSent = Big(0);
    for (const tx of this.transactions) {
      totalSent = totalSent.add(tx.amount);
    }
    return totalSent.toFixed();
  }
  getTotalCost(display: boolean = false): number | string {
    const totalFee = Big(this.getTotalFee()).plus(Big(this.getTotalBurn())).toString();
    if (display && totalFee === '0') {
      return '-';
    }
    return Number(totalFee);
  }
  getTotalFee(): number {
    if (this.customFee !== '' && (Number(this.customFee) || this.customFee === '0')) {
      return Number(this.customFee);
    }
    return Number(this.defaultTransactionParams.fee);
  }
  getTotalBurn(): number {
    if (this.customStorageLimit !== '' && Number(this.customStorageLimit)) {
      return Number(Big(this.customStorageLimit).mul(this.transactions.length).times(this.storageCostPerByte).div(1000000).toString());
    }
    return this.defaultTransactionParams.burn;
  }
  burnAmount(): string {
    const burn = this.customStorageLimit
      ? Number(Big(this.customStorageLimit).times(this.storageCostPerByte).div(1000000))
      : this.defaultTransactionParams.burn;
    if (burn) {
      return burn + ' tez';
    }
    return '';
  }
  amountChange(): void {
    this.estimateFees();
  }
  async estimateFees(): Promise<void> {
    console.log('estimate..');
    const prevSimError = this.latestSimError;
    this.latestSimError = '';
    let txs: PartiallyPreparedTransaction[] = [];
    try {
      txs = this.getMinimalPreparedTxs();
      this.transactions = txs;
    } catch (e) {
      console.log(e);
    }
    if (txs?.length) {
      const equiClass = this.equiClass(this.activeAccount.address, txs);
      if (this.prevEquiClass !== equiClass || (this.tokenTransfer && this.checkBalance())) {
        this.latestSimError = '';
        this.prevEquiClass = equiClass;
        this.simSemaphore++; // Put lock on 'Preview and 'Send max'
        const request = this.prepareRequest;
        const callback = (res) => {
          if (!this.isOpen || this.prepareRequest !== request) return;
          if (res) {
            if (res.error) {
              this.invalidField = null;
              this.formInvalid = res.error.message;
              this.latestSimError = res.error.message;
            } else {
              this.defaultTransactionParams = res;
              this.formInvalid = '';
              this.invalidField = null;
              this.latestSimError = '';
              this.updateMaxAmount();
            }
          } else {
            console.log('no res');
          }
          this.simSemaphore--;
        };
        this.estimateService.estimateTransactions(JSON.parse(JSON.stringify(txs)), this.activeAccount.address, this.tokenTransfer, callback);
      } else {
        this.latestSimError = prevSimError;
        if (!this.invalidField) this.formInvalid = this.latestSimError;
      }
    } else {
      this.latestSimError = prevSimError;
      if (this.isMultipleDestinations ? !this.toMultipleDestinationsString : !this.toPkh) {
        this.defaultTransactionParams = zeroTxParams;
        this.updateMaxAmount();
        this.prevEquiClass = '';
      }
    }
  }
  equiClass(sender: string, transactions: any): string {
    let data = sender;
    if (this.tokenTransfer) {
      data += transactions[0].to + transactions[0].amount.toString();
    } else {
      for (const tx of transactions) {
        if (tx?.to) {
          data += tx.to;
        } else if (tx?.meta) {
          data += `${tx.meta.verifier}:${tx.meta.alias}`;
        }
      }
    }
    return data;
  }
  /*
    1. input validation
      strict checks that
    2. create basic transaction array
  */
  sanitizeNumberInput(e, type = ''): void {
    if (['gas', 'storage'].includes(type) || (type === 'amount' && this.token?.decimals == 0)) {
      e.target.value = e.target.value.replace(/[^0-9]/g, '');
    } else {
      e.target.value = e.target.value.replace(/[^0-9\.]/g, '');
      if ((e.target.value.match(/\./g) || []).length > 1) {
        const tmp = e.target.value.split('');
        tmp.splice(tmp.lastIndexOf('.'), 1);
        e.target.value = tmp.join('');
      }
      if (e.target.value.charAt(0) === '.') {
        e.target.value = '0' + e.target.value;
      }
    }
  }
  updateDefaultValues(ev?: any): void {
    const val = ev?.target.value.trim();
    if (val && !this.torusVerifier) {
      if (this.inputValidationService.twitterAccount(val)) {
        this.torusVerifier = 'twitter';
        this.torusVerifierName = 'Twitter';
      } else if (!this.tezosDomains.unsupportedNetwork && this.inputValidationService.tezosDomain(val)) {
        this.torusVerifier = 'domain';
        this.torusVerifierName = 'Tezos Domains';
      }
      ev.target.value = ev.target.value.trim();
    }

    if (!this.torusVerifier) {
      this.estimateFees();
      if (this.isMultipleDestinations) {
        this.amount = this.getTotalAmount();
      }
    } else {
      this.verifierChange();
    }
  }
  toPkhChange(): void {
    if (this.torusVerifier && (this.torusLastLookup !== `${this.torusVerifier}:${this.toPkh}` || this.torusPendingLookup)) {
      this.torusLookup();
    }
  }
  // Will return PartiallyPreparedTransaction or throw an error
  getMinimalPreparedTxs(finalCheck = false): PartiallyPreparedTransaction[] {
    if (!this.isMultipleDestinations) {
      if (this.torusVerifier) {
        assertDraftField(!this.invalidTorusAccount(), 'recipient', this.invalidTorusAccount());
        assert(this.torusReady(), 'Pending lookup');
        this.checkTx(this.torusLookupAddress, this.amount, finalCheck);
        const meta: any = {
          verifier: this.torusVerifier,
          alias: this.torusLookupId
        };
        if (this.torusTwitterId) {
          meta.twitterId = this.torusTwitterId;
        }
        return [
          {
            kind: 'transaction',
            destination: this.torusLookupAddress,
            amount: this.amount ? this.amount : '0',
            meta
          }
        ];
      } else {
        this.checkTx(this.toPkh, this.amount, finalCheck);
      }
      return [
        {
          kind: 'transaction',
          destination: this.toPkh,
          amount: this.amount ? this.amount : '0'
        }
      ];
      //this.checkGasStorageFee();
    } else {
      return this.getBatch(finalCheck);
      //assert(false, 'not supported yet')
    }
  }
  checkTx(toPkh: string, amount: string, finalCheck: boolean): void {
    assertDraftField(
      this.torusVerifier || !(!this.inputValidationService.address(toPkh) || toPkh === this.activeAccount.address),
      this.isMultipleDestinations ? 'batch' : 'recipient',
      this.translate.instant('SENDCOMPONENT.INVALIDRECEIVERADDRESS')
    );
    assertDraftField(
      !this.torusVerifier ||
        !(!this.inputValidationService.torusAccount(this.toPkh, this.torusVerifier) || this.torusLookupAddress === this.activeAccount.address),
      this.isMultipleDestinations ? 'batch' : 'recipient',
      'Invalid recipient'
    );
    assertDraftField(
      !(
        !this.inputValidationService.amount(amount, this.token ? this.token.decimals : undefined) ||
        (finalCheck && (amount === '0' || amount === '') && toPkh.slice(0, 3) !== 'KT1')
      ),
      this.isMultipleDestinations ? 'batch' : 'amount',
      this.translate.instant('SENDCOMPONENT.INVALIDAMOUNT')
    );
  }
  getBatch(finalCheck = false): PartiallyPreparedTransaction[] {
    const txs: PartiallyPreparedTransaction[] = this.toMultipleDestinationsString
      .trim()
      .split(';')
      .map((row, i) => {
        if (row.trim()) {
          const cols = row
            .trim()
            .split(' ')
            .map((col) => col.trim())
            .filter((col) => col);
          assertDraftField(cols?.length === 2, 'batch', `Transaction ${i + 1} has invalid number of arguments. Expected 2, but got ${cols?.length}.`);
          assertDraftField(this.inputValidationService.address(cols[0]), 'batch', `Transaction ${i + 1} contains an invalid destination.`);
          assertDraftField(this.inputValidationService.amount(cols[1]), 'batch', `Transaction ${i + 1} contains an invalid amount.`);
          this.checkTx(cols[0], cols[1], finalCheck);
          const tx: PartiallyPreparedTransaction = {
            kind: 'transaction',
            destination: cols[0],
            amount: cols[1]
          };
          return tx;
        }
      })
      .filter((row) => row);
    return txs;
  }
  getFullyPreparedTxs(): FullyPreparedTransaction[] {
    assert(!this.simSemaphore && (!this.torusVerifier || this.torusReady()), this.formInvalid ? this.formInvalid : 'Awaiting request');
    const minimalTxs = this.getMinimalPreparedTxs(true);
    this.transactions = minimalTxs;
    assertDraftField(this.inputValidationService.fee(this.customFee), 'fee', 'Invalid fee');
    assertDraftField(this.inputValidationService.gas(this.customGasLimit), 'gas', 'Invalid gas limit');
    assertDraftField(this.inputValidationService.gas(this.customStorageLimit), 'storage', 'Invalid storage limit');
    assert(!this.checkBalance(), this.checkBalance());
    assert(
      minimalTxs.length === this.defaultTransactionParams.customLimits?.length,
      this.formInvalid === this.estimateService.tooSlowPreloadError ? this.estimateService.tooSlowPreloadError : 'Simulation error'
    );
    return this.opsWithCustomLimits();
  }
  opsWithCustomLimits(): FullyPreparedTransaction[] {
    let extraGas: number = 0;
    let extraStorage: number = 0;
    if (this.customGasLimit && this.customGasLimit !== this.defaultTransactionParams.gas.toString()) {
      extraGas = Number(this.customGasLimit) - this.defaultTransactionParams.gas;
    }
    if (this.customStorageLimit && this.customStorageLimit !== this.defaultTransactionParams.storage.toString()) {
      extraStorage = Number(this.customStorageLimit) - this.defaultTransactionParams.storage;
    }
    const extraGasPerOp: number = Math.round(extraGas / this.transactions.length);
    const extraStoragePerOp: number = Math.round(extraStorage / this.transactions.length);
    const txs: FullyPreparedTransaction[] = [];
    for (let i = 0; i < this.transactions.length; i++) {
      let gasLimit: string = extraGas
        ? (Number(this.defaultTransactionParams.customLimits[i].gasLimit) + extraGasPerOp).toString()
        : this.defaultTransactionParams.customLimits[i].gasLimit.toString();
      let storageLimit = extraStorage
        ? (Number(this.defaultTransactionParams.customLimits[i].storageLimit) + extraStoragePerOp).toString()
        : this.defaultTransactionParams.customLimits[i].storageLimit.toString();
      gasLimit = !(Number(gasLimit) < 0) ? gasLimit : '0';
      storageLimit = !(Number(storageLimit) < 0) ? storageLimit : '0';
      const fullyTx: FullyPreparedTransaction = {
        ...this.transactions[i],
        fee: i === this.transactions.length - 1 ? this.getTotalFee().toString() : '0',
        gasLimit,
        storageLimit
      };
      txs.push(fullyTx);
    }
    return txs;
  }
  invalidTorusAccount(): string {
    const torusError = {
      google: 'Invalid Google email address',
      reddit: 'Invalid Reddit username',
      twitter: 'Invalid Twitter username',
      domain: 'Tezos Domains must be valid url',
      email: 'Invalid email address'
    };
    if (!this.inputValidationService.torusAccount(this.toPkh, this.torusVerifier) && this.toPkh !== '') {
      return torusError[this.torusVerifier];
    }
  }
  sendEntireBalance(event: Event): void {
    event.stopPropagation();
    this.clearFieldError('amount');
    this.sendMax = true;
    this.checkMaxAmount();
    this.amountChange();
  }
  toggleDestination(): void {
    this.defaultTransactionParams = zeroTxParams;
    this.sendMax = false;
    this.prevEquiClass = '';
    this.isMultipleDestinations = !this.isMultipleDestinations;
    this.transactions = [];
    this.toMultipleDestinationsString = '';
    this.formInvalid = '';
    this.invalidField = null;
    this.toPkh = '';
    this.amount = '';
    this.customFee = '';
    this.customGasLimit = '';
    this.customStorageLimit = '';
    this.clearTorus();
    this.updateDefaultValues();
  }
  clearTorus(): void {
    this.torusVerifier = '';
    this.torusPendingLookup = false;
    this.torusLookupAddress = '';
    this.torusLookupId = '';
    this.torusTwitterId = '';
    this.torusLastLookup = '';
  }
  checkMaxAmount(): void {
    if (this.sendMax) {
      const max = this.maxToSend(this.activeAccount);
      if (max.length && max.slice(0, 1) !== '-') {
        this.amount = max;
      } else {
        this.amount = '0';
      }
    }
  }
  checkBalance(): string {
    if (this.transactions.length > 0) {
      if (this.activeAccount && this.activeAccount instanceof ImplicitAccount) {
        const max = Big(this.maxToSend(this.activeAccount)).plus(this.tokenTransfer ? 0 : 0.000001);
        let amount = Big(0);
        for (const tx of this.transactions) {
          amount = amount.plus(Big(tx.amount));
        }
        if (amount.gt(max)) {
          return this.translate.instant('SENDCOMPONENT.TOOHIGHFEEORAMOUNT');
        }
      } else if (this.activeAccount && this.activeAccount instanceof OriginatedAccount) {
        const maxKt = Big(this.maxToSend(this.activeAccount));
        const maxTz = Big(this.maxToSend(this.walletService.wallet.getImplicitAccount(this.activeAccount.pkh))).plus(0.000001);
        let amount = Big(0);
        for (const tx of this.transactions) {
          amount = amount.plus(Big(tx.amount));
        }
        if (amount.gt(maxKt)) {
          return this.translate.instant('SENDCOMPONENT.TOOHIGHAMOUNT');
        } else if (new Big('0').gt(maxTz)) {
          return this.translate.instant('SENDCOMPONENT.TOOHIGHFEE');
        }
      }
    }
    return '';
  }
  updateMaxAmount(): void {
    if (this.sendMax) {
      const max = this.maxToSend(this.activeAccount);
      let maxAmount = '0';
      if (max.length && max.slice(0, 1) !== '-') {
        maxAmount = max;
      }
      if (this.amount !== maxAmount) {
        this.amount = maxAmount;
      }
    }
  }
  maxToSend(account: Account): string {
    if (account && account instanceof ImplicitAccount && !this.tokenTransfer) {
      let accountBalance = Big(account.availableBalance).div(1000000);
      accountBalance = accountBalance.minus(this.customFee && Number(this.customFee) ? Number(this.customFee) : this.defaultTransactionParams.fee);
      if (!this.isMultipleDestinations) {
        accountBalance = accountBalance.minus(
          this.customStorageLimit && Number(this.customStorageLimit)
            ? Number(Big(this.customStorageLimit).times(this.storageCostPerByte).div('1000000'))
            : this.defaultTransactionParams.burn
        );
      } else {
        accountBalance = accountBalance.minus(this.defaultTransactionParams.burn);
      }
      accountBalance = accountBalance.minus(0.000001); // dust
      return accountBalance.toString();
    } else {
      if (this.tokenTransfer) {
        if (account instanceof ImplicitAccount) {
          return Big(account.getTokenBalance(this.tokenTransfer))
            .div(10 ** this.token.decimals)
            .toFixed();
        }
      } else {
        return Big(account.availableBalance).div(1000000).toString();
      }
    }
  }

  async verifierChange(): Promise<void> {
    this.torusLookupAddress = '';
    if (this.torusVerifier) {
      this.torusLookup();
    } else {
      this.formInvalid = '';
      this.estimateFees();
    }
    // this.validateReceiverAddress();
    // resimulate?
  }
  async torusLookup(): Promise<any> {
    const request = this.prepareRequest;
    const lookupInput = `${this.torusVerifier}:${this.toPkh}`;
    let formInvalid = '';
    if (!this.torusService.verifierMapKeys.includes(this.torusVerifier) && this.torusVerifier !== 'domain') {
      formInvalid = 'Invalid verifier';
    } else if (this.invalidTorusAccount()) {
      formInvalid = this.invalidTorusAccount();
    } else if (this.toPkh) {
      this.torusPendingLookup = true;
      this.torusLookupId = this.toPkh;

      const { pkh, twitterId } =
        this.torusVerifier === 'domain'
          ? await this.tezosDomains
              .getAddressFromDomain(this.toPkh)
              .then((ans) => {
                if (ans?.pkh === '') {
                  formInvalid = 'Could not find the domain';
                }
                return ans;
              })
              .catch((e) => {
                console.error(e);
                formInvalid = e;
                return '';
              })
          : await this.torusService.lookupPkh(this.torusVerifier, this.toPkh).catch((e) => {
              console.error(e);
              formInvalid = e;
              return '';
            });
      if (!this.isOpen || this.prepareRequest !== request || lookupInput !== `${this.torusVerifier}:${this.toPkh}`) {
        // Lookup input values have changed. So we can ignore this response from lookupPkh().
        return;
      }
      this.formInvalid = formInvalid;
      this.torusPendingLookup = false;
      if (pkh) {
        this.torusLookupAddress = pkh;
        this.torusTwitterId = twitterId ? twitterId : '';
        this.torusLastLookup = lookupInput;
        this.estimateFees();
      } else {
        this.torusLookupAddress = '';
      }
    }
  }
  batchSpace(txs = 0): boolean | string {
    if (this.isMultipleDestinations && this.defaultTransactionParams.customLimits && this.defaultTransactionParams.customLimits.length) {
      const numberOfTxs = txs ? txs : this.defaultTransactionParams.customLimits.length;
      const txsLimit = 294 + (this.defaultTransactionParams.reveal ? 0 : 2); // Max transactions in a batch is 296 (294 with a reveal)
      return !txs ? this.numberWithCommas(numberOfTxs + ' / ' + txsLimit) : numberOfTxs <= txsLimit;
    }
    return !txs ? '' : true;
  }
  numberWithCommas(x: string): string {
    const parts: Array<string> = x.split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return parts.join('.');
  }
  torusReady(): boolean {
    return !this.torusPendingLookup && this.torusLookupAddress !== '';
  }
  preview(): void {
    let txs: FullyPreparedTransaction[];
    try {
      txs = this.getFullyPreparedTxs();
    } catch (e) {
      this.formInvalid = e.message;
      this.invalidField = e instanceof DraftFieldError ? e.field : null;
      if (this.invalidField) {
        if (['gas', 'fee', 'storage'].includes(this.invalidField)) this.advancedForm = true;
        this.changeDetector.detectChanges();
        this.dialog.nativeElement.querySelector<HTMLElement>('#prepare-send-' + this.invalidField)?.focus();
      }
      return;
    }
    const data = {
      customGasLimit: this.customGasLimit,
      customStorageLimit: this.customStorageLimit,
      focusFromPrepare: true,
      returnFocus: this.prepareRequest?.invocation?.focusAfterClose
    };
    this.close();
    this.prepareResponse.emit(txs);
    ModalComponent.currentModel.next({ name: 'confirm-send', data });
  }
  dynSize(): string {
    const size = this.amount ? this.amount.length : 0;
    if (size < 7) {
      return '5';
    } else if (size < 9) {
      return '4';
    } else if (size < 12) {
      return '3';
    } else if (size < 17) {
      return '2';
    }
    return '1.5';
  }

  dropdownResponse(data): void {
    if (data?.torusVerifier !== this.torusVerifier) {
      console.log(this.torusVerifier + ' -> ' + data.torusVerifier);
      this.clearFieldError('recipient');
      this.torusVerifier = data.torusVerifier;
      this.torusVerifierName = data.torusVerifierName;
      this.verifierChange();
    }
  }
  async pasteToPkh(): Promise<void> {
    const request = this.prepareRequest;
    try {
      const text = await navigator.clipboard.readText();
      if (this.isOpen && !this.isMultipleDestinations && this.prepareRequest === request) this.handleScanResponse({ pkh: text });
    } catch {
      if (this.isOpen && !this.isMultipleDestinations && this.prepareRequest === request) {
        this.invalidField = 'recipient';
        this.formInvalid = 'Could not read the clipboard. Paste directly into the recipient field.';
        this.recipient?.nativeElement.focus();
      }
    }
  }
  handleScanResponse(ev): void {
    const request = this.prepareRequest;
    this.clearFieldError('recipient');
    this.toPkh = ev?.pkh || '';
    this.updateDefaultValues({ target: { value: this.toPkh } });
    queueMicrotask(() => {
      if (this.isOpen && this.prepareRequest === request) this.recipient?.nativeElement.focus();
    });
  }
}
