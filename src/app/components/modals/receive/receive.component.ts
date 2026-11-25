import { ChangeDetectorRef, Component, ElementRef, ViewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationStart, Router } from '@angular/router';
import * as QRCode from 'qrcode';
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
  styleUrls: ['../../../../scss/components/modals/modal.scss', '../../../../scss/components/modals/receive.scss']
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
  private invokerBounds?: DOMRect;
  private motion?: Animation;

  constructor(private changeDetector: ChangeDetectorRef, private translate: TranslateService, router: Router) {
    super();
    router.events
      .pipe(
        filter((event) => event instanceof NavigationStart),
        takeUntilDestroyed()
      )
      .subscribe(() => this.dismiss(false, false));
  }

  override open(data: ReceiveData): void {
    const from = this.readMotionFrame();
    this.clearMotion();
    this.invocation = data;
    this.invokerBounds = data.invoker.getBoundingClientRect();
    this.activeAddress = data.address;
    this.copyStatus = '';
    const canvas = this.canvas.nativeElement;
    QRCode.toCanvas(canvas, this.activeAddress, { errorCorrectionLevel: 'H', color: { light: '#FCFCFC' } }, (error) => (canvas.hidden = !!error));
    this.changeDetector.detectChanges();
    const dialog = this.dialog.nativeElement;
    dialog.inert = false;
    dialog.showModal();
    this.isOpen = true;
    if (this.shouldAnimate()) this.animateContent(true, from);
  }

  override close(animate = false): void {
    const from = this.readMotionFrame();
    this.clearMotion();
    const dialog = this.dialog.nativeElement;
    const animateExit = animate && this.shouldAnimate();
    // Leave the top layer immediately and paint the inert content through its exit.
    dialog.classList.toggle('closing', animateExit);
    dialog.close();
    dialog.inert = true;
    this.isOpen = false;
    if (animateExit) this.animateContent(false, from);
    else this.releaseInvocation();
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
    if (!this.isOpen) {
      if (!animate) this.clearMotion();
      return;
    }
    const invocation = this.invocation;
    this.close(animate);
    if (ModalComponent.currentModel.value.name === this.name) {
      ModalComponent.currentModel.next({ name: '', data: null });
    }
    if (restoreFocus && invocation) {
      const { invoker, fallback } = invocation;
      for (const element of [invoker, ...fallback]) {
        element?.focus({ preventScroll: true });
        if (document.activeElement === element) break;
      }
    }
  }

  private shouldAnimate(): boolean {
    return !!this.content.nativeElement.animate && !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  private readMotionFrame(): Keyframe | undefined {
    if (!this.motion) return;
    const { transform, opacity } = getComputedStyle(this.content.nativeElement);
    return { transform, opacity };
  }

  private animateContent(opening: boolean, from?: Keyframe): void {
    const content = this.content.nativeElement;
    const collapsed = { transform: 'scale(0.96)', opacity: 0 };
    const expanded = { transform: 'scale(1)', opacity: 1 };
    this.alignOrigin();
    const motion = content.animate([from ?? (opening ? collapsed : expanded), opening ? expanded : collapsed], {
      duration: opening ? 200 : 160,
      easing: 'cubic-bezier(0.23, 1, 0.32, 1)',
      fill: 'both'
    });
    this.motion = motion;
    window.addEventListener('resize', this.alignOrigin);
    window.addEventListener('scroll', this.alignOrigin, true);
    motion.onfinish = () => {
      if (this.motion === motion) this.clearMotion();
    };
  }

  private readonly alignOrigin = (): void => {
    const invoker = this.invocation?.invoker;
    if (!invoker || !this.invokerBounds) return;
    // The mobile menu hides its QR button as soon as Receive opens.
    if (invoker.getClientRects().length) this.invokerBounds = invoker.getBoundingClientRect();
    const trigger = this.invokerBounds;
    const content = this.content.nativeElement;
    const effect = this.motion?.effect as KeyframeEffect | undefined;
    if (effect) effect.target = null;
    const bounds = content.getBoundingClientRect();
    content.style.transformOrigin = `${trigger.left + trigger.width / 2 - bounds.left}px ${trigger.top + trigger.height / 2 - bounds.top}px`;
    if (effect) effect.target = content;
  };

  private clearMotion(): void {
    window.removeEventListener('resize', this.alignOrigin);
    window.removeEventListener('scroll', this.alignOrigin, true);
    this.motion?.cancel();
    this.motion = undefined;
    this.dialog?.nativeElement.classList.remove('closing');
    if (!this.isOpen) this.releaseInvocation();
  }

  private releaseInvocation(): void {
    this.invocation = undefined;
    this.invokerBounds = undefined;
  }
}
