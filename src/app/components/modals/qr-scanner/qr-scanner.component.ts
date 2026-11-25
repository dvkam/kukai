import { ChangeDetectorRef, Component, ViewChild, ElementRef, Input, EventEmitter, Output } from '@angular/core';
import { BeaconService } from '../../../services/beacon/beacon.service';
import QrScanner from 'qr-scanner';
import { DeeplinkService } from '../../../services/deeplink/deeplink.service';
import { CONSTANTS as _CONSTANTS, environment } from '../../../../environments/environment';
import { MessageService } from '../../../services/message/message.service';
import { ModalComponent } from '../modal.component';
import { InvokedDialog } from '../invoked-dialog';
import { WalletConnectService } from '../../../services/wallet-connect/wallet-connect.service';

@Component({
  selector: 'app-qr-scanner',
  templateUrl: './qr-scanner.component.html',
  styleUrls: ['../../../../scss/components/modals/modal.scss', '../../../../scss/components/modals/recipient-qr-dialog.scss']
})
export class QrScannerComponent extends ModalComponent {
  readonly CONSTANTS = _CONSTANTS;
  readonly env = environment;
  constructor(
    private beaconService: BeaconService,
    private deeplinkService: DeeplinkService,
    private messageService: MessageService,
    private walletConnectService: WalletConnectService,
    private changeDetector: ChangeDetectorRef
  ) {
    super();
  }
  @Output('scanResponse') scanResponse = new EventEmitter();
  @ViewChild('videoPlayer') videoplayer: ElementRef;
  @ViewChild('recipientDialog') private recipientDialog: ElementRef<HTMLDialogElement>;
  @ViewChild('recipientTrigger') private recipientTrigger: ElementRef<HTMLButtonElement>;
  @ViewChild('scannerPanel') private scannerPanel: ElementRef<HTMLElement>;
  private recipientMotion?: InvokedDialog;
  @Input() override = false;
  qrScanner: QrScanner;
  manualInput = '';
  name = 'qr-scanner';
  loadingCam = false;
  errorMessage = '';
  private scanSession = 0;
  openModal(): void {
    if (!this.override) {
      ModalComponent.currentModel.next({ name: this.name, data: null });
    } else {
      if (this.isOpen) return;
      this.isOpen = true;
      this.changeDetector.detectChanges();
      this.recipientMotion = new InvokedDialog(this.recipientDialog.nativeElement, this.scannerPanel.nativeElement);
      this.recipientMotion.open({ invoker: this.recipientTrigger.nativeElement });
    }
    this.scan();
  }
  async scan(): Promise<void> {
    const session = ++this.scanSession;
    this.loadingCam = true;
    this.errorMessage = '';
    try {
      const hasCamera = await QrScanner.hasCamera();
      const video = this.videoplayer?.nativeElement;
      if (session !== this.scanSession || !this.isOpen || !hasCamera || !video) return;
      this.qrScanner = new QrScanner(
        video,
        (result: QrScanner.ScanResult) => {
          if (session === this.scanSession) this.handleQrCode(result);
        },
        {}
      );
      await this.qrScanner.start();
    } catch (error) {
      if (session === this.scanSession) this.errorMessage = error instanceof Error ? error.message : String(error);
    } finally {
      if (session === this.scanSession) this.loadingCam = false;
    }
  }
  handleQrCode(scanResult: QrScanner.ScanResult): void {
    const qrString = scanResult.data;
    try {
      const pairingInfo = this.deeplinkService.QRtoPairingJson(qrString);
      if (pairingInfo && !this.override) {
        this.beaconService.preNotifyPairing(pairingInfo);
        this.beaconService.addPeer(pairingInfo);
      } else if (qrString && this.override) {
        this.scanResponse.emit({ pkh: qrString });
      } else if (qrString.startsWith('wc')) {
        this.walletConnectService.pair(qrString);
      }
      this.closeModal();
    } catch (e) {
      if (!this.override) {
        this.messageService.addError('Invalid Base58 checksum!');
      }
    }
  }
  handleInput(ev: InputEvent) {
    this.handlePaste(ev as unknown as ClipboardEvent);
  }
  handlePaste(ev: ClipboardEvent) {
    let shouldCloseModal = true;
    try {
      const clipboardString = ev?.clipboardData?.getData('text') || this.manualInput;
      const pairingInfo = clipboardString ? this.deeplinkService.QRtoPairingJson(clipboardString) : '';
      if (!this.override && pairingInfo) {
        this.beaconService.preNotifyPairing(pairingInfo);
        this.beaconService.addPeer(pairingInfo);
      } else if (clipboardString && this.override) {
        this.scanResponse.emit({ pkh: clipboardString });
      } else if (clipboardString.startsWith('wc')) {
        this.walletConnectService.pair(clipboardString);
      } else {
        shouldCloseModal = false;
      }
    } catch (e) {
      this.messageService.addError('Invalid Base58 checksum!');
    } finally {
      if (shouldCloseModal) {
        this.closeModal();
      }
    }
  }
  cancelRecipient(event: Event): void {
    event.preventDefault();
    this.closeModal();
  }

  override close(): void {
    this.scanSession++;
    this.loadingCam = false;
    if (this.qrScanner) {
      this.qrScanner.destroy();
      this.qrScanner = null;
    }
    if (this.override) {
      this.recipientMotion?.close();
      this.recipientMotion = undefined;
      this.isOpen = false;
    } else {
      super.close();
    }
  }

  override ngOnDestroy(): void {
    if (this.isOpen) this.close();
    super.ngOnDestroy();
  }

  closeModal(): void {
    if (!this.override) {
      ModalComponent.currentModel.next({ name: '', data: null });
    } else {
      this.close();
      this.recipientTrigger?.nativeElement.focus({ preventScroll: true });
    }
    this.manualInput = '';
  }
}
