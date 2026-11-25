import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AdvancedToggleComponent } from './advanced.component';

@Component({
  template: `<app-ui-toggle-advanced [default]="true" [state]="enabled" (stateChange)="changes.push($event)" />`
})
class SwitchConsumer {
  enabled = false;
  changes: boolean[] = [];
}

describe('AdvancedToggleComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ declarations: [AdvancedToggleComponent, SwitchConsumer] });
  });

  it('uses the caller state even when it initially differs from the fallback default', () => {
    const fixture: ComponentFixture<SwitchConsumer> = TestBed.createComponent(SwitchConsumer);
    fixture.detectChanges();
    const button: HTMLButtonElement = fixture.nativeElement.querySelector('button');
    expect(button.getAttribute('role')).toBe('switch');
    expect(button.getAttribute('aria-checked')).toBe('false');
    expect(button.hasAttribute('aria-expanded')).toBeFalse();
    expect(button.hasAttribute('aria-controls')).toBeFalse();
    expect(fixture.componentInstance.changes).toEqual([]);

    fixture.componentInstance.enabled = true;
    fixture.detectChanges();
    expect(button.getAttribute('aria-checked')).toBe('true');
    expect(fixture.componentInstance.changes).toEqual([]);

    button.focus();
    button.click();
    fixture.detectChanges();
    expect(fixture.componentInstance.changes).toEqual([false]);
    expect(button.getAttribute('aria-checked')).toBe('false');
    expect(document.activeElement).toBe(button);
  });

  it('keeps the legacy default and accessible label when no state or nonempty text is supplied', () => {
    const fixture = TestBed.createComponent(AdvancedToggleComponent);
    fixture.componentRef.setInput('default', true);
    fixture.componentRef.setInput('text', '  ');
    fixture.componentRef.setInput('controls', ' ');
    fixture.detectChanges();
    const button: HTMLButtonElement = fixture.nativeElement.querySelector('button');
    expect(button.getAttribute('aria-label')).toBe('Advanced:');
    expect(button.getAttribute('aria-checked')).toBe('true');
    expect(button.hasAttribute('aria-controls')).toBeFalse();
    expect(button.type).toBe('button');
  });
});
