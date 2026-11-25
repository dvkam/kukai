import { AfterViewInit, ChangeDetectorRef, Component, ElementRef, OnDestroy, ViewChild } from '@angular/core';
import { Location } from '@angular/common';

@Component({
  selector: 'app-agreement',
  templateUrl: './agreement.component.html',
  styleUrls: ['../../../../../scss/components/views/start/agreement/agreement.component.scss']
})
export class AgreementComponent implements AfterViewInit, OnDestroy {
  @ViewChild('agreement') private agreement: ElementRef<HTMLDialogElement>;
  @ViewChild('heading') private heading: ElementRef<HTMLHeadingElement>;
  declined = false;
  private stopListening: () => void;

  constructor(private location: Location, private changes: ChangeDetectorRef) {}

  ngAfterViewInit(): void {
    this.updateAgreement();
    this.stopListening = this.location.onUrlChange(() => this.updateAgreement());
  }

  ngOnDestroy(): void {
    this.stopListening?.();
  }

  private updateAgreement(): void {
    const path = this.location.path().split(/[?#]/)[0];
    const legalPage = /^\/(terms-of-use|privacy-policy)(;[^/]*)?\/?$/.test(path);
    const dialog = this.agreement.nativeElement;
    if (localStorage.getItem('accepted-terms') || legalPage) {
      if (dialog.open) dialog.close();
    } else if (!dialog.open) {
      dialog.showModal();
      this.heading.nativeElement.focus();
    }
  }

  accept(): void {
    localStorage.setItem('accepted-terms', '1');
    this.agreement.nativeElement.close();
  }

  setDeclined(declined: boolean): void {
    this.declined = declined;
    this.changes.detectChanges();
    this.heading.nativeElement.focus();
  }
}
