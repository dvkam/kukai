import { ChangeDetectorRef, Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { Subscription } from 'rxjs';
import { skip } from 'rxjs/operators';
import { SubjectService } from '../../../services/subject/subject.service';
import { WalletConnectService } from '../../../services/wallet-connect/wallet-connect.service';
import { WalletService } from '../../../services/wallet/wallet.service';
import { ImplicitAccount } from '../../../services/wallet/wallet';
import { PermissionRequestDropdownComponent } from '../../ui/dropdown/permission-request/permission-request.component';
import { DialogInvocation, InvokedDialog } from '../invoked-dialog';
import { wrapDialogFocus } from '../modal-focus';
import { ModalComponent } from '../modal.component';

export interface SessionSelectData {
  topic: string;
  preSelectedAccountAddress?: string;
  invocation?: DialogInvocation;
}

@Component({
  selector: 'app-session-select',
  templateUrl: './session-select.component.html',
  styleUrls: [
    '../../../../scss/components/modals/modal.scss',
    '../../../../scss/components/modals/invoked-dialog.scss',
    '../../../../scss/components/modals/account-selection-dialog.scss'
  ]
})
export class SessionSelectComponent implements OnInit, OnDestroy {
  @ViewChild('dialog', { static: true }) private dialog: ElementRef<HTMLDialogElement>;
  @ViewChild('content', { static: true }) private content: ElementRef<HTMLElement>;
  @ViewChild(PermissionRequestDropdownComponent, { static: true }) private selector: PermissionRequestDropdownComponent;
  selectedAccount: ImplicitAccount | undefined;
  accounts: ImplicitAccount[] = [];
  readonly wrapFocus = wrapDialogFocus;
  private readonly name = 'session-select';
  private topic?: string;
  private invokedDialog: InvokedDialog;
  private subscriptions = new Subscription();

  constructor(
    private walletService: WalletService,
    private subjectService: SubjectService,
    private walletConnectService: WalletConnectService,
    private changeDetector: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.invokedDialog = new InvokedDialog(this.dialog.nativeElement, this.content.nativeElement);
    this.subscriptions.add(this.subjectService.walletUpdated.subscribe(() => this.loadAccounts(this.selectedAccount?.address)));
    // Only handle live openings. Settings and the URI handler dispatch them after this view is rendered.
    this.subscriptions.add(
      ModalComponent.currentModel.pipe(skip(1)).subscribe(({ name, data, forceClose }) => {
        if (name === this.name && data?.topic && !this.dialog.nativeElement.open) {
          this.open(data);
        } else if (name !== this.name && forceClose !== false && this.dialog.nativeElement.open) {
          this.close(false);
        }
      })
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
    this.dismiss(false);
  }

  cancel(event: Event): void {
    event.preventDefault();
    this.dismiss(false);
  }

  dismiss(animate = true): void {
    this.close(animate);
    if (ModalComponent.currentModel.value.name === this.name) {
      ModalComponent.currentModel.next({ name: '', data: null });
    }
  }

  changeAddress(): void {
    const publicKey = this.selectedAccount?.pk;
    if (!this.dialog.nativeElement.open || !this.topic || !publicKey) return;
    const topic = this.topic;
    this.dismiss();
    this.walletConnectService.updateSession(topic, publicKey);
  }

  private open(data: SessionSelectData): void {
    this.topic = data.topic;
    this.loadAccounts(data.preSelectedAccountAddress);
    this.changeDetector.detectChanges();
    this.invokedDialog.open(data.invocation);
  }

  private close(animate: boolean): void {
    this.topic = undefined;
    this.selector.closeDropdown();
    this.invokedDialog.close({ animate, restoreFocus: true });
  }

  private loadAccounts(address?: string): void {
    this.accounts = this.walletService.wallet?.getImplicitAccounts() ?? [];
    this.selectedAccount = this.accounts.find((account) => account.address === address);
  }
}
