import { Module } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { NotificationController } from './notification.controller';
import { firebaseAdminProvider } from './firebase-admin.provider';
import { Mailer } from '../helper';

@Module({
  controllers: [NotificationController],
  providers: [firebaseAdminProvider, NotificationService, Mailer],
})
export class NotificationModule {}
