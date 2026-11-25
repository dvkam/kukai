import { CommonModule } from '@angular/common';
import { Component, ElementRef, ViewChild } from '@angular/core';
import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { TranslateService } from '@ngx-translate/core';
import { BehaviorSubject } from 'rxjs';
import { RemoveCommaPipe } from '../../../pipes/remove-comma.pipe';
import { LookupService } from '../../../services/lookup/lookup.service';
import { SubjectService } from '../../../services/subject/subject.service';
import { ImplicitAccount, Wallet } from '../../../services/wallet/wallet';
import { WalletService } from '../../../services/wallet/wallet.service';
import { AccountDropdownComponent } from '../../ui/dropdown/account/account-dropdown.component';
import { TriggerPanelDirective } from '../../ui/dropdown/trigger-panel.directive';
import type { DialogInvocation } from '../invoked-dialog';
import { ModalComponent } from '../modal.component';
import { AccountListBodyComponent } from './body/body.component';
import { AccountListComponent } from './list.component';

const first = new ImplicitAccount('tz1burnburnburnburnburnburnburjAYjjX', '');
const second = new ImplicitAccount('tz1VSUr8wwNhLAzempoch5d6hLRiTh8Cjcjb', '');

@Component({ template: '' })
class AccountPage {}

@Component({
  template: `<app-ui-dropdown-account [options]="accounts" [current]="current" (showAccounts)="showAccounts($event)"></app-ui-dropdown-account>
    <button #alternatePicker>Switch account</button>
    <app-account-list title="Accounts" [activeAccount]="current"></app-account-list>`
})
class AccountListHost {
  @ViewChild('alternatePicker') alternatePicker: ElementRef<HTMLButtonElement>;
  accounts = [first, second];
  current = first;

  showAccounts(data: DialogInvocation): void {
    const focusAfterClose = [...(data.focusAfterClose ?? []), this.alternatePicker.nativeElement];
    ModalComponent.currentModel.next({ name: 'account-list', data: { ...data, focusAfterClose } satisfies DialogInvocation });
  }
}

describe('Show All accounts', () => {
  let fixture: ComponentFixture<AccountListHost>;
  let router: Router;
  let wallet: Wallet;
  let walletUpdated: BehaviorSubject<null>;

  beforeEach(() => {
    wallet = new Wallet();
    wallet.implicitAccounts = [first, second];
    walletUpdated = new BehaviorSubject(null);
    TestBed.configureTestingModule({
      declarations: [AccountListHost, AccountPage, AccountDropdownComponent, AccountListComponent, AccountListBodyComponent, RemoveCommaPipe],
      imports: [CommonModule, TriggerPanelDirective, RouterTestingModule.withRoutes([{ path: 'account/:address/settings', component: AccountPage }])],
      providers: [
        { provide: WalletService, useValue: { wallet } },
        { provide: SubjectService, useValue: { walletUpdated } },
        { provide: LookupService, useValue: { resolve: () => null } },
        { provide: TranslateService, useValue: { instant: () => 'copied to clipboard' } }
      ]
    });
    router = TestBed.inject(Router);
    fixture = TestBed.createComponent(AccountListHost);
  });

  afterEach(() => {
    ModalComponent.currentModel.next({ name: '', data: null });
    document.getSelection()?.removeAllRanges();
  });

  function open(): { picker: HTMLButtonElement; dialog: HTMLDialogElement; source: DOMRect } {
    fixture.detectChanges();
    const picker: HTMLButtonElement = fixture.nativeElement.querySelector('.currentAddress');
    picker.focus();
    picker.click();
    fixture.detectChanges();
    const showAll: HTMLButtonElement = fixture.nativeElement.querySelector('button.show-all');
    showAll.focus();
    const source = showAll.getBoundingClientRect();
    showAll.click();
    fixture.detectChanges();
    return { picker, source, dialog: fixture.nativeElement.querySelector('dialog') };
  }

  it('opens a named dialog, keeps copy separate from navigation, and restores focus after the current account is selected', fakeAsync(() => {
    spyOn(window, 'matchMedia').and.returnValue({ matches: true } as MediaQueryList);
    const writeText = spyOn(navigator.clipboard, 'writeText').and.resolveTo();
    const start = `/account/${first.address}/settings?view=details#balance`;
    router.navigateByUrl(start);
    tick();
    const { picker, dialog } = open();
    expect(dialog).withContext('Show All opens a native dialog').not.toBeNull();
    expect(dialog.open).toBeTrue();
    expect(dialog.querySelector('h1').id).toBe(dialog.getAttribute('aria-labelledby'));
    const close = dialog.querySelector<HTMLButtonElement>('button[aria-label="Close"]');
    expect(document.activeElement).toBe(close);
    picker.focus();
    expect(document.activeElement).toBe(close);
    const selected = dialog.querySelector<HTMLAnchorElement>('a[aria-current="page"]');
    expect(selected.getAttribute('href')).toBe(start);
    const copyButtons = dialog.querySelectorAll<HTMLButtonElement>('button[aria-label^="Copy address"]');
    expect(copyButtons.length).toBe(2);
    expect(copyButtons[0].closest('a')).toBeNull();
    copyButtons[0].click();
    tick();
    expect(writeText).toHaveBeenCalledOnceWith(first.address);
    expect(dialog.open).toBeTrue();
    expect(router.url).toBe(start);
    selected.click();
    tick();
    expect(dialog.open).toBeFalse();
    expect(document.activeElement).toBe(picker);
    expect(router.url).toBe(start);
  }));

  it('keeps the hidden Show All origin during resize and dismisses before the exit animation finishes', fakeAsync(() => {
    spyOn(window, 'matchMedia').and.returnValue({ matches: false } as MediaQueryList);
    router.navigateByUrl(`/account/${first.address}/settings`);
    tick();
    const { picker, dialog, source } = open();
    const content = dialog.querySelector<HTMLElement>('.content');
    const [entry] = content.getAnimations();
    expect(entry).toBeDefined();
    entry.pause();
    entry.currentTime = 80;
    // The original button is now inert and disappears. Move the dialog's resting box.
    expect(fixture.nativeElement.querySelector('.dropdown-content').inert).toBeTrue();
    content.style.marginLeft = '37px';
    window.dispatchEvent(new Event('resize'));
    const effect = entry.effect as KeyframeEffect;
    effect.target = null;
    const bounds = content.getBoundingClientRect();
    effect.target = content;
    const [x, y] = content.style.transformOrigin.split(' ').map(parseFloat);
    expect(x + bounds.left).toBeCloseTo(source.left + source.width / 2, 1);
    expect(y + bounds.top).toBeCloseTo(source.top + source.height / 2, 1);
    dialog.querySelector<HTMLButtonElement>('.close').click();
    expect(dialog.open).toBeFalse();
    expect(dialog.inert).toBeTrue();
    expect(document.activeElement).toBe(picker);
    expect(content.getAnimations().length).toBe(1);
    open();
    const reversal = content.getAnimations()[0].effect as KeyframeEffect;
    expect(Number(reversal.getKeyframes()[0].opacity)).toBeGreaterThan(0);
    router.navigateByUrl(`/account/${second.address}/settings`);
    tick();
    expect(dialog.open).toBeFalse();
    expect(content.getAnimations().length).toBe(0);
  }));

  it('keeps Close available when no rows remain and returns focus to the alternate picker on Escape', fakeAsync(() => {
    spyOn(window, 'matchMedia').and.returnValue({ matches: true } as MediaQueryList);
    router.navigateByUrl(`/account/${first.address}/settings`);
    tick();
    wallet.implicitAccounts = [];
    walletUpdated.next(null);
    const { picker, dialog } = open();
    expect(dialog.textContent).toContain('No accounts available.');
    expect(dialog.querySelectorAll('button').length).toBe(1);
    const close = dialog.querySelector<HTMLButtonElement>('.close');
    expect(document.activeElement).toBe(close);
    const tab = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
    close.dispatchEvent(tab);
    expect(tab.defaultPrevented).toBeTrue();
    expect(document.activeElement).toBe(close);
    picker.hidden = true;
    dialog.dispatchEvent(new Event('cancel', { cancelable: true }));
    expect(dialog.open).toBeFalse();
    expect(dialog.getAnimations({ subtree: true }).length).toBe(0);
    expect(document.activeElement).toBe(fixture.componentInstance.alternatePicker.nativeElement);
  }));

  it('leaves the address selected when clipboard access is denied', async () => {
    spyOn(window, 'matchMedia').and.returnValue({ matches: true } as MediaQueryList);
    spyOn(navigator.clipboard, 'writeText').and.callFake(() => new Promise<void>((_, reject) => setTimeout(() => reject(new Error('Clipboard denied')), 0)));
    await router.navigateByUrl(`/account/${first.address}/settings`);
    const { dialog } = open();
    dialog.querySelector<HTMLButtonElement>('.copy-address').click();
    await fixture.whenStable();
    expect(dialog.open).toBeTrue();
    expect(document.getSelection()?.toString()).toBe(first.address);
    expect(dialog.querySelector('[role="status"]').textContent).toContain('Copy the address manually.');
  });
});
