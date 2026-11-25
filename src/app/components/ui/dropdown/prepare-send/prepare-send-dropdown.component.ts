import { Component, ElementRef, Input, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { TorusService } from '../../../../services/torus/torus.service';
import { DropdownComponent } from '../dropdown.component';
import { TezosDomainsService } from '../../../../services/tezos-domains/tezos-domains.service';

@Component({
  selector: 'app-ui-dropdown-prepare-send',
  templateUrl: './prepare-send-dropdown.component.html',
  styleUrls: ['../../../../../scss/components/ui/dropdown/prepare-send-dropdown.component.scss']
})
export class PrepareSendDropdownComponent extends DropdownComponent implements OnInit {
  @Input() torusVerifierName = 'Tezos Address';
  @Input() torusVerifier = '';
  @ViewChild('trigger') private trigger: ElementRef<HTMLButtonElement>;

  constructor(public router: Router, public torusService: TorusService, public tezosDomains: TezosDomainsService) {
    super();
  }

  ngOnInit(): void {}

  select(torusVerifier: string, torusVerifierName: string): void {
    this.torusVerifier = torusVerifier;
    this.torusVerifierName = torusVerifierName;
    this.closeAndFocus();
    this.dropdownResponse.emit({ torusVerifier, torusVerifierName });
  }

  onEscape(event: Event): void {
    if (!this.isOpen) return;
    event.preventDefault();
    event.stopPropagation();
    this.closeAndFocus();
  }

  onFocusOut(event: FocusEvent): void {
    if (event.relatedTarget instanceof Node && !(event.currentTarget as HTMLElement).contains(event.relatedTarget)) {
      this.isOpen = false;
    }
  }

  private closeAndFocus(): void {
    this.isOpen = false;
    this.trigger.nativeElement.focus({ preventScroll: true });
  }
}
