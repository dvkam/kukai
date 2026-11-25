import { CommonModule } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { EMPTY } from 'rxjs';
import { ImportService } from '../../../services/import/import.service';
import { MessageService } from '../../../services/message/message.service';
import { TorusService } from '../../../services/torus/torus.service';
import { WalletService } from '../../../services/wallet/wallet.service';
import { StartComponent } from './start.component';

describe('Home sign-in actions', () => {
  it('opens the provider named on each native button', () => {
    TestBed.configureTestingModule({
      declarations: [StartComponent],
      imports: [CommonModule],
      providers: [
        { provide: ActivatedRoute, useValue: { queryParams: EMPTY } },
        { provide: WalletService, useValue: { wallet: {} } },
        ...[Router, TranslateService, TorusService, MessageService, ImportService].map((provide) => ({ provide, useValue: {} }))
      ]
    });
    const fixture = TestBed.createComponent(StartComponent);
    const signIn = spyOn(fixture.componentInstance, 'torusLogin').and.resolveTo();
    fixture.detectChanges();
    const buttons = fixture.nativeElement.querySelectorAll('.social button');
    expect(buttons.length).toBe(5);
    for (const button of buttons) {
      const name = (button.getAttribute('aria-label') ?? button.textContent).trim().replace(/\s+/g, ' ').toLowerCase();
      const provider = name.replace('continue with ', '');
      expect(['google', 'facebook', 'twitter', 'reddit', 'email']).toContain(provider);
      button.click();
      expect(signIn).toHaveBeenCalledOnceWith(provider);
      signIn.calls.reset();
    }
  });
});
