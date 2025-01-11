import { Inject, Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ConfigType } from '@nestjs/config';
import { AuthService } from '../auth.service';
import facebookOauthConfig from '../config/facebook-oauth.config';
import { Profile, Strategy } from 'passport-facebook';

@Injectable()
export class FacebookStrategy extends PassportStrategy(Strategy, 'facebook') {
  constructor(
    @Inject(facebookOauthConfig.KEY)
    private facebokConfig: ConfigType<typeof facebookOauthConfig>,
    private authService: AuthService,
  ) {
    super({
      clientID: facebokConfig.clientId,
      clientSecret: facebokConfig.clientSecret,
      callbackURL: facebokConfig.callbackURL,
      scope: 'email',
      profileFields: ['emails', 'name'],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: Profile,
    done: (err: any, user: any, info?: any) => void,
  ): Promise<any> {
    const { name, emails } = profile;
    const user = await this.authService.validateFacebookUser({
      email: emails[0].value,
      name: name.givenName + ' ' + name.familyName,
      profile_picture: '',
      password: '',
      phone_number: '',
      address: '',
    });

    done(null, user);
  }
}
