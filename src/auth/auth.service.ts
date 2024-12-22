import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { SignInDto, SignUpDto } from './dto';
import { PrismaService } from '../prisma/prisma.service';
import * as argon from 'argon2';
import { JwtService } from '@nestjs/jwt';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { ConfigService } from '@nestjs/config';
import { createTransport } from 'nodemailer';

@Injectable()
export class AuthService {
  constructor(
    private config: ConfigService,
    private prisma: PrismaService,
    private jwt: JwtService,
  ) {}

  // function to register a new user
  async register(dto: SignUpDto) {
    try {
      const hash = await argon.hash(dto.password);

      const user = await this.prisma.user.create({
        data: { ...dto, password: hash },
      });

      return this.sendVerification(user.email);
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new BadRequestException('Credentials Taken');
        }
      }
      throw error;
    }
  }

  // function to login as a customer
  async login(dto: SignInDto) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { email: dto.email },
      });
      if (!user) throw new UnauthorizedException('Invalid credential');

      const isValidPassword = await argon.verify(user.password, dto.password);
      if (!isValidPassword)
        throw new UnauthorizedException('Invalid Credential');

      return this.signToken(user.id, user.email);
    } catch (error) {
      throw error;
    }
  }

  // function to login as an admin
  async admin(dto: SignInDto) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { email: dto.email },
      });
      if (!user) throw new UnauthorizedException('Invalid credential');

      const isValidPassword = await argon.verify(user.password, dto.password);
      if (!isValidPassword)
        throw new UnauthorizedException('Invalid Credential');

      return this.signToken(user.id, user.email);
    } catch (error) {
      throw error;
    }
  }

  // function to validate google user
  async validateGoogleUser(googleUser: SignUpDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: googleUser?.email },
    });

    if (user) return user;

    return await this.prisma.user.create({
      data: googleUser,
    });
  }

  // function to validate facebook user
  async validateFacebookUser(facebookUser: SignUpDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: facebookUser?.email },
    });

    if (user) return user;

    return await this.prisma.user.create({
      data: facebookUser,
    });
  }

  // function to validate the registered user
  async sendVerification(userEmail: string) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { email: userEmail },
      });

      const transporter = createTransport({
        host: this.config.getOrThrow('SMTP_HOST'),
        port: this.config.getOrThrow('SMTP_PORT'),
        auth: {
          user: this.config.getOrThrow('SMTP_USER'),
          pass: this.config.getOrThrow('SMTP_PASSWORD'),
        },
      });

      const mailOptions = {
        from: `"Waddle" <${this.config.getOrThrow('SMTP_USER')}>`,
        to: [user.email, this.config.getOrThrow('SMTP_USER')],
        subject: 'Email Verification',
        html: `<p>Hello,</p>

        <p>Thank you for signing up on waddle, you only have one step left, kindly click <a href="${this.config.getOrThrow('VERIFICATION_URL')}/${user.id}" target="_blank">HERE</a> to verify your email account.</p>

        <p>Warm regards,</p>

        <p>Waddle Team</p>
        `,
      };
      await transporter.sendMail(mailOptions);
      return { message: 'Email sent successfully' };
    } catch (error) {
      throw error;
    }
  }

  // function to update the verification process for the registered user
  async verifyEmail(userId: string) {
    try {
      await this.prisma.user.update({
        where: { id: userId },
        data: { email_verify: true },
      });
      return { message: 'User verified' };
    } catch (error) {
      throw error;
    }
  }

  // function to generate a token
  async signToken(userId: string, email: string) {
    const payload = { sub: userId, email };

    const token = await this.jwt.signAsync(payload, {
      expiresIn: this.config.get<string>('JWT_EXPIRATION_TIME'),
      secret: this.config.get<string>('JWT_SECRET_KEY'),
    });

    return { access_token: token };
  }
}
