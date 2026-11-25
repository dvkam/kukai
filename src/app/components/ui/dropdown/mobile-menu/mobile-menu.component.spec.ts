import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { TranslateService } from '@ngx-translate/core';
import { LookupService } from '../../../../services/lookup/lookup.service';
import { MessageService } from '../../../../services/message/message.service';
import { SubjectService } from '../../../../services/subject/subject.service';
import { UnlockableService } from '../../../../services/unlockable/unlockable.service';
import { WalletService } from '../../../../services/wallet/wallet.service';
import { TriggerPanelDirective } from '../trigger-panel.directive';
import { MobileMenuDropdownComponent } from './mobile-menu.component';

@Component({ template: '' })
class Destination {}

@Component({
  template: `
    <app-ui-mobile-menu *ngIf="showMenu"></app-ui-mobile-menu>
    <a routerLink="/" data-new-wallet-back><span>Back</span></a>
    <a routerLink="/import" id="other-destination">Other destination</a>
  `
})
class NavigationHost {
  showMenu = true;
}

describe('Mobile navigation destinations', () => {
  let fixture: ComponentFixture<NavigationHost>;
  let router: Router;
  let trigger: HTMLButtonElement;
  let panel: HTMLElement;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [Destination, MobileMenuDropdownComponent, NavigationHost],
      imports: [
        CommonModule,
        TriggerPanelDirective,
        RouterTestingModule.withRoutes([
          { path: '', component: Destination },
          { path: 'import', component: Destination },
          { path: 'new-wallet', component: Destination }
        ])
      ],
      providers: [WalletService, LookupService, MessageService, SubjectService, TranslateService, UnlockableService].map((provide) => ({
        provide,
        useValue: {}
      }))
    });
    spyOn(window, 'matchMedia').and.returnValue({ matches: true } as MediaQueryList);
    fixture = TestBed.createComponent(NavigationHost);
    router = TestBed.inject(Router);
    fixture.detectChanges();
    trigger = fixture.nativeElement.querySelector('.menu-trigger');
    panel = fixture.nativeElement.querySelector('#wallet-navigation-panel');
  });

  function sendClick(target: Element, detail: number, clientX = 194): void {
    target.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, detail, clientX, clientY: 157 }));
    tick();
    fixture.detectChanges();
  }

  function followCreateWallet(): void {
    trigger.click();
    fixture.detectChanges();
    sendClick(panel.querySelector('a[href="/new-wallet"]')!, 1);
    expect(router.url).toBe('/new-wallet');
    expect(panel.inert).toBeTrue();
  }

  it('closes the menu when a user follows Import Wallet', fakeAsync(() => {
    trigger.click();
    fixture.detectChanges();
    expect(panel.inert).toBeFalse();
    panel.querySelector('a')!.click();
    tick();
    fixture.detectChanges();
    expect(router.url).toBe('/import');
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(panel.inert).toBeTrue();
    trigger.click();
    fixture.detectChanges();
    const sameDestination = panel.querySelector('a')!;
    sameDestination.focus();
    sameDestination.click();
    tick();
    fixture.detectChanges();
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(panel.inert).toBeTrue();
    expect(document.activeElement).toBe(trigger);
  }));

  it('ignores a repeated click on Back at the point where Create New Wallet was clicked', fakeAsync(() => {
    const back = fixture.nativeElement.querySelector('[data-new-wallet-back] span');
    followCreateWallet();
    sendClick(back, 2);
    expect(router.url).toBe('/new-wallet');
    sendClick(back, 1);
    expect(router.url).toBe('/');
  }));

  it('allows Back at a different point or by keyboard', fakeAsync(() => {
    const back = fixture.nativeElement.querySelector('[data-new-wallet-back]');
    followCreateWallet();
    sendClick(back, 2, 195);
    expect(router.url).toBe('/');
    followCreateWallet();
    back.focus();
    back.click();
    tick();
    expect(router.url).toBe('/');
  }));

  it('allows a different control at the same point', fakeAsync(() => {
    followCreateWallet();
    sendClick(fixture.nativeElement.querySelector('#other-destination'), 2);
    expect(router.url).toBe('/import');
  }));

  it('allows Back after the menu is removed', fakeAsync(() => {
    const back = fixture.nativeElement.querySelector('[data-new-wallet-back]');
    followCreateWallet();
    fixture.componentInstance.showMenu = false;
    fixture.detectChanges();
    sendClick(back, 2);
    expect(router.url).toBe('/');
  }));
});
