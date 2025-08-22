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
  @Cron('0 0 * * *') // runs every day at midnight
  async scheduleDeleteOldBlacklistedToken() {
    await this.cleaner.deleteOldBlacklistedToken();
    await this.cleaner.removePendingBooking();
    await this.cleaner.deleteOldNotifications();
    await this.eventFrequencyCronService.generateNextRecurringEvents();
  }
}
