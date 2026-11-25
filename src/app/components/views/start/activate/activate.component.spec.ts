import { CommonModule } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { RouterTestingModule } from '@angular/router/testing';
import { TranslateService } from '@ngx-translate/core';
import { InputValidationService } from '../../../../services/input-validation/input-validation.service';
import { MessageService } from '../../../../services/message/message.service';
import { OperationService } from '../../../../services/operation/operation.service';
import { ActivateComponent } from './activate.component';

describe('Fundraiser activation form', () => {
  it('preserves the draft on form submit and validates only when Activate is used', async () => {
    const operation = jasmine.createSpy('activate');
    await TestBed.configureTestingModule({
      imports: [CommonModule, FormsModule, RouterTestingModule],
      declarations: [ActivateComponent],
      providers: [
        { provide: MessageService, useValue: {} },
        { provide: TranslateService, useValue: {} },
        { provide: OperationService, useValue: { activate: operation } },
        { provide: InputValidationService, useValue: { address: () => false } }
      ]
    }).compileComponents();
    const fixture = TestBed.createComponent(ActivateComponent);
    fixture.componentInstance.pkh = 'invalid-test-address';
    fixture.componentInstance.secret = 'invalid-test-code';
    fixture.detectChanges();
    await fixture.whenStable();
    const form: HTMLFormElement = fixture.nativeElement.querySelector('form');
    const buttons = Array.from(form.querySelectorAll('button'));
    expect(form.querySelector('a.back-link')?.getAttribute('href')).toBe('/import');
    expect(buttons.map((button) => button.type)).toEqual(['button']);
    const submit = new Event('submit', { bubbles: true, cancelable: true });
    form.dispatchEvent(submit);
    expect(submit.defaultPrevented).toBeTrue();
    expect(fixture.componentInstance.formInvalid).toBe('');
    buttons[0].click();
    fixture.detectChanges();
    expect(form.querySelector('[role=status]')?.textContent).toContain('Invalid public key hash');
    expect(fixture.componentInstance.pkh).toBe('invalid-test-address');
    expect(fixture.componentInstance.secret).toBe('invalid-test-code');
    expect(operation).not.toHaveBeenCalled();
  });
});
