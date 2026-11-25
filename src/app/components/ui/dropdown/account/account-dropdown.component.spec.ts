import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { LookupService } from '../../../../services/lookup/lookup.service';
import { ImplicitAccount } from '../../../../services/wallet/wallet';
import { WalletService } from '../../../../services/wallet/wallet.service';
import { TriggerPanelDirective } from '../trigger-panel.directive';
import { AccountDropdownComponent } from './account-dropdown.component';

@Component({ template: '' })
class AccountPage {}

@Component({
  template: `
    <app-ui-dropdown-account [current]="accounts[0]" [options]="accounts"></app-ui-dropdown-account>
    <app-ui-dropdown-account [current]="accounts[0]" [options]="accounts"></app-ui-dropdown-account>
  `
})
class HeaderFixture {
  accounts: ImplicitAccount[] = [];
}

describe('Header account picker', () => {
  it('associates each trigger with its own panel and returns focus after selection or Escape', fakeAsync(() => {
    const first = new ImplicitAccount('tz1burnburnburnburnburnburnburjAYjjX', '');
    const second = new ImplicitAccount('tz1VSUr8wwNhLAzempoch5d6hLRiTh8Cjcjb', '');
    TestBed.configureTestingModule({
      declarations: [AccountDropdownComponent, AccountPage, HeaderFixture],
      imports: [CommonModule, TriggerPanelDirective, RouterTestingModule.withRoutes([{ path: 'account/:address', component: AccountPage }])],
      providers: [
        { provide: WalletService, useValue: {} },
        { provide: LookupService, useValue: { resolve: () => null } }
      ]
    });
    spyOn(window, 'matchMedia').and.returnValue({ matches: true } as MediaQueryList);
    const router = TestBed.inject(Router);
    router.navigateByUrl('/account/' + first.address);
    tick();
    const fixture = TestBed.createComponent(HeaderFixture);
    fixture.componentInstance.accounts = [first, second];
    fixture.detectChanges();
    const headers = (fixture.nativeElement as HTMLElement).querySelectorAll('app-ui-dropdown-account');
    const trigger = headers[0].querySelector<HTMLButtonElement>('button.currentAddress')!;
    const otherTrigger = headers[1].querySelector<HTMLButtonElement>('button.currentAddress')!;
    const panel = headers[0].querySelector<HTMLElement>('.dropdown-content')!;
    expect(trigger.getAttribute('aria-controls')).toBe(panel.id);
    expect(otherTrigger.getAttribute('aria-controls')).not.toBe(panel.id);
    expect(trigger.getAttribute('aria-label')).toContain(first.address);
    expect(panel.inert).toBeTrue();
    trigger.click();
    fixture.detectChanges();
    expect(panel.inert).toBeFalse();
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    const [current, alternative] = Array.from(panel.querySelectorAll('a'));
    expect(current.getAttribute('aria-current')).toBe('page');
    expect(alternative.getAttribute('aria-current')).toBeNull();
    current.focus();
    current.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    fixture.detectChanges();
    expect(document.activeElement).toBe(trigger);
    expect(panel.inert).toBeTrue();

    trigger.click();
    fixture.detectChanges();
    alternative.click();
    tick();
    fixture.detectChanges();
    expect(router.url).toBe('/account/' + second.address);
    expect(panel.inert).toBeTrue();
    expect(document.activeElement).toBe(trigger);
  }));
});
