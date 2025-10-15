// src/auth/strategy/apple.strategy.ts
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-apple';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';

@Injectable()
export class AppleStrategy extends PassportStrategy(Strategy, 'apple') {
  constructor(
    private config: ConfigService,
    private authService: AuthService,
  ) {
    super({
      clientID: config.getOrThrow('APPLE_CLIENT_ID'),
      teamID: config.getOrThrow('APPLE_TEAM_ID'),
      keyID: config.getOrThrow('APPLE_KEY_ID'),
      privateKeyString: config.getOrThrow('APPLE_PRIVATE_KEY'),
      callbackURL: config.getOrThrow('APPLE_CALLBACK_URL'),
      scope: ['name', 'email'],
      passReqToCallback: false,
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    idToken: string,
    profile: any,
    done: any,
  ): Promise<any> {
    const { name, email } = profile;

    const appleUser = {
      email: email,
      name: name ? `${name.firstName} ${name.lastName}` : email?.split('@')[0],
      phone_number: '',
      address: '',
    };

    const user = await this.authService.validateAppleUser(appleUser);
    done(null, user);
  }
}
