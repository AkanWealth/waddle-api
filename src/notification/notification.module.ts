import { Module } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { NotificationController } from './notification.controller';
import { firebaseAdminProvider } from './firebase-admin.provider';
import { Mailer } from '../helper';
import { NotificationHelper } from './notification.helper';

@Module({
  controllers: [NotificationController],
  providers: [
    firebaseAdminProvider,
    NotificationService,
    Mailer,
    NotificationHelper,
  ],
  exports: [NotificationHelper],
})
export class NotificationModule {}
