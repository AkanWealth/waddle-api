import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NestMiddleware,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request, Response, NextFunction } from 'express';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
// middleware for reservation role based authoriazation
export class ReserviationMiddleware implements NestMiddleware {
  constructor(
    private jwt: JwtService,
    private prisma: PrismaService,
  ) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const authHeader = req.headers.authorization;
    const bearerToken = authHeader?.split(' ')[1];
    if (!bearerToken) {
      throw new BadRequestException('Token must be provided');
    }

    const blacklistToken = await this.prisma.blacklistedToken.findFirst({
      where: { access_token: bearerToken },
    });
    if (blacklistToken) {
      throw new ForbiddenException('Login, token has been blacklisted!');
    }

    const decoded = await this.jwt.verify(bearerToken);
    const user = await this.prisma.user.findUnique({
      where: { id: decoded.sub },
    });
    delete user?.password;

    if (user.role === 'Customer') {
      if (req.method !== 'GET') {
        throw new ForbiddenException('You are not authorized for this action');
      }
    }

    req.user = user;
    next();
  }
}
