import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class RefreshJwtStrategy extends PassportStrategy(
  Strategy,
  'refresh-jwt',
) {
  constructor(
    config: ConfigService,
    private prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: config.get('JWT_REFRESH_SECRET_KEY'),
    });
  }

  async validate(payload: { sub: string; email: string }) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });
    const vendor = await this.prisma.vendor.findUnique({
      where: { id: payload.sub },
    });
    const admin = await this.prisma.admin.findUnique({
      where: { id: payload.sub },
    });

    if (vendor) {
      delete vendor.password;
      return vendor;
    } else if (admin) {
      delete admin.password;
      return admin;
    } else {
      delete user.password;
      return user;
    }
  }
}
