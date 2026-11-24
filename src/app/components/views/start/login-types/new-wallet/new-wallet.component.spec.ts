import { CommonModule } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { RouterTestingModule } from '@angular/router/testing';
import { TranslateModule } from '@ngx-translate/core';
import { WalletService } from '../../../../../services/wallet/wallet.service';
import { ExportService } from '../../../../../services/export/export.service';
import { ImportService } from '../../../../../services/import/import.service';
import { InputValidationService } from '../../../../../services/input-validation/input-validation.service';
import { MessageService } from '../../../../../services/message/message.service';
import { NewWalletComponent } from './new-wallet.component';

describe('New wallet seed disclosure', () => {
  it('adds the words only on reveal and removes them on hide, focus loss and window blur', async () => {
    const words = Array.from({ length: 24 }, (_, index) => 'fixture' + index).join(' ');
    await TestBed.configureTestingModule({
      imports: [CommonModule, FormsModule, RouterTestingModule, TranslateModule.forRoot()],
      declarations: [NewWalletComponent],
      providers: [
        { provide: WalletService, useValue: { createNewWallet: () => words } },
        ...[ExportService, ImportService, InputValidationService, MessageService].map((provide) => ({ provide, useValue: {} }))
      ]
    }).compileComponents();
    const fixture = TestBed.createComponent(NewWalletComponent);
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    const toggle = el.querySelector<HTMLButtonElement>('button.seed-toggle')!;
    const isRendered = () => el.textContent.includes(words);
    expect(isRendered()).toBeFalse();

    for (const hide of [
      () => toggle.click(),
      () => toggle.dispatchEvent(new FocusEvent('focusout', { bubbles: true })),
      () => window.dispatchEvent(new Event('blur'))
    ]) {
      toggle.click();
      fixture.detectChanges();
      expect(isRendered()).toBeTrue();
      expect(toggle.getAttribute('aria-expanded')).toBe('true');
      hide();
      fixture.detectChanges();
      expect(isRendered()).toBeFalse();
      expect(toggle.getAttribute('aria-expanded')).toBe('false');
    }
  });
});
