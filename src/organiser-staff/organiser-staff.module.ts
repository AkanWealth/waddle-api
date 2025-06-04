import { Module } from '@nestjs/common';
import { OrganiserStaffService } from './organiser-staff.service';
import { OrganiserStaffController } from './organiser-staff.controller';
import { JwtModule } from '@nestjs/jwt';
import { NotificationService } from 'src/notification/notification.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { AuthService } from 'src/auth/auth.service';
import { Otp } from 'src/helper';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET_KEY,
      signOptions: { expiresIn: process.env.JWT_EXPIRATION_TIME },
    }),
  ],
  controllers: [OrganiserStaffController],
  providers: [
    OrganiserStaffService,
    NotificationService,
    PrismaService,
    AuthService,
    Otp,
  ],
})
export class OrganiserStaffModule {}
