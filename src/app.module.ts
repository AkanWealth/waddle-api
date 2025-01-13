import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { UserModule } from './user/user.module';
import { ActivitiesModule } from './activities/activities.module';
import { VendorModule } from './vendor/vendor.module';
import { ThrottlerModule, ThrottlerModuleOptions } from '@nestjs/throttler';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRootAsync({
      useFactory: () =>
        ({
          ttl: 60,
          limit: 3,
          throttlers: [], // Add the throttlers property here
        }) as ThrottlerModuleOptions,
    }),
    AuthModule,
    UserModule,
    VendorModule,
    ActivitiesModule,
    PrismaModule,
  ],
})
export class AppModule {}
