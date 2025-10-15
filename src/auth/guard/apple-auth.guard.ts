// src/auth/guard/apple-auth.guard.ts
import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class AppleAuthGuard extends AuthGuard('apple') {}
