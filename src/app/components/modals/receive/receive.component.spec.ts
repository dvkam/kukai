import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NavigationStart, Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { Subject } from 'rxjs';
import { ModalComponent } from '../modal.component';
import { ReceiveComponent } from './receive.component';

const address = 'tz1WXDeZmSpaCCJqes9GknbeUtdKhJJ8QDA2';

@Component({
  template: `<button class="menu">Wallet navigation</button>
    <button class="trigger" style="position: fixed; top: 30px; left: 150px">Receive address</button>
    <button class="background">Background action</button>
    <app-receive></app-receive>`
})
class ReceiveHostComponent {}

describe('ReceiveComponent', () => {
  let fixture: ComponentFixture<ReceiveHostComponent>;
  let trigger: HTMLButtonElement;
  let menu: HTMLButtonElement;
  let events: Subject<NavigationStart>;

  beforeEach(() => {
    events = new Subject();
    TestBed.configureTestingModule({
      declarations: [ReceiveComponent, ReceiveHostComponent],
      providers: [
        { provide: Router, useValue: { events } },
        { provide: TranslateService, useValue: { instant: () => 'copied to clipboard' } }
      ]
    });
    fixture = TestBed.createComponent(ReceiveHostComponent);
    fixture.detectChanges();
    trigger = fixture.nativeElement.querySelector('.trigger');
    menu = fixture.nativeElement.querySelector('.menu');
  });

  afterEach(() => ModalComponent.currentModel.next({ name: '', data: null }));

  function open(): HTMLDialogElement {
    trigger.focus();
    ModalComponent.currentModel.next({ name: 'receive', data: { address, invoker: trigger, fallback: [menu] } });
    fixture.detectChanges();
    return fixture.nativeElement.querySelector('dialog');
  }

  function tab(button: HTMLButtonElement, shiftKey = false): void {
    const event = new KeyboardEvent('keydown', { key: 'Tab', shiftKey, cancelable: true, bubbles: true });
    button.dispatchEvent(event);
    expect(event.defaultPrevented).toBeTrue();
  }

  it('names the dialog and actions, wraps focus, copies the address and restores focus on dismissal', async () => {
    const writeText = spyOn(navigator.clipboard, 'writeText').and.resolveTo();
    const dialog = open();
    expect(dialog).not.toBeNull();
    if (!dialog) return;
    const title = dialog.querySelector('h1');
    expect(dialog.getAttribute('aria-labelledby')).toBe(title.id);
    expect(title.textContent).toBe('Receive Address');
    expect(dialog.open).toBeTrue();
    expect(dialog.querySelector('canvas').width).not.toBe(300);
    const close = dialog.querySelector<HTMLButtonElement>('button[aria-label="Close"]');
    const copy = dialog.querySelector<HTMLButtonElement>('button[aria-label="Copy address"]');
    fixture.nativeElement.querySelector('.background').focus();
    expect(document.activeElement).toBe(close);
    tab(close, true);
    expect(document.activeElement).toBe(copy);
    tab(copy);
    expect(document.activeElement).toBe(close);
    copy.click();
    await fixture.whenStable();
    expect(writeText).toHaveBeenCalledOnceWith(address);
    expect(dialog.querySelector('[role="status"]').textContent).toBe('copied to clipboard');
    dialog.dispatchEvent(new Event('cancel', { cancelable: true }));
    expect(dialog.open).toBeFalse();
    expect(document.activeElement).toBe(trigger);
  });

  it('returns focus to the menu button if the QR action disappears and closes on navigation', () => {
    const dialog = open();
    expect(dialog).not.toBeNull();
    if (!dialog) return;
    trigger.hidden = true;
    dialog.querySelector<HTMLButtonElement>('button[aria-label="Close"]').click();
    expect(document.activeElement).toBe(menu);
    trigger.hidden = false;
    open();
    events.next(new NavigationStart(1, '/account/other'));
    expect(dialog.open).toBeFalse();
  });

  it('closes when another modal opens and keeps that request active', () => {
    const dialog = open();
    expect(dialog).not.toBeNull();
    if (!dialog) return;
    ModalComponent.currentModel.next({ name: 'sign-expr', data: null });
    expect(dialog.open).toBeFalse();
    expect(ModalComponent.currentModel.value.name).toBe('sign-expr');
  });

  it('keeps a late clipboard result out of a newly opened dialog', async () => {
    let completeCopy: () => void;
    spyOn(navigator.clipboard, 'writeText').and.returnValue(new Promise<void>((resolve) => (completeCopy = resolve)));
    const dialog = open();
    dialog.querySelector<HTMLButtonElement>('button[aria-label="Copy address"]').click();
    events.next(new NavigationStart(1, '/account/other'));
    open();
    completeCopy();
    await fixture.whenStable();
    expect(dialog.querySelector('[role="status"]').textContent).toBe('');
  });

  it('leaves the address selected for manual copying when clipboard access fails', async () => {
    spyOn(navigator.clipboard, 'writeText').and.callFake(() => new Promise<void>((_, reject) => setTimeout(() => reject(new Error('Clipboard denied')), 0)));
    spyOn(document, 'execCommand').and.throwError('Copy denied');
    const dialog = open();
    dialog.querySelector<HTMLButtonElement>('button[aria-label="Copy address"]').click();
    await fixture.whenStable();
    expect(document.getSelection().toString()).toBe(address);
    expect(dialog.querySelector('[role="status"]').textContent).toBe('Copy the address manually.');
    document.getSelection().removeAllRanges();
  });

  it('anchors the motion to the invoker and closes the modal immediately during a close and reopen', () => {
    spyOn(window, 'matchMedia').and.returnValue({ matches: false } as MediaQueryList);
    const dialog = open();
    expect(dialog).not.toBeNull();
    if (!dialog) return;
    const content = dialog.querySelector<HTMLElement>('.content');
    const [entry] = content.getAnimations();
    expect(entry).toBeDefined();
    entry.finish();
    const bounds = content.getBoundingClientRect();
    const source = trigger.getBoundingClientRect();
    const [x, y] = content.style.transformOrigin.split(' ').map(parseFloat);
    expect(x + bounds.left).toBeCloseTo(source.left + source.width / 2, 1);
    expect(y + bounds.top).toBeCloseTo(source.top + source.height / 2, 1);
    dialog.querySelector<HTMLButtonElement>('button[aria-label="Close"]').dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1 }));
    expect(dialog.open).toBeFalse();
    expect(dialog.inert).toBeTrue();
    expect(document.activeElement).toBe(trigger);
    expect(content.getAnimations().length).toBe(1);
    open();
    expect(dialog.open).toBeTrue();
    expect(dialog.inert).toBeFalse();
    expect(content.getAnimations().length).toBe(1);
    const reversal = content.getAnimations()[0].effect as KeyframeEffect;
    expect(Number(reversal.getKeyframes()[0].opacity)).toBeGreaterThan(0);
    dialog.querySelector<HTMLButtonElement>('button[aria-label="Close"]').click();
    expect(content.getAnimations().length).toBe(1);
    events.next(new NavigationStart(1, '/account/other'));
    expect(content.getAnimations().length).toBe(0);
  });

  it('opens and dismisses without movement when reduced motion is requested', () => {
    spyOn(window, 'matchMedia').and.returnValue({ matches: true } as MediaQueryList);
    const dialog = open();
    expect(dialog).not.toBeNull();
    if (!dialog) return;
    expect(dialog.getAnimations({ subtree: true }).length).toBe(0);
    expect(document.activeElement).toBe(dialog.querySelector('button[aria-label="Close"]'));
    dialog.querySelector<HTMLButtonElement>('button[aria-label="Close"]').dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1 }));
    expect(dialog.open).toBeFalse();
    expect(dialog.getAnimations({ subtree: true }).length).toBe(0);
  });
});
