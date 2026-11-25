import { AfterViewInit, Component, ElementRef, EventEmitter, Input, OnChanges, OnDestroy, OnInit, Output, SimpleChanges, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { MessageService } from '../../../services/message/message.service';
import { SubjectService } from '../../../services/subject/subject.service';
import { WalletService } from '../../../services/wallet/wallet.service';
import { Account, ImplicitAccount } from '../../../services/wallet/wallet';
import { PermissionRequestDropdownComponent } from '../../ui/dropdown/permission-request/permission-request.component';
import { InvokedDialog } from '../invoked-dialog';
import { wrapDialogFocus } from '../modal-focus';

interface PermissionRequestDisplay {
  version?: string | number;
  appMetadata?: { name: string; icon?: string };
}

@Component({
  selector: 'app-permission-request',
  templateUrl: './permission-request.component.html',
  styleUrls: [
    '../../../../scss/components/modals/modal.scss',
    '../../../../scss/components/modals/invoked-dialog.scss',
    '../../../../scss/components/modals/account-selection-dialog.scss'
  ]
})
export class PermissionRequestComponent implements OnChanges, OnInit, AfterViewInit, OnDestroy {
  @Input() permissionRequest: PermissionRequestDisplay;
  @Input() activeAccount: Account;
  @Output() permissionResponse = new EventEmitter<string | null>();
  @ViewChild('dialog', { static: true }) private dialog: ElementRef<HTMLDialogElement>;
  @ViewChild('content', { static: true }) private content: ElementRef<HTMLElement>;
  @ViewChild(PermissionRequestDropdownComponent, { static: true }) private selector: PermissionRequestDropdownComponent;
  selectedAccount: ImplicitAccount | undefined;
  accounts: ImplicitAccount[] = [];
  readonly wrapFocus = wrapDialogFocus;
  private invokedDialog?: InvokedDialog;
  private responseSub?: Subscription;
  private walletSub?: Subscription;

  constructor(private walletService: WalletService, private messageService: MessageService, private subjectService: SubjectService, private router: Router) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (!changes.permissionRequest) return;
    this.closeDialog();
    if (!this.permissionRequest) return;
    this.accounts = this.walletService.wallet?.getImplicitAccounts() ?? [];
    this.selectedAccount = this.accounts.find((account) => account.address === this.activeAccount?.address) ?? this.accounts[0];
    this.messageService.removeBeaconMsg(true);
    this.responseSub = this.subjectService.beaconResponse.subscribe((response) => this.respond(response ? 'silent' : ''));
    this.invokedDialog?.open();
  }

  ngOnInit(): void {
    this.walletSub = this.subjectService.walletUpdated.subscribe(() => {
      const selectedAddress = this.selectedAccount?.address;
      this.accounts = this.walletService.wallet?.getImplicitAccounts() ?? [];
      this.selectedAccount = this.accounts.find((account) => account.address === selectedAddress);
    });
  }

  ngAfterViewInit(): void {
    this.invokedDialog = new InvokedDialog(this.dialog.nativeElement, this.content.nativeElement);
    if (this.responseSub) this.invokedDialog.open();
  }

  ngOnDestroy(): void {
    this.closeDialog();
    this.walletSub?.unsubscribe();
  }

  cancel(event: Event): void {
    event.preventDefault();
    this.rejectPermissions();
  }

  rejectPermissions(): void {
    this.respond(null);
  }

  grantPermissions(): void {
    const account = this.selectedAccount;
    if (!this.responseSub || !account?.pk) return;
    this.respond(account.pk);
    this.router.navigate([`/account/${account.address}`]);
  }

  private respond(response: string | null): void {
    if (!this.responseSub) return;
    this.closeDialog();
    this.permissionResponse.emit(response);
  }

  private closeDialog(): void {
    if (!this.responseSub) return;
    this.responseSub.unsubscribe();
    this.responseSub = undefined;
    this.selector?.closeDropdown();
    this.invokedDialog?.close({ restoreFocus: true });
  }
}
