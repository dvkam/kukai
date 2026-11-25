import { Component, Input } from '@angular/core';
import { Account, Activity } from '../../../../../services/wallet/wallet';
import { ActivityService, ActivityState } from '../../../../../services/activity/activity.service';
import { CoordinatorService } from '../../../../../services/coordinator/coordinator.service';
import { CONSTANTS } from '../../../../../../environments/environment';

@Component({
  selector: 'app-activity',
  templateUrl: './activity.component.html',
  styleUrls: ['../../../../../../scss/components/views/logged-in/account-view/cards/activity/activity.component.scss']
})
export class ActivityComponent {
  @Input({ required: true }) account: Account;

  constructor(private activityService: ActivityService, private coordinatorService: CoordinatorService) {}

  get state(): ActivityState {
    return this.activityService.getActivityState(this.account);
  }

  get refreshing(): boolean {
    return this.activityService.isRefreshing(this.account);
  }

  retry(): void {
    if (!this.refreshing) {
      this.coordinatorService.update(this.account.address);
    }
  }

  explorerURL(hash: string): string {
    const baseURL = CONSTANTS.BLOCK_EXPLORER_URL;
    return `${baseURL}/${hash}`;
  }

  trackEvent(index: number, activity: Activity): string {
    return activity.block + activity.hash;
  }
}
