import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { Cleaner, EventFrequencyCronService } from './helper';

@Injectable()
export class AppService {
  constructor(
    private readonly cleaner: Cleaner,
    private readonly eventFrequencyCronService: EventFrequencyCronService,
  ) {}

  // cron job to run automated task
  // @Cron('0 0 * * *') // runs every day at midnight
  @Cron('*/5 * * * * *')
  async scheduleDeleteOldBlacklistedToken() {
    console.log('Cron job started at ' + new Date().toISOString());

    try {
      await Promise.all([
        this.cleaner.deleteOldBlacklistedToken(),
        this.cleaner.removePendingBooking(),
        this.cleaner.deleteOldNotifications(),
        this.eventFrequencyCronService.generateNextRecurringEvents(),
      ]);
    } catch (error) {
      console.error('Error running cron tasks:', error);
    }

    console.log('Cron job finished at ' + new Date().toISOString());
  }
}
