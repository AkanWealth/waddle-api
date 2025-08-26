import { Module, NestModule } from '@nestjs/common';
import { EventService } from './event.service';
import { EventController } from './event.controller';
import { JwtModule } from '@nestjs/jwt';
import { JwtStrategy } from '../auth/strategy';
import { NotificationService } from 'src/notification/notification.service';
import { NotificationModule } from 'src/notification/notification.module';
import { Mailer } from 'src/helper';
import { PaymentModule } from '../payment/payment.module';
import { PaymentService } from '../payment/payment.service';
import { OrganiserModule } from 'src/organiser/organiser.module';
import { OrganiserService } from 'src/organiser/organiser.service';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET_KEY,
      signOptions: { expiresIn: process.env.JWT_EXPIRATION_TIME },
    }),
    NotificationModule,
    PaymentModule,
    OrganiserModule,
  ],
  controllers: [EventController],
  providers: [
    EventService,
    JwtStrategy,
    NotificationService,
    Mailer,
    PaymentService,
    OrganiserService,
  ],
})
export class EventModule implements NestModule {
  configure() {}
}
