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
// middleware for vendor role based authorization
export class VendorsMiddleware implements NestMiddleware {
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
    const vendor = await this.prisma.vendor.findUnique({
      where: { id: decoded.sub },
    });
    const admin = await this.prisma.admin.findUnique({
      where: { id: decoded.sub },
    });

    delete admin?.password;
    delete vendor?.password;

    // Check for specific request method and route path
    if (admin || vendor) {
      if (admin?.role === 'Vendor' || vendor?.role === 'Vendor') {
        if (req.method === 'GET' && req.path === '/api/v1/vendors/all') {
          throw new ForbiddenException(
            'You are not authorized for this action',
          );
        }
        if (
          req.method === 'DELETE' &&
          req.path === `/api/v1/vendors/${req.params.id}`
        ) {
          throw new ForbiddenException(
            'You are not authorized for this action',
          );
        }
      }
    }

    req.user = admin;
    req.user = vendor;

    next();
  }
}
