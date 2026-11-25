import { Component } from '@angular/core';
import { TriggerPanelDirective } from '../src/app/components/ui/dropdown/trigger-panel.directive';
import { LoggedInModule } from '../src/app/components/views/logged-in/logged-in.module';

@Component({
  standalone: true,
  imports: [TriggerPanelDirective, LoggedInModule],
  template: `<button #trigger>Options</button>
    <div [walletPanelTrigger]="trigger" [panelOpen]="'closed'"></div>
    <div [walletPanelTrigger]="trigger"></div>
    <app-ui-toggle-advanced mode="mixed" />
    <app-ui-toggle-advanced [state]="'open'" />
    <app-ui-toggle-advanced (stateChange)="text = $event" />`
})
export class InvalidComponentConsumer {
  text = '';
}
