export interface DialogInvocation {
  invoker: HTMLButtonElement;
  invokerBounds?: DOMRectReadOnly;
  focusAfterClose?: readonly (HTMLElement | undefined)[];
}

const motionPanelEnter = 200;
const motionPanelExit = 160;
const easePanel = 'cubic-bezier(0.23, 1, 0.32, 1)';
const collapsed = { transform: 'scale(0.96)', opacity: 0 };
const expanded = { transform: 'scale(1)', opacity: 1 };

export class InvokedDialog {
  private invocation?: DialogInvocation;
  private invokerBounds?: DOMRectReadOnly;
  private motion?: Animation;

  constructor(private readonly dialog: HTMLDialogElement, private readonly content: HTMLElement) {}

  open(invocation: DialogInvocation): void {
    const from = this.readMotionFrame();
    this.clearMotion();
    this.invocation = invocation;
    this.invokerBounds = invocation.invokerBounds ?? invocation.invoker.getBoundingClientRect();
    this.dialog.inert = false;
    this.dialog.showModal();
    if (this.shouldAnimate()) this.animateContent(true, from);
  }

  close({ animate = false, restoreFocus = false } = {}): void {
    const invocation = this.invocation;
    const wasOpen = this.dialog.open;
    const from = this.readMotionFrame();
    this.clearMotion();
    const animateExit = wasOpen && animate && this.shouldAnimate();
    // Leave the top layer immediately. The inert panel can finish painting its exit.
    this.dialog.classList.toggle('closing', animateExit);
    this.dialog.close();
    this.dialog.inert = true;
    if (animateExit) this.animateContent(false, from);
    else this.releaseInvocation();

    if (wasOpen && restoreFocus && invocation) {
      for (const element of invocation.focusAfterClose ?? [invocation.invoker]) {
        if (!element?.isConnected || !element.getClientRects().length || element.closest('[hidden], [inert]')) continue;
        element.focus({ preventScroll: true });
        if (document.activeElement === element) break;
      }
    }
  }

  private shouldAnimate(): boolean {
    return !!this.content.animate && !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  private readMotionFrame(): Keyframe | undefined {
    if (!this.motion) return;
    const { transform, opacity } = getComputedStyle(this.content);
    return { transform, opacity };
  }

  private animateContent(opening: boolean, from?: Keyframe): void {
    this.alignOrigin();
    const motion = this.content.animate([from ?? (opening ? collapsed : expanded), opening ? expanded : collapsed], {
      duration: opening ? motionPanelEnter : motionPanelExit,
      easing: easePanel,
      fill: 'both'
    });
    this.motion = motion;
    window.addEventListener('resize', this.alignOrigin);
    window.addEventListener('scroll', this.alignOrigin, true);
    motion.onfinish = () => {
      if (this.motion !== motion) return;
      this.clearMotion();
      if (!this.dialog.open) this.releaseInvocation();
    };
  }

  private readonly alignOrigin = (): void => {
    if (!this.invocation || !this.invokerBounds) return;
    const { invoker, invokerBounds } = this.invocation;
    if (!invokerBounds && invoker.getClientRects().length && !invoker.closest('[inert]')) {
      this.invokerBounds = invoker.getBoundingClientRect();
    }
    const trigger = this.invokerBounds;
    const effect = this.motion?.effect as KeyframeEffect | undefined;
    if (effect) effect.target = null;
    const bounds = this.content.getBoundingClientRect();
    this.content.style.transformOrigin = `${trigger.left + trigger.width / 2 - bounds.left}px ${trigger.top + trigger.height / 2 - bounds.top}px`;
    if (effect) effect.target = this.content;
  };

  private clearMotion(): void {
    window.removeEventListener('resize', this.alignOrigin);
    window.removeEventListener('scroll', this.alignOrigin, true);
    this.motion?.cancel();
    this.motion = undefined;
    this.dialog.classList.remove('closing');
    this.content.style.removeProperty('transform-origin');
  }

  private releaseInvocation(): void {
    this.invocation = undefined;
    this.invokerBounds = undefined;
  }
}
