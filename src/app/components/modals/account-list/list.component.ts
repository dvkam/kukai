import { ChangeDetectorRef, Component, ElementRef, Input, ViewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationStart, Router } from '@angular/router';
import { filter } from 'rxjs/operators';
import { Account } from '../../../services/wallet/wallet';
import { DialogInvocation, InvokedDialog } from '../invoked-dialog';
import { ModalComponent } from '../modal.component';
import { AccountListBodyComponent } from './body/body.component';

@Component({
  selector: 'app-account-list',
  templateUrl: './list.component.html',
  styleUrls: ['../../../../scss/components/modals/invoked-dialog.scss', '../../../../scss/components/modals/account-list-dialog.scss']
})
export class AccountListComponent extends ModalComponent {
  @Input({ required: true }) title: string;
  @Input() activeAccount: Account | null = null;
  @ViewChild('dialog', { static: true }) private dialog: ElementRef<HTMLDialogElement>;
  @ViewChild('content', { static: true }) private content: ElementRef<HTMLElement>;
  @ViewChild('closeButton', { static: true }) private closeButton: ElementRef<HTMLButtonElement>;
  @ViewChild(AccountListBodyComponent, { static: true }) private body: AccountListBodyComponent;
  override name = 'account-list';
  private invokedDialog: InvokedDialog;

  constructor(private readonly changeDetector: ChangeDetectorRef, router: Router) {
    super();
    router.events
      .pipe(
        filter((event) => event instanceof NavigationStart),
        takeUntilDestroyed()
      )
      .subscribe(() => this.dismiss());
  }

  override ngOnInit(): void {
    this.invokedDialog = new InvokedDialog(this.dialog.nativeElement, this.content.nativeElement);
  }

  override open(invocation: DialogInvocation): void {
    this.body.prepareToOpen();
    this.changeDetector.detectChanges();
    this.invokedDialog.open(invocation);
    this.body.revealCurrentAccount();
    this.isOpen = true;
  }

  override close(animate = false, restoreFocus = false): void {
    this.invokedDialog?.close({ animate, restoreFocus });
    if (this.isOpen) this.body.resetCopyStatus();
    this.isOpen = false;
  }

  override ngOnDestroy(): void {
    this.dismiss();
    super.ngOnDestroy();
  }

  closeModal(): void {
    this.dismiss(true, true);
  }

  cancel(event: Event): void {
    event.preventDefault();
    this.dismiss(false, true);
  }

  wrapFocus(event: KeyboardEvent): void {
    const close = this.closeButton.nativeElement;
    const copyButtons = this.dialog.nativeElement.querySelectorAll<HTMLButtonElement>('.copy-address');
    const last = copyButtons[copyButtons.length - 1] ?? close;
    if (event.shiftKey ? event.target === close : event.target === last) {
      event.preventDefault();
      (event.shiftKey ? last : close).focus();
    }
  }

  private dismiss(animate = false, restoreFocus = false): void {
    const wasOpen = this.isOpen;
    this.close(animate, restoreFocus);
    if (wasOpen && ModalComponent.currentModel.value.name === this.name) {
      ModalComponent.currentModel.next({ name: '', data: null });
    }
  }
}
