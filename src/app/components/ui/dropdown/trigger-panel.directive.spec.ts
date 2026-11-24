import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TriggerPanelDirective } from './trigger-panel.directive';

@Component({
  standalone: true,
  imports: [TriggerPanelDirective],
  template: `<button #trigger>Options</button>
    <div class="panel" [class.open]="open" [walletPanelTrigger]="trigger" [panelOpen]="open">Choices</div>`,
  styles: [
    'button { position: absolute; left: 140px; top: 20px; } .panel { display: none; position: absolute; left: 80px; top: 65px; } .open { display: flex; }'
  ]
})
class ExamplePanel {
  open = false;
}

describe('TriggerPanelDirective', () => {
  let fixture: ComponentFixture<ExamplePanel>;
  let panel: HTMLElement;
  let trigger: HTMLElement;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [ExamplePanel] });
    fixture = TestBed.createComponent(ExamplePanel);
    fixture.detectChanges();
    panel = fixture.nativeElement.querySelector('.panel');
    trigger = fixture.nativeElement.querySelector('button');
  });

  function show(open: boolean): void {
    fixture.componentInstance.open = open;
    fixture.detectChanges();
  }

  it('uses the invoker coordinates and keeps a dismissed panel inert while it exits', async () => {
    spyOn(window, 'matchMedia').and.returnValue({ matches: false } as MediaQueryList);
    show(true);
    const entry = panel.getAnimations()[0];
    entry.finish();
    await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
    const source = trigger.getBoundingClientRect();
    const destination = panel.getBoundingClientRect();
    const origin = panel.style.transformOrigin.split(' ').map(parseFloat);
    expect(origin[0]).toBeCloseTo(source.left + source.width / 2 - destination.left, 1);
    expect(origin[1]).toBeCloseTo(source.top + source.height / 2 - destination.top, 1);
    show(false);
    expect(panel.inert).toBeTrue();
    expect(panel.getAnimations().length).toBe(1);
    show(true);
    expect(panel.inert).toBeFalse();
    expect(panel.getAnimations().length).toBe(1);
  });

  it('applies the open state immediately when the user requests reduced motion', () => {
    spyOn(window, 'matchMedia').and.returnValue({ matches: true } as MediaQueryList);
    show(true);
    expect(panel.getAnimations().length).toBe(0);
    expect(getComputedStyle(panel).display).toBe('flex');
    show(false);
    expect(getComputedStyle(panel).display).toBe('none');
    expect(panel.inert).toBeTrue();
  });
});
