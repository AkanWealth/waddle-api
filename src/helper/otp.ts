// helper fuction to generate OTP using speakeasy
import * as speakeasy from 'speakeasy';

export class Otp {
  constructor(private secret: string) {
    this.secret = speakeasy.generateSecret({ length: 20 });
  }

  generateBasicOTP() {
    const token = Math.floor(100000 + Math.random() * 900000).toString();
    const expiration = Date.now() + 3600000; // 1 hour
    return { token, expiration };
  }

  generate2FA() {
    const token = speakeasy.totp({
      secret: this.secret['base32'],
      encoding: 'base32',
      digits: 6,
    });
    return { token };
  }

  verify2FA(token) {
    const status = speakeasy.totp.verify({
      secret: this.secret['base32'],
      encoding: 'base32',
      token,
      window: 1,
    });
    return { status };
  }
}
