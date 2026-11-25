import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LookupService } from '../../../../services/lookup/lookup.service';
import { ImplicitAccount } from '../../../../services/wallet/wallet';
import { WalletService } from '../../../../services/wallet/wallet.service';
import { TriggerPanelDirective } from '../trigger-panel.directive';
import { PermissionRequestDropdownComponent } from './permission-request.component';

const first = new ImplicitAccount('tz1burnburnburnburnburnburnburjAYjjX', '');
const second = new ImplicitAccount('tz1VSUr8wwNhLAzempoch5d6hLRiTh8Cjcjb', '');

@Component({
  template: `
    <app-ui-dropdown-permission-request [options]="accounts" [current]="accounts[0]" (dropdownResponse)="choose($event)"> </app-ui-dropdown-permission-request>
  `
})
class SelectorHost {
  readonly accounts = [first, second];
  readonly choices: ImplicitAccount[] = [];

  choose(account: ImplicitAccount): void {
    this.choices.push(account);
  }
}

describe('Staged account selector', () => {
  let fixture: ComponentFixture<SelectorHost>;
  let trigger: HTMLButtonElement;
  let panel: HTMLElement;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [PermissionRequestDropdownComponent, SelectorHost],
      imports: [CommonModule, TriggerPanelDirective],
      providers: [
        { provide: WalletService, useValue: {} },
        { provide: LookupService, useValue: { resolve: () => null } }
      ]
    });
    spyOn(window, 'matchMedia').and.returnValue({ matches: true } as MediaQueryList);
    fixture = TestBed.createComponent(SelectorHost);
    fixture.detectChanges();

    const host: HTMLElement = fixture.nativeElement;
    trigger = host.querySelector('button[aria-expanded]')!;
    panel = host.querySelector(`#${trigger.getAttribute('aria-controls')}`)!;
  });

  it('opens the account choices without making a selection', () => {
    trigger.click();
    fixture.detectChanges();

    expect(panel.inert).toBeFalse();
    expect(fixture.componentInstance.choices).toEqual([]);
  });

  it('returns focus to the trigger when the focused account is removed', () => {
    trigger.click();
    fixture.detectChanges();
    const choice = Array.from(panel.querySelectorAll('button')).find((button) => button.textContent.includes(second.address))!;
    choice.focus();
    expect(document.activeElement).toBe(choice);

    fixture.componentInstance.accounts.splice(1, 1);
    fixture.detectChanges();

    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(trigger);
    expect(fixture.componentInstance.choices).toEqual([]);
  });
});
