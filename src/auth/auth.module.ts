import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtModule } from '@nestjs/jwt';
import { GoogleStrategy, JwtStrategy } from './strategy';
import { ConfigModule } from '@nestjs/config';
import googleOauthConfig from './config/google-oauth.config';

@Module({
  imports: [JwtModule.register({}), ConfigModule.forFeature(googleOauthConfig)],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, GoogleStrategy],
})
export class AuthModule {}
