import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { Cleaner } from './helper';

@Injectable()
export class AppService {
  constructor(private readonly cleaner: Cleaner) {}

  // cron job to run automated task
  @Cron('0 0 * * *') // runs every day at midnight
  async scheduleDeleteOldBlacklistedToken() {
    await this.cleaner.deleteOldBlacklistedToken();
    await this.cleaner.removePendingBooking();
  }
}
