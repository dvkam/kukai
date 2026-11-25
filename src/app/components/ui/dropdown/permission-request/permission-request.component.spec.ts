import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { LookupService } from '../../../../services/lookup/lookup.service';
import { ImplicitAccount } from '../../../../services/wallet/wallet';
import { WalletService } from '../../../../services/wallet/wallet.service';
import { TriggerPanelDirective } from '../trigger-panel.directive';
import { PermissionRequestDropdownComponent } from './permission-request.component';

const first = new ImplicitAccount('tz1burnburnburnburnburnburnburjAYjjX', '');
const second = new ImplicitAccount('tz1VSUr8wwNhLAzempoch5d6hLRiTh8Cjcjb', '');

@Component({
  template: `
    <app-ui-dropdown-permission-request [options]="accounts" [current]="first" (dropdownResponse)="choose($event)">
    </app-ui-dropdown-permission-request>
  `
})
class SelectorHost {
  accounts = [first, second];
  first = first;
  choices: ImplicitAccount[] = [];

  choose(account: ImplicitAccount): void {
    this.choices.push(account);
  }
}

describe('Staged account selector', () => {
  it('opens the account choices without making a selection', () => {
    TestBed.configureTestingModule({
      declarations: [PermissionRequestDropdownComponent, SelectorHost],
      imports: [CommonModule, RouterTestingModule, TriggerPanelDirective],
      providers: [
        { provide: WalletService, useValue: {} },
        { provide: LookupService, useValue: { resolve: () => null } }
      ]
    });
    spyOn(window, 'matchMedia').and.returnValue({ matches: true } as MediaQueryList);
    const fixture = TestBed.createComponent(SelectorHost);
    fixture.detectChanges();

    const host: HTMLElement = fixture.nativeElement;
    host.querySelector<HTMLElement>('.currentAddress')!.click();
    fixture.detectChanges();

    expect(host.querySelector<HTMLElement>('.dropdown-content')!.inert).toBeFalse();
    expect(fixture.componentInstance.choices).toEqual([]);
  });
});
