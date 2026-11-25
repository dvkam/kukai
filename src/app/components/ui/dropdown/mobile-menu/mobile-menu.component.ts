import { Component, ElementRef, EventEmitter, HostListener, Input, OnInit, Output, ViewChild } from '@angular/core';
import { NavigationStart, Router } from '@angular/router';
import { WalletService } from '../../../../services/wallet/wallet.service';
import { Account } from '../../../../services/wallet/wallet';
import { DropdownComponent } from '../dropdown.component';
import { TranslateService } from '@ngx-translate/core';
import copy from 'copy-to-clipboard';
import { MessageService } from '../../../../services/message/message.service';
import { LookupService } from '../../../../services/lookup/lookup.service';
import { SubjectService } from '../../../../services/subject/subject.service';
import { ModalComponent } from '../../../../components/modals/modal.component';
import { filter } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { UnlockableService } from '../../../../services/unlockable/unlockable.service';
import { CONSTANTS as _CONSTANTS } from '../../../../../environments/environment';

@Component({
  selector: 'app-ui-mobile-menu',
  templateUrl: './mobile-menu.component.html',
  styleUrls: ['../../../../../scss/components/ui/dropdown/mobile-menu.component.scss']
})
export class MobileMenuDropdownComponent extends DropdownComponent implements OnInit {
  @ViewChild('panelTrigger') private panelTrigger: ElementRef<HTMLButtonElement>;
  @Input() activeAccount: Account;
  @Input() delegateName;
  @Input() newAccount;
  @Output() receiveAddress = new EventEmitter<HTMLButtonElement>();
  readonly CONSTANTS = _CONSTANTS;

  constructor(
    private readonly host: ElementRef<HTMLElement>,
    public router: Router,
    public walletService: WalletService,
    public lookupService: LookupService,
    private messageService: MessageService,
    private translate: TranslateService,
    private subjectService: SubjectService,
    public unlockableService: UnlockableService
  ) {
    super();
    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationStart),
        takeUntilDestroyed()
      )
      .subscribe(() => (this.isOpen = false));
  }

  ngOnInit(): void {}
  @HostListener('document:keydown.escape')
  closeOnEscape(): void {
    if (this.isOpen) this.returnToTrigger();
  }

  returnToTrigger(): void {
    this.isOpen = false;
    this.panelTrigger.nativeElement.focus();
  }

  get navigationTrigger(): HTMLButtonElement {
    return this.panelTrigger.nativeElement;
  }

  openReceive(invoker: HTMLButtonElement): void {
    this.isOpen = false;
    this.receiveAddress.emit(invoker);
  }

  @HostListener('focusout', ['$event'])
  onFocusOut(event: FocusEvent): void {
    if (this.isOpen && event.relatedTarget instanceof Node && !this.host.nativeElement.contains(event.relatedTarget)) {
      this.isOpen = false;
    }
  }
  copy(): void {
    copy(this.activeAccount.address);
    const copyToClipboard = this.translate.instant('OVERVIEWCOMPONENT.COPIEDTOCLIPBOARD');
    this.messageService.add(this.activeAccount.address + ' ' + copyToClipboard, 5);
  }
  openSwap() {
    this.messageService.startSpinner();
    ModalComponent.currentModel.next({ name: 'swap-liquidity', data: null });
  }
  logout(): void {
    this.subjectService.logout.next(true);
    this.messageService.clear();
    this.walletService.clearWallet();
    this.lookupService.clear();
    this.router.navigate(['']);
  }
}
