import { Component } from '@angular/core';
import { TriggerPanelDirective } from '../src/app/components/ui/dropdown/trigger-panel.directive';

@Component({
  standalone: true,
  imports: [TriggerPanelDirective],
  template: `<button #trigger>Menu</button>
    <div [walletPanelTrigger]="trigger" [panelOpen]="'closed'"></div>`
})
export class InvalidPanelConsumer {}
