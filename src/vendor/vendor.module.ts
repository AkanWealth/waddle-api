import {
  MiddlewareConsumer,
  Module,
  NestModule,
  RequestMethod,
} from '@nestjs/common';
import { VendorService } from './vendor.service';
import { VendorController } from './vendor.controller';
import { VendorsMiddleware } from '../middleware';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET_KEY,
      signOptions: { expiresIn: process.env.JWT_EXPIRATION_TIME },
    }),
  ],
  controllers: [VendorController],
  providers: [VendorService],
})
export class VendorModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // consuming middleware for authorization
    consumer
      .apply(VendorsMiddleware)
      .exclude({ path: '*', method: RequestMethod.GET })
      .forRoutes(VendorController);
  }
}
