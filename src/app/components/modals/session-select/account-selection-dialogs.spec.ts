import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { BehaviorSubject, Subject } from 'rxjs';
import { LookupService } from '../../../services/lookup/lookup.service';
import { MessageService } from '../../../services/message/message.service';
import { SubjectService } from '../../../services/subject/subject.service';
import { WalletConnectService } from '../../../services/wallet-connect/wallet-connect.service';
import { WalletService } from '../../../services/wallet/wallet.service';
import { ImplicitAccount, Wallet } from '../../../services/wallet/wallet';
import { PermissionRequestDropdownComponent } from '../../ui/dropdown/permission-request/permission-request.component';
import { TriggerPanelDirective } from '../../ui/dropdown/trigger-panel.directive';
import { ModalComponent } from '../modal.component';
import { PermissionRequestComponent } from '../permission-request/permission-request.component';
import { SessionSelectComponent, SessionSelectData } from './session-select.component';

const first = new ImplicitAccount('tz1burnburnburnburnburnburnburjAYjjX', 'first-fixture-public-key');
const second = new ImplicitAccount('tz1VSUr8wwNhLAzempoch5d6hLRiTh8Cjcjb', 'second-fixture-public-key');
const topic = 'test-session';

@Component({ selector: 'app-asset', template: '' })
class AssetStub {
  @Input() assets: { displayAsset: string };
}

@Component({
  template: `
    <button class="prior" type="button">Previous action</button>
    <button #edit class="edit" type="button" (click)="openSession(edit)">Change session account</button>
    <app-permission-request
      *ngIf="request"
      [permissionRequest]="request"
      [activeAccount]="activeAccount"
      (permissionResponse)="respond($event)"
    ></app-permission-request>
    <app-session-select></app-session-select>
  `
})
class AccountSelectionHost {
  request?: { version: string; appMetadata: { name: string } };
  activeAccount = first;
  responses: (string | null)[] = [];

  openPermission(): void {
    this.request = { version: '3', appMetadata: { name: 'Fixture app' } };
  }

  respond(response: string | null): void {
    this.responses.push(response);
    this.request = undefined;
  }

  openSession(invoker?: HTMLButtonElement): void {
    const data: SessionSelectData = { topic, preSelectedAccountAddress: first.address, invocation: invoker && { invoker } };
    ModalComponent.currentModel.next({ name: 'session-select', data });
  }
}

describe('Account selection dialogs', () => {
  let fixture: ComponentFixture<AccountSelectionHost>;
  let prior: HTMLButtonElement;
  let edit: HTMLButtonElement;
  let beaconResponse: Subject<boolean>;
  let navigate: jasmine.Spy;
  let updateSession: jasmine.Spy;

  beforeEach(() => {
    const wallet = new Wallet();
    wallet.implicitAccounts = [first, second];
    beaconResponse = new Subject();
    navigate = jasmine.createSpy('navigate');
    updateSession = jasmine.createSpy('updateSession');
    TestBed.configureTestingModule({
      declarations: [AccountSelectionHost, AssetStub, PermissionRequestComponent, SessionSelectComponent, PermissionRequestDropdownComponent],
      imports: [CommonModule, TriggerPanelDirective],
      providers: [
        { provide: WalletService, useValue: { wallet } },
        { provide: SubjectService, useValue: { walletUpdated: new BehaviorSubject(null), beaconResponse } },
        { provide: MessageService, useValue: { removeBeaconMsg: () => undefined } },
        { provide: LookupService, useValue: { resolve: () => null } },
        { provide: Router, useValue: { navigate } },
        { provide: WalletConnectService, useValue: { updateSession } }
      ]
    });
    spyOn(window, 'matchMedia').and.returnValue({ matches: true } as MediaQueryList);
    fixture = TestBed.createComponent(AccountSelectionHost);
    fixture.detectChanges();
    prior = fixture.nativeElement.querySelector('.prior');
    edit = fixture.nativeElement.querySelector('.edit');
  });

  afterEach(() => ModalComponent.currentModel.next({ name: '', data: null }));

  function openPermission(): HTMLDialogElement {
    prior.focus();
    fixture.componentInstance.openPermission();
    fixture.detectChanges();
    return fixture.nativeElement.querySelector('app-permission-request dialog');
  }

  function stageSecondAndReopen(dialog: HTMLDialogElement): HTMLButtonElement {
    const trigger = dialog.querySelector<HTMLButtonElement>('button[aria-expanded]');
    const options = dialog.querySelector<HTMLElement>(`#${trigger.getAttribute('aria-controls')}`);
    trigger.click();
    fixture.detectChanges();
    expect(options.querySelector('button[aria-current="true"]').textContent).toContain(first.address);
    const secondChoice = Array.from(options.querySelectorAll('button')).find((button) => button.textContent.includes(second.address));
    secondChoice.click();
    fixture.detectChanges();
    expect(trigger.textContent).toContain(second.address);
    expect(trigger.getAttribute('aria-expanded')).toBe('false');

    trigger.click();
    fixture.detectChanges();
    const staged = options.querySelectorAll('button[aria-current="true"]');
    expect(staged.length).toBe(1);
    expect(staged[0].textContent).toContain(second.address);
    return trigger;
  }

  function escapeSelector(trigger: HTMLButtonElement): void {
    const event = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
    trigger.dispatchEvent(event);
    fixture.detectChanges();
    expect(event.defaultPrevented).toBeTrue();
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(trigger);
  }

  it('keeps the permission account staged until Connect and returns null on dismissal', () => {
    const dialog = openPermission();
    expect(dialog.open).toBeTrue();
    expect(document.activeElement).toBe(dialog.querySelector('button[aria-label="Close"]'));
    escapeSelector(stageSecondAndReopen(dialog));
    expect(dialog.open).toBeTrue();
    expect(fixture.componentInstance.responses).toEqual([]);
    expect(navigate).not.toHaveBeenCalled();
    dialog.dispatchEvent(new Event('cancel', { cancelable: true }));
    fixture.detectChanges();
    expect(dialog.open).toBeFalse();
    expect(fixture.componentInstance.responses).toEqual([null]);
    expect(document.activeElement).toBe(prior);

    const nextRequest = openPermission();
    escapeSelector(stageSecondAndReopen(nextRequest));
    nextRequest.querySelector<HTMLButtonElement>('.confirm').click();
    expect(fixture.componentInstance.responses).toEqual([null, second.pk]);
    expect(navigate).toHaveBeenCalledOnceWith([`/account/${second.address}`]);
    beaconResponse.next(true);
    expect(fixture.componentInstance.responses).toEqual([null, second.pk]);
  });

  it('uses the staged session account only on Confirm and restores focus for both entries', () => {
    edit.click();
    fixture.detectChanges();
    const dialog: HTMLDialogElement = fixture.nativeElement.querySelector('app-session-select dialog');
    expect(dialog.open).toBeTrue();
    expect(document.activeElement).toBe(dialog.querySelector('button[aria-label="Close"]'));
    escapeSelector(stageSecondAndReopen(dialog));
    expect(dialog.open).toBeTrue();
    expect(updateSession).not.toHaveBeenCalled();
    dialog.dispatchEvent(new Event('cancel', { cancelable: true }));
    fixture.detectChanges();
    expect(dialog.open).toBeFalse();
    expect(document.activeElement).toBe(edit);
    expect(updateSession).not.toHaveBeenCalled();

    prior.focus();
    fixture.componentInstance.openSession();
    fixture.detectChanges();
    escapeSelector(stageSecondAndReopen(dialog));
    dialog.querySelector<HTMLButtonElement>('.confirm').click();
    expect(updateSession).toHaveBeenCalledOnceWith(topic, second.pk);
    expect(dialog.open).toBeFalse();
    expect(document.activeElement).toBe(prior);
  });
});
