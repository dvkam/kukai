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

describe('Header account picker', () => {
  it('associates each trigger with its own panel and returns focus after selection or Escape', fakeAsync(() => {
    const first = new ImplicitAccount('tz1burnburnburnburnburnburnburjAYjjX', '');
    const second = new ImplicitAccount('tz1VSUr8wwNhLAzempoch5d6hLRiTh8Cjcjb', '');
    TestBed.configureTestingModule({
      declarations: [AccountDropdownComponent, AccountPage],
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
    const fixtures = [TestBed.createComponent(AccountDropdownComponent), TestBed.createComponent(AccountDropdownComponent)];
    for (const fixture of fixtures) {
      fixture.componentRef.setInput('current', first);
      fixture.componentRef.setInput('options', [first, second]);
      fixture.detectChanges();
    }
    const [desktop, mobile] = fixtures;
    const trigger = desktop.nativeElement.querySelector('button.currentAddress') as HTMLButtonElement;
    const panel = desktop.nativeElement.querySelector('.dropdown-content') as HTMLElement;
    const otherTrigger = mobile.nativeElement.querySelector('button.currentAddress') as HTMLButtonElement;
    expect(trigger.getAttribute('aria-controls')).toBe(panel.id);
    expect(otherTrigger.getAttribute('aria-controls')).not.toBe(panel.id);
    expect(trigger.getAttribute('aria-label')).toContain(first.address);
    expect(panel.inert).toBeTrue();
    trigger.click();
    desktop.detectChanges();
    expect(panel.inert).toBeFalse();
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    const [current, alternative] = Array.from(panel.querySelectorAll('a'));
    expect(current.getAttribute('aria-current')).toBe('page');
    expect(alternative.getAttribute('aria-current')).toBeNull();
    current.focus();
    current.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    desktop.detectChanges();
    expect(document.activeElement).toBe(trigger);
    expect(panel.inert).toBeTrue();

    trigger.click();
    desktop.detectChanges();
    alternative.click();
    tick();
    desktop.detectChanges();
    expect(router.url).toBe('/account/' + second.address);
    expect(panel.inert).toBeTrue();
    expect(document.activeElement).toBe(trigger);
  }));
});
