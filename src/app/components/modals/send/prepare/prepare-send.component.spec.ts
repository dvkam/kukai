import { CommonModule } from '@angular/common';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { NavigationStart, Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { Subject } from 'rxjs';
import { EstimateService } from '../../../../services/estimate/estimate.service';
import { InputValidationService } from '../../../../services/input-validation/input-validation.service';
import { TezosDomainsService } from '../../../../services/tezos-domains/tezos-domains.service';
import { TokenBalancesService } from '../../../../services/token-balances/token-balances.service';
import { TokenService } from '../../../../services/token/token.service';
import { TorusService } from '../../../../services/torus/torus.service';
import { WalletService } from '../../../../services/wallet/wallet.service';
import { ImplicitAccount } from '../../../../services/wallet/wallet';
import { ModalComponent } from '../../modal.component';
import { PrepareSendComponent } from './prepare-send.component';

function input(element: HTMLInputElement, value: string): void {
  element.value = value;
  element.dispatchEvent(new Event('input', { bubbles: true }));
}

function submit(form: HTMLFormElement): void {
  const event = new Event('submit', { bubbles: true, cancelable: true });
  form.dispatchEvent(event);
  expect(event.defaultPrevented).toBeTrue();
}

describe('Prepare Send draft actions', () => {
  let fixture: ComponentFixture<PrepareSendComponent>;
  let component: PrepareSendComponent;
  let modal: HTMLElement;
  let prepareResponse: jasmine.Spy;
  let invoker: HTMLButtonElement;
  let fallback: HTMLButtonElement;
  let account: ImplicitAccount;
  let navigation: Subject<NavigationStart>;

  function openDraft(trackInvoker = true, invokerBounds = invoker.getBoundingClientRect()): void {
    fixture.componentRef.setInput('prepareRequest', {
      account,
      symbol: 'tez',
      tokenTransfer: null,
      invocation: {
        invoker,
        invokerBounds,
        trackInvoker,
        focusAfterClose: [invoker, fallback]
      }
    });
    fixture.detectChanges();
  }

  beforeEach(async () => {
    navigation = new Subject<NavigationStart>();
    await TestBed.configureTestingModule({
      declarations: [PrepareSendComponent],
      imports: [CommonModule, FormsModule],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [
        { provide: Router, useValue: { events: navigation } },
        { provide: TokenService, useValue: { getAsset: () => null } },
        { provide: TokenBalancesService, useValue: { isNFT: () => false } },
        { provide: EstimateService, useValue: { preLoadData: () => {} } },
        { provide: WalletService, useValue: { wallet: { XTZrate: 0 } } },
        { provide: TranslateService, useValue: { instant: (key: string) => key } },
        { provide: TorusService, useValue: {} },
        { provide: TezosDomainsService, useValue: { unsupportedNetwork: true } },
        { provide: InputValidationService, useValue: { address: () => false, twitterAccount: () => false } }
      ]
    }).compileComponents();
    fixture = TestBed.createComponent(PrepareSendComponent);
    component = fixture.componentInstance;
    prepareResponse = spyOn(component.prepareResponse, 'emit');
    fixture.detectChanges();
    invoker = document.createElement('button');
    fallback = document.createElement('button');
    document.body.append(invoker, fallback);
    invoker.focus();
    account = new ImplicitAccount('synthetic-sender', '');
    account.availableBalance = 2500000;
    openDraft();
    await fixture.whenStable();
    modal = fixture.nativeElement.querySelector('.kukai-modal');
  });

  afterEach(() => {
    ModalComponent.currentModel.next({ name: '', data: null });
    invoker?.remove();
    fallback?.remove();
  });

  it('opens a named modal, wraps its controls and restores focus when cancelled', () => {
    expect(modal.matches(':modal')).toBeTrue();
    const title = modal.querySelector<HTMLElement>('#prepare-send-title')!;
    const close = modal.querySelector<HTMLButtonElement>('.close')!;
    const preview = modal.querySelector<HTMLButtonElement>('.confirm')!;
    expect(modal.getAttribute('aria-labelledby')).toBe(title.id);
    expect(document.activeElement).toBe(title);
    close.focus();
    close.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true, cancelable: true }));
    expect(document.activeElement).toBe(preview);
    preview.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true }));
    expect(document.activeElement).toBe(close);

    invoker.remove();
    modal.dispatchEvent(new Event('cancel', { cancelable: true }));
    expect(modal.matches(':modal')).toBeFalse();
    expect(document.activeElement).toBe(fallback);
    expect(prepareResponse).toHaveBeenCalledOnceWith(null);
  });

  it('starts the local entrance and clears the draft synchronously if it is interrupted', () => {
    component.closeModalAction();
    openDraft();
    const panel = modal.querySelector<HTMLElement>('.content')!;
    expect(panel.getAnimations().length).toBe(1);

    input(modal.querySelector<HTMLInputElement>('input[name=toPkh]')!, 'former-recipient');
    modal.querySelector<HTMLButtonElement>('.close')!.click();

    expect(modal.matches(':modal')).toBeFalse();
    expect(modal.querySelector('input, textarea, video, [role=status]')).toBeNull();
    expect(panel.getAnimations().length).toBe(0);
    expect(document.activeElement).toBe(invoker);

    openDraft();
    expect(modal.matches(':modal')).toBeTrue();
    expect(modal.querySelector<HTMLInputElement>('input[name=toPkh]')!.value).toBe('');
    expect(modal.querySelector('.content')!.getAnimations().length).toBe(1);
  });

  it('tracks a visible Send button during entry and keeps the pre-close bounds of a detail button', () => {
    component.closeModalAction();
    invoker.style.position = 'fixed';
    invoker.style.left = '10px';
    openDraft();
    const directPanel = modal.querySelector<HTMLElement>('.content')!;
    const initialOrigin = directPanel.style.transformOrigin;
    invoker.style.left = '50px';
    window.dispatchEvent(new Event('resize'));
    expect(directPanel.style.transformOrigin).not.toBe(initialOrigin);
    const resizedOrigin = directPanel.style.transformOrigin;
    invoker.style.left = '70px';
    window.dispatchEvent(new Event('scroll'));
    expect(directPanel.style.transformOrigin).not.toBe(resizedOrigin);

    const capturedOrigin = directPanel.style.transformOrigin;
    const detailBounds = invoker.getBoundingClientRect();
    component.closeModalAction();
    invoker.remove();
    openDraft(false, detailBounds);
    const detailPanel = modal.querySelector<HTMLElement>('.content')!;
    window.dispatchEvent(new Event('resize'));
    expect(detailPanel.style.transformOrigin).toBe(capturedOrigin);
    component.closeModalAction();
    expect(document.activeElement).toBe(fallback);
  });

  it('hands off to Confirmation immediately without restoring Send focus', () => {
    const focusOnSend = jasmine.createSpy('focus on Send');
    invoker.addEventListener('focus', focusOnSend);
    const transactions = [{ kind: 'transaction' as const, destination: 'synthetic-recipient', amount: '0.25', fee: '0', gasLimit: '0', storageLimit: '0' }];
    spyOn(component, 'getFullyPreparedTxs').and.returnValue(transactions);
    const preview = modal.querySelector<HTMLButtonElement>('.confirm')!;
    preview.focus();
    preview.click();

    expect(modal.matches(':modal')).toBeFalse();
    expect(modal.querySelector('.content')).toBeNull();
    expect(focusOnSend).not.toHaveBeenCalled();
    expect(prepareResponse).toHaveBeenCalledOnceWith(transactions);
    expect(ModalComponent.currentModel.value).toEqual(
      jasmine.objectContaining({ name: 'confirm-send', data: jasmine.objectContaining({ focusFromPrepare: true, returnFocus: [invoker, fallback] }) })
    );
  });

  it('opens without motion under reduced motion and clears immediately on navigation', () => {
    component.closeModalAction();
    spyOn(window, 'matchMedia').and.returnValue({ matches: true } as MediaQueryList);
    openDraft();
    expect(modal.matches(':modal')).toBeTrue();
    expect(modal.querySelector('.content')!.getAnimations().length).toBe(0);
    input(modal.querySelector<HTMLInputElement>('input[name=toPkh]')!, 'former-recipient');
    prepareResponse.calls.reset();

    navigation.next(new NavigationStart(1, '/settings'));

    expect(modal.matches(':modal')).toBeFalse();
    expect(modal.querySelector('.content')).toBeNull();
    expect(document.activeElement).not.toBe(invoker);
    expect(prepareResponse).toHaveBeenCalledOnceWith(null);
  });

  it('announces an invalid recipient and focuses its labelled field', () => {
    const recipient = modal.querySelector<HTMLInputElement>('input[name=toPkh]')!;
    const preview = modal.querySelector<HTMLButtonElement>('.confirm')!;
    preview.click();
    const status = modal.querySelector<HTMLElement>('[role=status]')!;
    expect(status.textContent).toContain('INVALIDRECEIVERADDRESS');
    expect(recipient.labels.length).toBe(1);
    expect(recipient.getAttribute('aria-invalid')).toBe('true');
    expect(recipient.getAttribute('aria-describedby')).toBe(status.id);
    expect(document.activeElement).toBe(recipient);
    expect(prepareResponse).not.toHaveBeenCalled();
    input(recipient, 'updated-draft');
    fixture.detectChanges();
    expect(recipient.hasAttribute('aria-invalid')).toBeFalse();
  });

  it('preserves a typed amount on form submission and applies MAX through its own control', async () => {
    const amount = modal.querySelector<HTMLInputElement>('.amount input')!;
    const maximum = modal.querySelector<HTMLButtonElement>('.amount button')!;
    expect(maximum.type).toBe('button');
    expect(maximum.tabIndex).toBe(0);
    input(amount, '0.25');
    submit(amount.form!);
    expect(component.amount).toBe('0.25');
    expect(component.sendMax).toBeFalse();

    maximum.click();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(amount.value).toBe('2.499999');
    expect(component.sendMax).toBeTrue();

    input(amount, '0.4');
    component.updateMaxAmount();
    expect(component.amount).toBe('0.4');
    expect(component.sendMax).toBeFalse();
    expect(prepareResponse).not.toHaveBeenCalled();
  });

  it('preserves the single draft on recipient form submission and switches only through the mode control', async () => {
    component.advancedForm = true;
    fixture.detectChanges();
    const amount = modal.querySelector<HTMLInputElement>('.amount input')!;
    const recipient = modal.querySelector<HTMLInputElement>('input[name=toPkh]')!;
    const mode = modal.querySelector<HTMLButtonElement>('.multiple-destinations')!;
    expect(mode.type).toBe('button');
    input(amount, '0.25');
    input(recipient, 'not-a-recipient');
    submit(recipient.form!);
    fixture.detectChanges();
    expect(component.amount).toBe('0.25');
    expect(component.toPkh).toBe('not-a-recipient');
    expect(modal.querySelector('textarea')).toBeNull();

    mode.click();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(modal.querySelector<HTMLTextAreaElement>('textarea')?.value).toBe('');
    expect(modal.querySelector('.amount input')).toBeNull();
    expect(component.toPkh).toBe('');
    expect(prepareResponse).not.toHaveBeenCalled();
  });
});
