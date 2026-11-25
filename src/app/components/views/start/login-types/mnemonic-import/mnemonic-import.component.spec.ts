import { CommonModule } from '@angular/common';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { RouterTestingModule } from '@angular/router/testing';
import { TranslateModule } from '@ngx-translate/core';
import { WalletType } from '../../../../../interfaces';
import { ExportService } from '../../../../../services/export/export.service';
import { ImportService } from '../../../../../services/import/import.service';
import { IndexerService } from '../../../../../services/indexer/indexer.service';
import { InputValidationService } from '../../../../../services/input-validation/input-validation.service';
import { LedgerService } from '../../../../../services/ledger/ledger.service';
import { MessageService } from '../../../../../services/message/message.service';
import { OperationService } from '../../../../../services/operation/operation.service';
import { WalletService } from '../../../../../services/wallet/wallet.service';
import { AdvancedToggleComponent } from '../../../../ui/button/toggle/advanced/advanced.component';
import { ConnectLedgerComponent } from '../connect-ledger/connect-ledger.component';
import { MnemonicImportComponent } from './mnemonic-import.component';

describe('Wallet import controls', () => {
  let fixture: ComponentFixture<MnemonicImportComponent>;
  let root: HTMLElement;
  let messages: jasmine.SpyObj<MessageService>;
  const keystore = JSON.stringify({ provider: 'Kukai', version: 3, walletType: WalletType.HdWallet, iv: 'fixture', encryptedSeed: 'fixture' });

  beforeEach(async () => {
    messages = jasmine.createSpyObj('MessageService', ['add', 'addError', 'addWarning']);
    await TestBed.configureTestingModule({
      imports: [CommonModule, FormsModule, RouterTestingModule, TranslateModule.forRoot()],
      declarations: [MnemonicImportComponent, AdvancedToggleComponent, ConnectLedgerComponent],
      providers: [
        { provide: MessageService, useValue: messages },
        { provide: ImportService, useValue: { pwdRequired: ImportService.prototype.pwdRequired } },
        { provide: InputValidationService, useValue: { invalidMnemonic: () => 'Enter recovery words.' } },
        ...[ExportService, IndexerService, LedgerService, OperationService, WalletService].map((provide) => ({ provide, useValue: {} }))
      ]
    }).compileComponents();
    fixture = TestBed.createComponent(MnemonicImportComponent);
    root = fixture.nativeElement;
    fixture.detectChanges();
  });

  function upload(file?: File): void {
    const input = root.querySelector<HTMLInputElement>('input[type=file]')!;
    const transfer = new DataTransfer();
    if (file) {
      transfer.items.add(file);
    }
    input.files = transfer.files;
    input.dispatchEvent(new Event('change'));
    fixture.detectChanges();
  }

  function localFile(name: string, contents: Promise<string>): File {
    const file = new File([], name);
    spyOn(file, 'text').and.returnValue(contents);
    return file;
  }

  it('moves focus between named methods and selects them on activation', () => {
    const tabs = root.querySelectorAll<HTMLButtonElement>('button[role=tab]');
    expect(root.querySelector('a button')).toBeNull();
    expect(tabs.length).toBe(3);
    if (!tabs.length) {
      return;
    }
    tabs[0].focus();
    tabs[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }));
    fixture.detectChanges();
    expect(document.activeElement).toBe(tabs[1]);
    expect(Array.from(tabs).map((tab) => tab.tabIndex)).toEqual([-1, 0, -1]);
    expect(tabs[0].getAttribute('aria-selected')).toBe('true');
    expect(tabs[1].getAttribute('aria-selected')).toBe('false');
    tabs[1].click();
    fixture.detectChanges();
    expect(tabs[1].getAttribute('aria-selected')).toBe('true');
    const seed = root.querySelector<HTMLTextAreaElement>('textarea')!;
    expect(seed.labels.length).toBe(1);
    expect(seed.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', keyCode: 9, bubbles: true, cancelable: true }))).toBeTrue();
  });

  it('preserves entered recovery words while exploring tabs and clears them on an explicit switch', async () => {
    const tabs = root.querySelectorAll<HTMLButtonElement>('button[role=tab]');
    tabs[1].click();
    fixture.detectChanges();
    await fixture.whenStable();
    const seed = root.querySelector<HTMLTextAreaElement>('textarea');
    seed.value = 'draft words';
    seed.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(root.querySelector('#import-switch-hint')?.textContent).toContain('clears this form');

    tabs[1].focus();
    tabs[1].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }));
    fixture.detectChanges();
    expect(document.activeElement).toBe(tabs[2]);
    expect(root.querySelector('textarea')).toBe(seed);
    tabs[2].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true, cancelable: true }));
    fixture.detectChanges();
    expect(document.activeElement).toBe(tabs[1]);
    expect(seed.value).toBe('draft words');

    tabs[2].click();
    fixture.detectChanges();
    tabs[1].click();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(root.querySelector<HTMLTextAreaElement>('textarea').value).toBe('');
    expect(root.querySelector('#import-switch-hint')).toBeNull();
  });

  it('independently labels Fundraiser fields and keeps the password writable by keyboard', async () => {
    const fundraiser = root.querySelectorAll<HTMLButtonElement>('[role=tab]')[2];
    if (!fundraiser) {
      fail('Fundraiser should be a native tab button');
      return;
    }
    fundraiser.click();
    fixture.detectChanges();
    await fixture.whenStable();
    const panel = root.querySelector<HTMLElement>('[role=tabpanel]:not([hidden])')!;
    const fields = Array.from(panel.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('input, textarea'));
    expect(fields.map((field) => field.labels.length)).toEqual([1, 1, 1, 1]);
    expect(panel.querySelector<HTMLInputElement>('input[type=password]')!.readOnly).toBeFalse();
    panel.querySelector<HTMLFormElement>('form')!.dispatchEvent(new Event('submit', { cancelable: true }));
    fixture.detectChanges();
    expect(fields[0].getAttribute('aria-invalid')).toBe('true');
    const descriptions = fields[0].getAttribute('aria-describedby').split(' ');
    expect(root.querySelector(`#${descriptions[descriptions.length - 1]}`).textContent).toContain('Enter recovery words.');
  });

  it('reports one inline error, preserves it on cancellation and clears it when another file is chosen', async () => {
    upload(localFile('bad.tez', Promise.resolve('{')));
    await fixture.whenStable();
    fixture.detectChanges();
    const region = root.querySelector('[aria-live=polite]');
    expect(region?.textContent).toContain('bad.tez');
    expect(region?.textContent).not.toContain('SyntaxError');
    expect(messages.addError).not.toHaveBeenCalled();
    expect(root.querySelector<HTMLInputElement>('input[type=file]').value).toBe('');
    upload();
    expect(region?.textContent).toContain('bad.tez');
    upload(localFile('replacement.tez', Promise.resolve(keystore)));
    await Promise.resolve();
    fixture.detectChanges();
    expect(region?.textContent.trim()).toBe('');
    expect(root.querySelector('input[type=password]')).not.toBeNull();
    upload();
    expect(root.querySelector('input[type=password]')).not.toBeNull();
    expect(root.querySelector<HTMLButtonElement>('button.input-file').getAttribute('aria-describedby')).toContain('keystore-file-name');
  });

  it('accepts legacy encrypted keystores and exported social keystores', async () => {
    for (const data of [
      { walletType: WalletType.LegacyWallet, version: 1, pkh: 'tz1fixture', encryptedSeed: 'fixture' },
      { walletType: WalletType.LegacyWallet, version: 2, iv: 'fixture', encryptedSeed: 'fixture' },
      { walletType: WalletType.LegacyWallet, version: 3, iv: 'fixture', encryptedSeed: 'fixture' },
      { walletType: WalletType.ExportedSocialWallet, version: 3, iv: 'fixture', encryptedSk: 'fixture' }
    ]) {
      upload(localFile('supported.tez', Promise.resolve(JSON.stringify({ provider: 'Kukai', ...data }))));
      await fixture.whenStable();
      fixture.detectChanges();
      expect(root.querySelector('input[type=password]')).not.toBeNull();
      expect(root.querySelector('#keystore-file-error').textContent.trim()).toBe('');
    }
  });

  it('ignores a stale read after a new file selection or method change', async () => {
    let finishRead: (contents: string) => void;
    const slowlyReading = new Promise<string>((resolve) => {
      finishRead = resolve;
    });
    upload(localFile('slow.tez', slowlyReading));
    upload(localFile('current.tez', Promise.resolve(keystore)));
    await Promise.resolve();
    finishRead('{');
    await Promise.resolve();
    fixture.detectChanges();
    expect(root.querySelector('#keystore-file-name')?.textContent).toBe('current.tez');
    expect(root.querySelector('#keystore-file-error')?.textContent.trim()).toBe('');

    const afterSwitch = new Promise<string>((resolve) => {
      finishRead = resolve;
    });
    upload(localFile('after-switch.tez', afterSwitch));
    const tabs = root.querySelectorAll<HTMLButtonElement>('[role=tab]');
    tabs[1].click();
    fixture.detectChanges();
    tabs[0].click();
    fixture.detectChanges();
    finishRead(keystore);
    await Promise.resolve();
    fixture.detectChanges();
    expect(root.querySelector('#keystore-file-name')).toBeNull();
    expect(root.querySelector('input[type=password]')).toBeNull();
  });

  it('exposes a named switch which enables and disables the labelled Ledger derivation input', async () => {
    const ledger = TestBed.createComponent(ConnectLedgerComponent);
    ledger.detectChanges();
    await ledger.whenStable();
    ledger.detectChanges();
    const screen: HTMLElement = ledger.nativeElement;
    const toggle = screen.querySelector<HTMLButtonElement>('button[role=switch]');
    const path = screen.querySelector<HTMLInputElement>('input.path-input');
    expect(toggle?.getAttribute('aria-label')).toBe('Custom derivation path');
    expect(toggle?.getAttribute('aria-checked')).toBe('false');
    expect(path.labels.length).toBe(1);
    expect(path.disabled).toBeTrue();
    toggle?.click();
    ledger.detectChanges();
    await ledger.whenStable();
    expect(toggle?.getAttribute('aria-checked')).toBe('true');
    expect(path.disabled).toBeFalse();
    toggle?.click();
    ledger.detectChanges();
    await ledger.whenStable();
    expect(toggle?.getAttribute('aria-checked')).toBe('false');
    expect(path.disabled).toBeTrue();
  });
});
