import { Module, NestModule } from '@nestjs/common';
import { EventService } from './event.service';
import { EventController } from './event.controller';
import { JwtModule } from '@nestjs/jwt';
import { JwtStrategy } from '../auth/strategy';
import { NotificationService } from 'src/notification/notification.service';
import { NotificationModule } from 'src/notification/notification.module';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET_KEY,
      signOptions: { expiresIn: process.env.JWT_EXPIRATION_TIME },
    }),
    NotificationModule,
  ],
  controllers: [EventController],
  providers: [EventService, JwtStrategy, NotificationService],
})
export class EventModule implements NestModule {
  configure() {}
}
