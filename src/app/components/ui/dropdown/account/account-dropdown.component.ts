import { Component, ElementRef, EventEmitter, HostListener, NgZone, OnChanges, OnDestroy, OnInit, Output, SimpleChanges, ViewChild } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { TorusWallet } from '../../../../services/wallet/wallet';
import { WalletService } from '../../../../services/wallet/wallet.service';
import { LookupService } from '../../../../services/lookup/lookup.service';
import { DropdownComponent } from '../dropdown.component';
import { ModalComponent } from '../../../modals/modal.component';
import { filter } from 'rxjs/operators';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-ui-dropdown-account',
  templateUrl: './account-dropdown.component.html',
  styleUrls: ['../../../../../scss/components/ui/dropdown/account-dropdown.component.scss']
})
export class AccountDropdownComponent extends DropdownComponent implements OnInit, OnChanges, OnDestroy {
  private static nextId = 0;
  override ecmpId = `account-picker-${AccountDropdownComponent.nextId++}`;
  @Output() pickerHidden = new EventEmitter<void>();
  @ViewChild('panelTrigger') private trigger?: ElementRef<HTMLButtonElement>;
  private readonly visibility = new ResizeObserver(() => {
    if (!this.isOpen || this.trigger?.nativeElement.getClientRects().length) return;
    this.visibility.disconnect();
    this.zone.run(() => {
      this.isOpen = false;
      if (document.activeElement === document.body || this.host.nativeElement.contains(document.activeElement)) {
        this.pickerHidden.emit();
      }
    });
  });
  postfix = '';

  private subscriptions: Subscription = new Subscription();

  constructor(
    public router: Router,
    public lookupService: LookupService,
    private walletService: WalletService,
    private host: ElementRef<HTMLElement>,
    private zone: NgZone
  ) {
    super();
    this.subscriptions.add(
      this.router.events.pipe(filter((evt) => evt instanceof NavigationEnd)).subscribe((r: NavigationEnd) => {
        this.isOpen = false;
        let accountAddress = r.url.substr(r.url.indexOf('/account/') + 9);
        this.postfix = !!accountAddress.substring(36) ? accountAddress.substring(36) : '';
      })
    );
  }

  ngOnInit(): void {
    this.list = this.options;
    let accountAddress = this.router.url.substr(this.router.url.indexOf('/account/') + 9);
    this.postfix = !!accountAddress.substring(36) ? accountAddress.substring(36) : '';
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.options && changes.options.currentValue !== changes.options.previousValue) {
      this.list = this.options;
    }
  }

  ngOnDestroy() {
    this.visibility.disconnect();
    this.subscriptions.unsubscribe();
  }

  getUsername(address: string): string {
    if (this.walletService.wallet instanceof TorusWallet) {
      return this.walletService.wallet.displayName();
    } else {
      const party = this.lookupService.resolve({
        address: address || this.current?.address
      });
      if (party?.name) {
        return party.name;
      }
    }
    return '';
  }
  getVerifier(): string {
    if (this.walletService.wallet instanceof TorusWallet) {
      return this.walletService.wallet.verifier;
    } else {
      return 'domain';
    }
  }
  @HostListener('keydown.escape', ['$event'])
  escape(event: KeyboardEvent): void {
    if (this.isOpen) {
      event.stopPropagation();
      this.returnToTrigger();
    }
  }

  @HostListener('focusout', ['$event'])
  closeOnFocusOut(event: FocusEvent): void {
    if (this.isOpen && event.relatedTarget instanceof Node && !this.host.nativeElement.contains(event.relatedTarget)) {
      this.isOpen = false;
    }
  }

  override toggleDropdown(): void {
    super.toggleDropdown();
    if (this.isOpen && this.trigger) this.visibility.observe(this.trigger.nativeElement);
  }

  focusIfVisible(): boolean {
    const button = this.trigger?.nativeElement;
    if (!button || button.disabled || !button.getClientRects().length) return false;
    button.focus({ preventScroll: true });
    return document.activeElement === button;
  }

  returnToTrigger(): void {
    this.isOpen = false;
    this.trigger?.nativeElement.focus({ preventScroll: true });
  }

  showAll(): void {
    this.returnToTrigger();
    ModalComponent.currentModel.next({ name: 'account-list', data: null });
  }
  trackAccount(index: number, account: any) {
    return account?.address ? account.address : index;
  }
}
