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
// middleware for activities role based authorization
export class ActvitiesMiddleware implements NestMiddleware {
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

    const decoded = await this.jwt.verify(bearerToken);
    const user = await this.prisma.user.findUnique({
      where: { id: decoded.sub },
    });
    const admin = await this.prisma.admin.findUnique({
      where: { id: decoded.sub },
    });

    delete admin?.password;
    delete user?.password;

    if (admin || user) {
      if (admin?.role === 'Customer' || user?.role === 'Customer') {
        if (req.method !== 'GET') {
          throw new ForbiddenException(
            'You are not authorized for this action',
          );
        }
      }
    }

    req.user = admin;
    req.user = user;
    next();
  }
}
