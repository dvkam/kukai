import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { fakeAsync, TestBed, tick } from '@angular/core/testing';
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
class ImportDestination {}

describe('Mobile navigation destinations', () => {
  it('closes the menu when a user follows Import Wallet', fakeAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ImportDestination, MobileMenuDropdownComponent],
      imports: [CommonModule, TriggerPanelDirective, RouterTestingModule.withRoutes([{ path: 'import', component: ImportDestination }])],
      providers: [WalletService, LookupService, MessageService, SubjectService, TranslateService, UnlockableService].map((provide) => ({ provide, useValue: {} }))
    });
    spyOn(window, 'matchMedia').and.returnValue({ matches: true } as MediaQueryList);
    const fixture = TestBed.createComponent(MobileMenuDropdownComponent);
    fixture.detectChanges();
    const trigger: HTMLButtonElement = fixture.nativeElement.querySelector('.menu-trigger');
    const panel: HTMLElement = fixture.nativeElement.querySelector('#wallet-navigation-panel');
    trigger.click();
    fixture.detectChanges();
    expect(panel.inert).toBeFalse();
    panel.querySelector('a')!.click();
    tick();
    fixture.detectChanges();
    expect(TestBed.inject(Router).url).toBe('/import');
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(panel.inert).toBeTrue();
    trigger.click();
    fixture.detectChanges();
    panel.querySelector('a')!.click();
    tick();
    fixture.detectChanges();
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(panel.inert).toBeTrue();
  }));
});
