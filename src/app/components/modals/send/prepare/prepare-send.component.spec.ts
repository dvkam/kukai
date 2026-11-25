import { CommonModule } from '@angular/common';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { TranslateService } from '@ngx-translate/core';
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

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [PrepareSendComponent],
      imports: [CommonModule, FormsModule],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [
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
    const account = new ImplicitAccount('synthetic-sender', '');
    account.availableBalance = 2500000;
    fixture.componentRef.setInput('prepareRequest', { account, symbol: 'tez', tokenTransfer: null });
    fixture.detectChanges();
    await fixture.whenStable();
    modal = fixture.nativeElement.querySelector('.kukai-modal');
  });

  afterEach(() => ModalComponent.currentModel.next({ name: '', data: null }));

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
    expect(modal.querySelector('textarea')).not.toBeNull();
    expect(component.amount).toBe('');
    expect(component.toPkh).toBe('');
    expect(prepareResponse).not.toHaveBeenCalled();
  });
});
