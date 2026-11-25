import { Component, DoCheck, ElementRef, EventEmitter, HostListener, Input, Output, ViewChild } from '@angular/core';
import { ImplicitAccount, TorusWallet } from '../../../../services/wallet/wallet';
import { LookupService } from '../../../../services/lookup/lookup.service';
import { WalletService } from '../../../../services/wallet/wallet.service';

@Component({
  selector: 'app-ui-dropdown-permission-request',
  templateUrl: './permission-request.component.html',
  styleUrls: ['../../../../../scss/components/ui/dropdown/staged-account-select.component.scss']
})
export class PermissionRequestDropdownComponent implements DoCheck {
  private static nextId = 0;
  readonly panelId = `staged-account-options-${PermissionRequestDropdownComponent.nextId++}`;
  @Input() options: readonly ImplicitAccount[] = [];
  @Input() current?: ImplicitAccount | null;
  @Output() dropdownResponse = new EventEmitter<ImplicitAccount>();
  @ViewChild('panelTrigger') private trigger: ElementRef<HTMLButtonElement>;
  isOpen = false;

  constructor(private readonly lookupService: LookupService, private readonly walletService: WalletService, private readonly host: ElementRef<HTMLElement>) {}

  ngDoCheck(): void {
    if (!this.isOpen) return;

    // Wallet updates can mutate the accounts array in place. Move focus before a focused row is removed.
    const host = this.host.nativeElement;
    const focused = host.ownerDocument.activeElement;
    const address = focused instanceof HTMLButtonElement && host.contains(focused) && focused.dataset.accountAddress;
    if (address && !this.options?.some((account) => account.address === address)) {
      this.closeAndFocusTrigger();
    } else if (!this.options?.length) {
      this.closeDropdown();
    }
  }

  getUsername(address: string): string {
    const wallet = this.walletService.wallet;
    return wallet instanceof TorusWallet ? wallet.displayName() : this.lookupService.resolve({ address })?.name ?? '';
  }

  getVerifier(): string {
    const wallet = this.walletService.wallet;
    return wallet instanceof TorusWallet ? wallet.verifier : 'domain';
  }

  trackAccount(_: number, account: ImplicitAccount): string {
    return account.address;
  }

  toggleDropdown(): void {
    if (this.options?.length) this.isOpen = !this.isOpen;
  }

  closeDropdown(): void {
    this.isOpen = false;
  }

  choose(account: ImplicitAccount): void {
    this.closeAndFocusTrigger();
    this.dropdownResponse.emit(account);
  }

  @HostListener('keydown.escape', ['$event'])
  escape(event: KeyboardEvent): void {
    if (this.isOpen) {
      event.preventDefault();
      event.stopPropagation();
      this.closeAndFocusTrigger();
    }
  }

  @HostListener('focusout', ['$event.relatedTarget'])
  @HostListener('document:click', ['$event.target'])
  closeWhenLeaving(target: EventTarget | null): void {
    if (this.isOpen && target instanceof Node && !this.host.nativeElement.contains(target)) {
      this.closeDropdown();
    }
  }

  private closeAndFocusTrigger(): void {
    this.closeDropdown();
    this.trigger.nativeElement.focus({ preventScroll: true });
  }
}
