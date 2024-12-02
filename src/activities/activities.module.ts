import {
  MiddlewareConsumer,
  Module,
  NestModule,
  RequestMethod,
} from '@nestjs/common';
import { ActivitiesService } from './activities.service';
import { ActivitiesController } from './activities.controller';
import { JwtModule } from '@nestjs/jwt';
import { JwtStrategy } from '../auth/strategy';
import { ActvitiesMiddleware } from '../middleware';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET_KEY,
      signOptions: { expiresIn: process.env.JWT_EXPIRATION_TIME },
    }),
  ],
  controllers: [ActivitiesController],
  providers: [ActivitiesService, JwtStrategy],
})
export class ActivitiesModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // consuming middleware for authorization
    consumer
      .apply(ActvitiesMiddleware)
      .exclude({ path: '*', method: RequestMethod.GET })
      .forRoutes(ActivitiesController);
  }
}
