import { Directive, ElementRef, Input, OnChanges, OnDestroy, SimpleChanges } from '@angular/core';

@Directive({
  selector: '[walletPanelTrigger]',
  standalone: true,
  host: { '[attr.inert]': 'panelOpen ? null : ""' }
})
export class TriggerPanelDirective implements OnChanges, OnDestroy {
  @Input({ required: true }) walletPanelTrigger!: HTMLElement;
  @Input({ required: true }) panelOpen!: boolean;
  private motion?: Animation;

  constructor(private readonly host: ElementRef<HTMLElement>) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (!changes.panelOpen || (changes.panelOpen.firstChange && !this.panelOpen)) return;
    const panel = this.host.nativeElement;
    if (!panel.animate || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      this.clearMotion();
      return;
    }

    if (this.motion) {
      this.motion.reverse();
      return;
    }

    // Keep the panel measurable through exit. The template's expanded class owns its resting display.
    panel.style.display = 'flex';
    const bounds = panel.getBoundingClientRect();
    const trigger = this.walletPanelTrigger.getBoundingClientRect();
    panel.style.transformOrigin = `${trigger.left + trigger.width / 2 - bounds.left}px ${trigger.top + trigger.height / 2 - bounds.top}px`;
    const frames = [
      { transform: 'scale(0.96)', opacity: 0 },
      { transform: 'scale(1)', opacity: 1 }
    ];
    const motion = panel.animate(frames, {
      duration: 160,
      easing: 'cubic-bezier(0.23, 1, 0.32, 1)',
      direction: this.panelOpen ? 'normal' : 'reverse',
      fill: 'both'
    });
    this.motion = motion;
    motion.onfinish = () => {
      if (this.motion === motion) this.clearMotion();
    };
  }

  ngOnDestroy(): void {
    this.clearMotion();
  }

  private clearMotion(): void {
    this.motion?.cancel();
    this.motion = undefined;
    this.host.nativeElement.style.removeProperty('display');
  }
}
