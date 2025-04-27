import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtModule } from '@nestjs/jwt';
import {
  FacebookStrategy,
  GoogleStrategy,
  JwtStrategy,
  RefreshJwtStrategy,
} from './strategy';
import { ConfigModule } from '@nestjs/config';
import googleOauthConfig from './config/google-oauth.config';
import facebookOauthConfig from './config/facebook-oauth.config';
import { NotificationService } from '../notification/notification.service';

@Module({
  imports: [
    JwtModule.register({}),
    ConfigModule.forFeature(googleOauthConfig),
    ConfigModule.forFeature(facebookOauthConfig),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    NotificationService,
    JwtStrategy,
    RefreshJwtStrategy,
    GoogleStrategy,
    FacebookStrategy,
  ],
})
export class AuthModule {}
