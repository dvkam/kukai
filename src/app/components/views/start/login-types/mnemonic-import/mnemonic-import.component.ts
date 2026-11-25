import { Component, ElementRef, HostListener, OnDestroy, ViewChild } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { ImportService } from '../../../../../services/import/import.service';
import { MessageService } from '../../../../../services/message/message.service';
import { StorableWalletType, WalletType } from '../../../../../interfaces';
import { WalletService } from '../../../../../services/wallet/wallet.service';
import { ExportService } from '../../../../../services/export/export.service';
import { InputValidationService } from '../../../../../services/input-validation/input-validation.service';
import { IndexerService } from '../../../../../services/indexer/indexer.service';
import { OperationService } from '../../../../../services/operation/operation.service';
import { utils, hd, secp256k1 } from '../../../../../libraries/index';
import { filter } from 'rxjs/operators';
import { Subscription } from 'rxjs';
import * as bip39 from 'bip39';
import Big from 'big.js';

type ImportField = 'words' | 'email' | 'password' | 'passphrase' | 'address' | 'keystore-password' | 'new-password' | 'confirm-password';

interface WalletCandidate {
  pkh: string;
  used?: boolean;
  balance?: string;
}

export enum ChooseWalletState {
  UserDoesNotNeedToChooseWallet,
  UserNeedsToChooseWallet,
  TzktErrorEncountered
}

@Component({
  selector: 'app-mnemonic-import-wallet',
  templateUrl: './mnemonic-import.component.html',
  styleUrls: ['../../../../../../scss/components/views/start/login.component.scss']
})
export class MnemonicImportComponent implements OnDestroy {
  @ViewChild('stepHeading') set stepHeading(heading: ElementRef<HTMLElement> | undefined) {
    heading?.nativeElement.focus();
  }

  readonly importMethods = ['Keystore File', 'Seed Words', 'Fundraiser'];
  mnemonic = '';
  email = '';
  password = '';
  passphrase = '';
  pkh = '';
  importOption = 0;
  focusedImportOption = 0;
  activePanel = 0;
  wallet: any;
  walletJson: string;
  pwd = '';
  pwd1 = '';
  pwd2 = '';
  pwdStrength = '';
  Downloaded = false;
  fileName = '';
  fileError = '';
  fieldError: { field: ImportField; message: string } | null = null;
  importingKeystore = false;
  advancedForm = false;
  bip39Wordlist = bip39.wordlists.english;

  // data for seed word wallet import
  storableWalletTypeEnum = StorableWalletType;
  storableWalletType = StorableWalletType.HdWallet;
  chooseWalletStateEnum = ChooseWalletState;
  chooseWalletState = ChooseWalletState.UserDoesNotNeedToChooseWallet;
  legacyCandidate: null | WalletCandidate = null;
  hdCandidate: null | WalletCandidate = null;
  exportedSocialWalletCandidate: null | WalletCandidate = null;

  private readonly subscriptions = new Subscription();
  private fileReadVersion = 0;
  private destroyed = false;

  constructor(
    private importService: ImportService,
    private router: Router,
    readonly messageService: MessageService,
    private walletService: WalletService,
    private exportService: ExportService,
    private inputValidationService: InputValidationService,
    private indexerService: IndexerService,
    private operationService: OperationService
  ) {
    this.subscriptions.add(
      this.router.events.pipe(filter((e) => e instanceof NavigationEnd && e.url.startsWith('/import'))).subscribe(() => {
        const option = this.router.getCurrentNavigation()?.extras.state?.option;
        this.selectImportOption(option === 1 || option === 2 ? option : 0);
      })
    );
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    this.fileReadVersion++;
    this.subscriptions.unsubscribe();
  }

  get hasImportEntries(): boolean {
    return Boolean(this.walletJson || this.mnemonic || this.email || this.password || this.passphrase || this.pkh);
  }

  selectImportOption(option: number): void {
    if (this.importingKeystore || this.messageService.spinnerOn) {
      return;
    }
    this.focusedImportOption = option;
    if (option === this.importOption) {
      return;
    }
    this.importOption = option;
    this.activePanel = 0;
    this.clearKeystore();
    this.mnemonic = '';
    this.email = '';
    this.password = '';
    this.passphrase = '';
    this.pkh = '';
    this.pwd1 = '';
    this.pwd2 = '';
    this.pwdStrength = '';
    this.advancedForm = false;
    this.Downloaded = false;
    this.wallet = null;
    this.chooseWalletState = ChooseWalletState.UserDoesNotNeedToChooseWallet;
    this.resetCandidates();
  }

  moveImportTabFocus(event: KeyboardEvent): void {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) {
      return;
    }
    const tabs = (event.currentTarget as HTMLElement).querySelectorAll<HTMLButtonElement>('[role="tab"]');
    const last = tabs.length - 1;
    const focused = Array.from(tabs).indexOf(event.target as HTMLButtonElement);
    if (focused < 0) {
      return;
    }
    let option: number;
    switch (event.key) {
      case 'ArrowLeft':
        option = focused === 0 ? last : focused - 1;
        break;
      case 'ArrowRight':
        option = focused === last ? 0 : focused + 1;
        break;
      case 'Home':
        option = 0;
        break;
      case 'End':
        option = last;
        break;
      default:
        return;
    }
    event.preventDefault();
    this.focusedImportOption = option;
    tabs[option].focus();
  }

  restoreSelectedTabStop(event: FocusEvent): void {
    const tablist = event.currentTarget as HTMLElement;
    if (!tablist.contains(event.relatedTarget as Node | null)) {
      this.focusedImportOption = this.importOption;
    }
  }

  private showFieldError(field: ImportField, message: string): void {
    if (this.importOption === 1 && (field === 'address' || field === 'passphrase')) {
      this.advancedForm = true;
    }
    this.fieldError = { field, message };
  }

  retrieve(): void {
    if (this.activePanel !== 0 || this.importOption === 0) {
      return;
    }
    this.fieldError = null;
    this.resetCandidates();
    // try to get the PKH from the user provided mnemonic
    if (this.mnemonic) {
      this.mnemonic = this.mnemonic
        .toLowerCase()
        .replace(/(\r\n|\n|\r)/gm, ' ') // replace \n
        .replace(/[^a-z| ]/gm, '') // remove forbidden characters
        .replace(/\s+/g, ' ') // remove extra whitespaces
        .trim();
    }
    if (this.importOption === 2) {
      this.passphrase = this.email + this.password;
    }
    const mnemonicError = this.inputValidationService.invalidMnemonic(this.mnemonic || '');
    const invalidMnemonic = mnemonicError.startsWith('Invalid seed word:') ? 'Check that each recovery word is spelled correctly.' : mnemonicError;

    if (invalidMnemonic) {
      if (this.importOption !== 1 || !this.tryImportExportedSocialWallet()) {
        this.showFieldError('words', invalidMnemonic);
      }
    } else if (this.importOption === 2 && !this.inputValidationService.email(this.email)) {
      this.showFieldError('email', 'Enter the email address you used for the fundraiser.');
    } else if (this.importOption === 2 && !this.password) {
      this.showFieldError('password', 'Enter the password you used for the fundraiser.');
    } else if (!this.inputValidationService.passphrase(this.passphrase)) {
      this.showFieldError('passphrase', 'Check the seed passphrase.');
    } else if (this.pkh && !this.inputValidationService.address(this.pkh)) {
      this.showFieldError('address', 'Enter a valid public account address.');
    } else if (this.importOption === 1 && this.passphrase && !this.pkh) {
      this.showFieldError('address', 'Enter the public account address to verify your passphrase.');
    } else {
      // at this point we have validated the majority of the input and we can
      // try to derive the PKH from mnemonic and the passphrase.
      const passphrase = this.passphrase ? this.passphrase : '';
      const legacyWalletAddress = utils.seedToKeyPair(utils.mnemonicToSeed(this.mnemonic, passphrase, false)).pkh;

      if (this.importOption === 1) {
        // seed word import screen

        // from the mnemonic itself we cannot tell if the user prefers the HD or legacy wallet
        // so we collect some data and run some checks
        this.legacyCandidate = { pkh: legacyWalletAddress };
        this.hdCandidate = { pkh: hd.keyPairFromAccountIndex(utils.mnemonicToSeed(this.mnemonic, passphrase, true), 0).pkh };
        if (this.pkh && this.pkh !== '') {
          // the user has provided a PKH and they expect the derivation from the seed words to match one
          if (this.pkh === this.hdCandidate.pkh) {
            this.storableWalletType = StorableWalletType.HdWallet;
            this.hdCandidate.used = true;
            this.legacyCandidate.used = false;
            this.activePanel++;
          } else if (this.pkh === this.legacyCandidate.pkh) {
            this.storableWalletType = StorableWalletType.LegacyWallet;
            this.legacyCandidate.used = true;
            this.hdCandidate.used = false;
            this.activePanel++;
          } else {
            this.showFieldError('address', 'The address does not match these recovery words. Check the address and passphrase.');
          }
        } else {
          // these API requests are run in the background and inspected later
          const legacy = this.legacyCandidate;
          const hdWallet = this.hdCandidate;
          Promise.all([this.indexerService.isUsedAccount(legacy.pkh), this.indexerService.isUsedAccount(hdWallet.pkh)]).then(
            ([legacyUsed, hdUsed]) => {
              if (this.destroyed || this.legacyCandidate !== legacy || this.hdCandidate !== hdWallet) {
                return;
              }
              legacy.used = legacyUsed;
              hdWallet.used = hdUsed;
              if (legacyUsed && hdUsed) {
                this.getCandidateBalances();
              }
            },
            () => {
              // An unavailable indexer leaves the wallet type up to the user.
            }
          );
          this.activePanel++;
        }
      } else if (this.importOption === 2 && this.pkh && this.pkh !== legacyWalletAddress) {
        // fundraiser screen if user provided pkh does not match the legacy wallet address
        this.showFieldError('password', 'The fundraiser credentials do not match this address. Check your email, password and address.');
      } else {
        this.activePanel++;
      }
    }
  }

  private tryImportExportedSocialWallet(): boolean {
    try {
      // Social wallet exports encode their own mnemonic by shifting the BIP39 words.
      const unshiftedMnemonic = secp256k1.shiftedMnemonicToMnemonic(this.mnemonic);
      if (!unshiftedMnemonic || this.inputValidationService.invalidMnemonic(unshiftedMnemonic)) {
        return false;
      }
      const spsk = secp256k1.mnemonicToSpsk(unshiftedMnemonic);
      if (!secp256k1.validSecretKey(spsk)) {
        return false;
      }
      if (this.passphrase) {
        this.showFieldError('passphrase', 'Remove the passphrase to import a wallet exported from a social sign-in.');
        return true;
      }
      const { pkh } = this.operationService.spPrivKeyToKeyPair(spsk);
      if (this.pkh && this.pkh !== pkh) {
        this.showFieldError('address', 'The address does not match these recovery words. Check the address and passphrase.');
        return true;
      }
      this.exportedSocialWalletCandidate = { pkh };
      this.storableWalletType = StorableWalletType.ExportedSocialWallet;
      this.mnemonic = unshiftedMnemonic;
      this.activePanel++;
      return true;
    } catch {
      return false;
    }
  }

  getChooseWalletState(): ChooseWalletState {
    if (this.importOption === 2) {
      this.storableWalletType = StorableWalletType.LegacyWallet;
    }
    if (this.importOption === 2 || this.exportedSocialWalletCandidate) {
      return ChooseWalletState.UserDoesNotNeedToChooseWallet;
    }
    if (this.legacyCandidate.used === undefined || this.hdCandidate.used === undefined) {
      // Promises haven't resolved successfully in time (before the user have entered the passwords), fallback on manual wallet type selection
      return ChooseWalletState.TzktErrorEncountered;
    } else if (this.legacyCandidate.used) {
      if (this.hdCandidate.used) {
        return ChooseWalletState.UserNeedsToChooseWallet;
      } else {
        this.storableWalletType = StorableWalletType.LegacyWallet;
      }
    }
    return ChooseWalletState.UserDoesNotNeedToChooseWallet;
  }

  private getCandidateBalances(): void {
    for (const candidate of [this.hdCandidate, this.legacyCandidate]) {
      if (candidate && candidate.balance === undefined) {
        this.subscriptions.add(
          this.operationService.getBalance(candidate.pkh).subscribe((answer) => {
            if (answer.success) {
              candidate.balance = Big(answer.payload.balance)
                .div(10 ** 6)
                .toString();
            }
          })
        );
      }
    }
  }

  private async setPwd(): Promise<void> {
    const password = this.pwd1;
    this.pwd1 = '';
    this.pwd2 = '';
    await this.messageService.startSpinner('Encrypting wallet...');
    try {
      this.wallet = await this.walletService.createEncryptedWallet(this.mnemonic, password, this.passphrase, this.storableWalletType);
      this.mnemonic = '';
      this.passphrase = '';
      this.email = '';
      this.password = '';
      this.activePanel++;
      this.resetCandidates();
    } finally {
      this.messageService.stopSpinner();
    }
  }

  async setPwdOrConfirmWalletType(): Promise<void> {
    if (this.messageService.spinnerOn || !this.validPwd()) {
      return;
    }
    this.chooseWalletState = this.getChooseWalletState();

    if (this.chooseWalletState === ChooseWalletState.UserDoesNotNeedToChooseWallet) {
      await this.setPwd();
    } else {
      this.getCandidateBalances();
    }
  }

  async setPwdAfterConfirmingWalletType(): Promise<void> {
    if (!this.messageService.spinnerOn) {
      await this.setPwd();
    }
  }

  private resetCandidates(): void {
    this.storableWalletType = StorableWalletType.HdWallet;
    this.legacyCandidate = null;
    this.hdCandidate = null;
    this.exportedSocialWalletCandidate = null;
  }

  validPwd(): boolean {
    this.fieldError = null;
    if (!this.inputValidationService.password(this.pwd1)) {
      this.showFieldError('new-password', 'Choose a stronger password.');
      return false;
    } else if (this.pwd1 !== this.pwd2) {
      this.showFieldError('confirm-password', 'Enter the same password again.');
      return false;
    } else {
      return true;
    }
  }
  calcStrength(): void {
    this.pwdStrength = this.inputValidationService.passwordStrengthDisplay(this.pwd1);
  }
  export(): string {
    return JSON.stringify(this.wallet.data);
  }
  showPkh(): string {
    return this.wallet.pkh;
  }
  download(): void {
    this.exportService.downloadWallet(this.wallet.data);
    this.Downloaded = true;
  }
  async done(): Promise<void> {
    if (this.messageService.spinnerOn) {
      return;
    }
    await this.messageService.startSpinner('Loading wallet...');
    try {
      await this.importService.importWalletFromObject(this.wallet.data, this.wallet.seed);
    } catch (e) {
      this.messageService.addError('ImportError: ' + e?.message);
      throw e;
    } finally {
      this.messageService.stopSpinner();
    }
    this.wallet = null;
    this.router.navigate([`/account/`]);
    this.messageService.addSuccess('Your new wallet is now set up and ready!');
  }
  private clearKeystore(): void {
    this.fileReadVersion++;
    this.walletJson = null;
    this.fileName = '';
    this.fileError = '';
    this.pwd = '';
    this.fieldError = null;
  }

  checkImportPwd(): void {
    if (!this.walletJson || this.importingKeystore || this.messageService.spinnerOn) {
      return;
    }
    this.fieldError = null;
    this.fileError = '';
    if (!this.pwd) {
      this.showFieldError('keystore-password', 'Enter the password for this keystore.');
      return;
    }
    const password = this.pwd;
    this.pwd = '';
    this.importingKeystore = true;
    this.messageService.startSpinner('Importing wallet...');
    this.importService
      .importWalletFromJson(this.walletJson, password)
      .then((success) => {
        if (this.destroyed) {
          return;
        }
        if (success) {
          this.router.navigate(['/account/']);
        } else {
          this.fileError = 'Could not import this keystore. Please try again.';
        }
      })
      .catch((error) => {
        if (this.destroyed) {
          return;
        }
        if (error?.message === 'Wrong password') {
          this.showFieldError('keystore-password', 'The password is incorrect. Try again.');
        } else if (error?.message === 'Failed to fetch account(s). Please check your connection.') {
          this.fileError = 'Could not load the accounts in this keystore. Check your connection and try again.';
        } else {
          this.fileError = `Could not open “${this.fileName}”. Check the password or choose another Kukai keystore.`;
        }
      })
      .finally(() => {
        this.importingKeystore = false;
        this.messageService.stopSpinner();
      });
  }

  @HostListener('document:dragover', ['$event'])
  allowDrop(event: DragEvent): void {
    if (event.dataTransfer?.types.includes('Files')) {
      event.preventDefault();
    }
  }

  @HostListener('document:drop', ['$event'])
  handleFileDragAndDrop(event: DragEvent): void {
    const file = event.dataTransfer?.files.item(0);
    if (file) {
      event.preventDefault();
      this.loadKeystore(file);
    }
  }

  chooseFile(input: HTMLInputElement): void {
    const file = input.files?.item(0);
    if (file) {
      input.value = '';
      this.loadKeystore(file);
    }
  }

  private loadKeystore(file: File): void {
    if (this.importOption !== 0 || this.activePanel !== 0 || this.importingKeystore) {
      return;
    }
    this.clearKeystore();
    const version = this.fileReadVersion;
    if (!/\.(tez|json)$/i.test(file.name)) {
      this.fileError = `“${file.name}” is not a supported file type. Choose an encrypted Kukai keystore (.tez).`;
      return;
    }
    file
      .text()
      .then((contents) => {
        if (version !== this.fileReadVersion) {
          return;
        }
        if (!this.isSupportedKeystore(contents)) {
          throw new Error('Invalid keystore');
        }
        this.walletJson = contents;
        this.fileName = file.name;
      })
      .catch(() => {
        if (version === this.fileReadVersion) {
          this.fileError = `Could not read “${file.name}” as an encrypted Kukai keystore. Choose another copy or file.`;
        }
      });
  }

  private isSupportedKeystore(contents: string): boolean {
    const data = JSON.parse(contents);
    if (!data || !this.importService.pwdRequired(contents)) {
      return false;
    }
    const { walletType, version, pkh, pk, iv, encryptedSeed, encryptedSk, encryptedEntropy } = data;
    if ([pkh, pk, iv, encryptedSeed, encryptedEntropy].some((value) => value && typeof value !== 'string')) {
      return false;
    }
    if (walletType === WalletType.LegacyWallet && version === 1) {
      return typeof pkh === 'string' && pkh.length > 3 && typeof encryptedSeed === 'string' && encryptedSeed.length > 0;
    }
    if (typeof iv !== 'string' || !iv) {
      return false;
    }
    if (walletType === WalletType.ExportedSocialWallet) {
      return version === 3 && typeof encryptedSk === 'string' && encryptedSk.length > 0;
    }
    return (version === 3 || (version === 2 && walletType === WalletType.LegacyWallet)) && typeof encryptedSeed === 'string' && encryptedSeed.length > 0;
  }

  seedWordKeydown(e: KeyboardEvent): boolean {
    const input = e.target as HTMLTextAreaElement;
    if (e.metaKey || e.ctrlKey || e.altKey || e.isComposing) {
      return true;
    }
    if (e.key === ' ' && input.value.endsWith(' ') && input.selectionStart === input.selectionEnd && input.selectionStart === input.value.length) {
      return false;
    }

    let word = '';
    let words = [];
    let wordPos = -1;
    let charPos = -1;
    if (/^[a-z]$/i.test(e.key)) {
      const first = input.value.slice(0, input.selectionStart) + (input.selectionStart === input.selectionEnd ? e.key : '');
      const second = input.value.slice(input.selectionStart);
      const firstSplit = first.split(' ');
      words = (first + second).split(' ');
      wordPos = firstSplit.length - 1;
      word = words[wordPos];
      let n = -1;
      firstSplit.pop();
      firstSplit.forEach((item) => {
        n += item.length;
        n++;
      });
      charPos = input.selectionStart - 1 - n;
    } else {
      words = input.value.split(' ');
    }
    if (/^[a-z]$/i.test(e.key)) {
      if (input.selectionStart !== input.selectionEnd) {
        if (input.value[input.selectionStart] === e.key) {
          const selection = input.value.slice(input.selectionStart, input.selectionEnd);
          if (selection.includes(' ')) {
            return true;
          }
          ++input.selectionStart;
          if (input.selectionStart === input.selectionEnd && words.length < 24) {
            input.value = input.value.slice(0, input.selectionStart) + ' ' + input.value.slice(input.selectionStart);
            this.mnemonic = input.value;
          }
          input.dataset.selectionStart = String(input.selectionStart);
          input.dataset.selectionEnd = String(input.selectionEnd);
          return false;
        } else {
          return true;
        }
      }
      if (word) {
        const r = this.bip39Wordlist.filter((w) => w.startsWith(word));
        // only suggest word if added char is in the end of current word
        if (r.length === 1 && (input.selectionEnd !== input.selectionStart || charPos + 1 === word.length)) {
          words = words.map((w) => (w === word ? r[0] : w));
          const offset = r[0].length - word.length;
          let selStart = input.selectionStart;
          input.value = words.join(' ');
          if (offset === 0 && words.length < 24 && wordPos === words.length - 1) {
            input.value = input.value + ' ';
            selStart++;
          }
          this.mnemonic = input.value;
          input.selectionStart = selStart + 1;
          input.selectionEnd = input.selectionStart + offset;
          input.dataset.selectionStart = String(input.selectionStart);
          input.dataset.selectionEnd = String(input.selectionEnd);
          return false;
        }
      }
    } else if (
      ['Tab', 'Enter', ' '].includes(e.key) &&
      input.selectionStart !== input.selectionEnd &&
      Number(input.dataset.selectionStart) === input.selectionStart &&
      Number(input.dataset.selectionEnd) === input.selectionEnd
    ) {
      let selEnd = input.selectionEnd;
      const words = input.value?.split(' ');
      if (input.value.length === selEnd && words?.length < 24) {
        input.value += ' ';
        selEnd += 1;
      }
      this.mnemonic = input.value;
      input.selectionStart = input.selectionEnd = selEnd;
      input.dataset.selectionStart = String(input.selectionStart);
      input.dataset.selectionEnd = String(input.selectionStart);
      return e.key === 'Tab';
    } else if (e.key === 'Backspace') {
      input.dataset.selectionStart = String(input.selectionStart);
      input.dataset.selectionEnd = String(input.selectionStart);
    }
    return true;
  }
}
