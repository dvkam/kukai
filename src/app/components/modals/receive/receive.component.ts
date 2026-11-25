import { ChangeDetectorRef, Component, ElementRef, ViewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationStart, Router } from '@angular/router';
import * as QRCode from 'qrcode';
import { InvokedDialog } from '../invoked-dialog';
import { ModalComponent } from '../modal.component';
import { TranslateService } from '@ngx-translate/core';
import { filter } from 'rxjs/operators';

export interface ReceiveData {
  address: string;
  invoker: HTMLButtonElement;
  fallback: (HTMLButtonElement | undefined)[];
}

@Component({
  selector: 'app-receive',
  templateUrl: './receive.component.html',
  styleUrls: [
    '../../../../scss/components/modals/modal.scss',
    '../../../../scss/components/modals/invoked-dialog.scss',
    '../../../../scss/components/modals/receive.scss'
  ]
})
export class ReceiveComponent extends ModalComponent {
  @ViewChild('dialog', { static: true }) private dialog: ElementRef<HTMLDialogElement>;
  @ViewChild('content', { static: true }) private content: ElementRef<HTMLElement>;
  @ViewChild('canvas', { static: true }) private canvas: ElementRef<HTMLCanvasElement>;
  @ViewChild('address', { static: true }) private address: ElementRef<HTMLElement>;
  @ViewChild('closeButton', { static: true }) private closeButton: ElementRef<HTMLButtonElement>;
  @ViewChild('copyButton', { static: true }) private copyButton: ElementRef<HTMLButtonElement>;
  activeAddress: string;
  copyStatus = '';
  name = 'receive';
  private invocation?: ReceiveData;
  private invokedDialog: InvokedDialog;

  constructor(private changeDetector: ChangeDetectorRef, private translate: TranslateService, router: Router) {
    super();
    router.events
      .pipe(
        filter((event) => event instanceof NavigationStart),
        takeUntilDestroyed()
      )
      .subscribe(() => this.dismiss(false, false));
  }

  override ngOnInit(): void {
    this.invokedDialog = new InvokedDialog(this.dialog.nativeElement, this.content.nativeElement);
  }

  override open(data: ReceiveData): void {
    this.invocation = data;
    this.activeAddress = data.address;
    this.copyStatus = '';
    const canvas = this.canvas.nativeElement;
    QRCode.toCanvas(canvas, this.activeAddress, { errorCorrectionLevel: 'H', color: { light: '#FCFCFC' } }, (error) => (canvas.hidden = !!error));
    this.changeDetector.detectChanges();
    this.invokedDialog.open({ invoker: data.invoker, focusAfterClose: [data.invoker, ...data.fallback] });
    this.isOpen = true;
  }

  override close(animate = false, restoreFocus = false): void {
    this.invokedDialog?.close({ animate, restoreFocus });
    this.invocation = undefined;
    this.isOpen = false;
  }

  override ngOnDestroy(): void {
    this.dismiss(false, false);
    super.ngOnDestroy();
  }

  closeModal(): void {
    this.dismiss(true);
  }

  cancel(event: Event): void {
    event.preventDefault();
    this.dismiss(false);
  }

  wrapFocus(event: KeyboardEvent): void {
    const close = this.closeButton.nativeElement;
    const copy = this.copyButton.nativeElement;
    if (event.shiftKey ? event.target === close : event.target === copy) {
      event.preventDefault();
      (event.shiftKey ? copy : close).focus();
    }
  }

  async copy(): Promise<void> {
    const invocation = this.invocation;
    if (!this.isOpen || !invocation) return;
    let copied = true;
    try {
      await navigator.clipboard.writeText(invocation.address);
    } catch {
      if (!this.isOpen || this.invocation !== invocation) return;
      copied = this.copySelectedAddress();
    }
    if (!this.isOpen || this.invocation !== invocation) return;
    this.copyStatus = copied ? this.translate.instant('OVERVIEWCOMPONENT.COPIEDTOCLIPBOARD') : 'Copy the address manually.';
    this.changeDetector.detectChanges();
  }

  private copySelectedAddress(): boolean {
    const selection = document.getSelection();
    if (!selection) return false;
    const range = document.createRange();
    range.selectNodeContents(this.address.nativeElement);
    selection.removeAllRanges();
    selection.addRange(range);
    try {
      if (!document.execCommand('copy')) return false;
      selection.removeAllRanges();
      return true;
    } catch {
      return false;
    }
  }

  private dismiss(animate: boolean, restoreFocus = true): void {
    if (!this.isOpen && animate) return;
    const wasOpen = this.isOpen;
    this.close(animate, restoreFocus);
    if (wasOpen && ModalComponent.currentModel.value.name === this.name) {
      ModalComponent.currentModel.next({ name: '', data: null });
    }
  }
}
