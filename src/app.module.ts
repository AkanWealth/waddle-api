import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { UserModule } from './user/user.module';
import { OrganiserModule } from './organiser/organiser.module';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule, ThrottlerModuleOptions } from '@nestjs/throttler';
import { LocationModule } from './location/location.module';
import { ReviewModule } from './review/review.module';
import { EventModule } from './event/event.module';
import { FavoriteModule } from './favorite/favorite.module';
import { BookingModule } from './booking/booking.module';
import { WebhookModule } from './webhook/webhook.module';
import { NotificationModule } from './notification/notification.module';
import { LikeModule } from './like/like.module';
import { TicketModule } from './ticket/ticket.module';
import { AdminModule } from './admin/admin.module';
import { CrowdSourcingModule } from './crowd-sourcing/crowd-sourcing.module';
import { DisputeModule } from './dispute/dispute.module';
import { Cleaner } from './helper';
import { PaymentModule } from './payment/payment.module';
import { UploadModule } from './upload/upload.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRootAsync({
      useFactory: () =>
        ({
          ttl: 60,
          limit: 5,
          throttlers: [], // Add the throttlers property here
        }) as ThrottlerModuleOptions,
    }),
    AuthModule,
    UserModule,
    OrganiserModule,
    EventModule,
    PrismaModule,
    LocationModule,
    ReviewModule,
    FavoriteModule,
    BookingModule,
    WebhookModule,
    NotificationModule,
    LikeModule,
    TicketModule,
    AdminModule,
    CrowdSourcingModule,
    DisputeModule,
    PaymentModule,
    UploadModule,
  ],
  providers: [AppService, Cleaner],
  controllers: [AppController],
})
export class AppModule {}
