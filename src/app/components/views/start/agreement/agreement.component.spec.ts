import { CommonModule, Location } from '@angular/common';
import { SpyLocation } from '@angular/common/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AgreementComponent } from './agreement.component';

describe('First-run agreement', () => {
  let fixture: ComponentFixture<AgreementComponent>;
  let location: Location;
  let original: string | null;

  beforeEach(async () => {
    original = localStorage.getItem('accepted-terms');
    localStorage.removeItem('accepted-terms');
    await TestBed.configureTestingModule({
      declarations: [AgreementComponent],
      imports: [CommonModule],
      providers: [{ provide: Location, useClass: SpyLocation }]
    }).compileComponents();
    location = TestBed.inject(Location);
    fixture = TestBed.createComponent(AgreementComponent);
  });

  afterEach(() => {
    fixture.destroy();
    if (original === null) localStorage.removeItem('accepted-terms');
    else localStorage.setItem('accepted-terms', original);
  });

  it('keeps the import page behind a modal through decline and reconsideration', () => {
    location.go('/import');
    fixture.detectChanges();
    const dialog: HTMLDialogElement = fixture.nativeElement.querySelector('dialog');
    expect(dialog.matches(':modal')).toBeTrue();
    expect(document.activeElement).toBe(dialog.querySelector('h2'));
    dialog.querySelector<HTMLButtonElement>('.decline button')!.click();
    fixture.detectChanges();
    expect(dialog.querySelector('h2')!.textContent).toContain('declined');
    expect(localStorage.getItem('accepted-terms')).toBeNull();
    dialog.querySelector('button')!.click();
    fixture.detectChanges();
    expect(dialog.matches(':modal')).toBeTrue();
    dialog.querySelector<HTMLButtonElement>('.accept button')!.click();
    expect(dialog.open).toBeFalse();
    expect(localStorage.getItem('accepted-terms')).toBe('1');
    expect(location.path()).toBe('/import');
  });

  it('permits legal pages and checks consent on navigation back into the wallet', () => {
    location.go('/terms-of-use;source=agreement', 'ref=agreement');
    fixture.detectChanges();
    const dialog: HTMLDialogElement = fixture.nativeElement.querySelector('dialog');
    expect(dialog.open).toBeFalse();
    location.go('/import');
    expect(dialog.matches(':modal')).toBeTrue();
    location.go('/privacy-policy');
    expect(dialog.open).toBeFalse();
  });
});
