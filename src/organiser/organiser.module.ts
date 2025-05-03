import { Module, NestModule } from '@nestjs/common';
import { OrganiserService } from './organiser.service';
import { OrganiserController } from './organiser.controller';
import { JwtModule } from '@nestjs/jwt';
import { NotificationService } from 'src/notification/notification.service';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET_KEY,
      signOptions: { expiresIn: process.env.JWT_EXPIRATION_TIME },
    }),
  ],
  controllers: [OrganiserController],
  providers: [OrganiserService, NotificationService],
})
export class OrganiserModule implements NestModule {
  configure() {}
}
