import { ChangeDetectorRef, Component, ElementRef, EventEmitter, Input, Output, ViewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Params, PRIMARY_OUTLET, Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import Big from 'big.js';
import { LookupService } from '../../../../services/lookup/lookup.service';
import { SubjectService } from '../../../../services/subject/subject.service';
import { Account, TorusWallet } from '../../../../services/wallet/wallet';
import { WalletService } from '../../../../services/wallet/wallet.service';

@Component({
  selector: 'app-account-list-body',
  templateUrl: './body.component.html',
  styleUrls: ['../../../../../scss/components/modals/account-list.scss']
})
export class AccountListBodyComponent {
  @Input() current: Account | null = null;
  @Output() accountChosen = new EventEmitter<void>();
  @ViewChild('viewport', { static: true }) private viewport: ElementRef<HTMLElement>;
  accounts: Account[] = [];
  copyStatus = '';
  private copyRequest = 0;
  private routeSuffix: (string | Params)[] = [];

  constructor(
    private readonly router: Router,
    private readonly lookupService: LookupService,
    private readonly walletService: WalletService,
    private readonly translate: TranslateService,
    private readonly changeDetector: ChangeDetectorRef,
    subjectService: SubjectService
  ) {
    subjectService.walletUpdated.pipe(takeUntilDestroyed()).subscribe(() => (this.accounts = this.walletService.wallet?.getAccounts() ?? []));
  }

  getUsername(address: string): string {
    const wallet = this.walletService.wallet;
    return wallet instanceof TorusWallet ? wallet.displayName() : this.lookupService.resolve({ address })?.name ?? '';
  }

  get verifier(): string {
    const wallet = this.walletService.wallet;
    return wallet instanceof TorusWallet ? wallet.verifier : 'domain';
  }

  accountCommands(address: string): (string | Params)[] {
    return ['/account', address, ...this.routeSuffix];
  }

  prepareToOpen(): void {
    this.resetCopyStatus();
    const segments = this.router.parseUrl(this.router.url).root.children[PRIMARY_OUTLET]?.segments;
    const suffix = segments?.[0]?.path === 'account' ? segments.slice(2) : [];
    this.routeSuffix = suffix.flatMap(({ path, parameters }) => (Object.keys(parameters).length ? [path, parameters] : [path]));
  }

  chooseAccount(event: MouseEvent): void {
    if (event.button === 0 && !event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey) {
      this.accountChosen.emit();
    }
  }

  trackAccount(_index: number, account: Account): string {
    return account.address;
  }

  revealCurrentAccount(): void {
    const viewport = this.viewport.nativeElement;
    const current = viewport.querySelector<HTMLElement>('.selected');
    viewport.scrollTop = current?.offsetTop ?? 0;
  }

  resetCopyStatus(): void {
    this.copyRequest++;
    this.copyStatus = '';
  }

  async copyAddress(account: Account, address: HTMLElement): Promise<void> {
    const request = ++this.copyRequest;
    this.copyStatus = '';
    let copied = true;
    try {
      await navigator.clipboard.writeText(account.address);
    } catch {
      copied = false;
    }
    if (this.copyRequest !== request) return;
    if (copied) {
      this.copyStatus = this.translate.instant('OVERVIEWCOMPONENT.COPIEDTOCLIPBOARD');
    } else {
      const selection = document.getSelection();
      const range = document.createRange();
      range.selectNodeContents(address);
      selection?.removeAllRanges();
      selection?.addRange(range);
      this.copyStatus = 'Copy the address manually.';
    }
    this.changeDetector.detectChanges();
  }

  tez(mutez: number | null | undefined): string {
    return Big(mutez ?? 0)
      .div(1000000)
      .toFixed();
  }

  get totalTez(): string {
    return this.tez(this.walletService.wallet?.totalBalanceXTZ);
  }

  get totalFiat(): number {
    return this.walletService.wallet?.totalBalanceUSD ?? 0;
  }
}
