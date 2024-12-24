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

  // function to create a new customer
  async createCustomer(dto: SignUpDto) {
    try {
      const hash = await argon.hash(dto.password);

      const customer = await this.prisma.user.create({
        data: { ...dto, password: hash },
      });

      return this.sendCustomerVerification(customer.email);
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new BadRequestException('Credentials Taken');
        }
      }
      throw error;
    }
  }

  // function to validate the registered customer
  async sendCustomerVerification(email: string) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { email },
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
        to: user.email,
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

  // function to update the verification process for the registered customer
  async verifyCustomerEmail(userId: string) {
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

  // function to login as a customer
  async customerLogin(dto: SignInDto) {
    try {
      const customer = await this.prisma.user.findUnique({
        where: { email: dto.email },
      });
      if (!customer) throw new UnauthorizedException('Invalid credential');

      const isValidPassword = await argon.verify(
        customer.password,
        dto.password,
      );
      if (!isValidPassword)
        throw new UnauthorizedException('Invalid Credential');

      return this.signToken(customer.id, customer.email);
    } catch (error) {
      throw error;
    }
  }

  // function to create a new vendor
  async createVendor(dto: SignUpDto) {
    try {
      const hash = await argon.hash(dto.password);

      const vendor = await this.prisma.vendor.create({
        data: { ...dto, password: hash },
      });

      return this.sendVendorVerification(vendor.email);
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new BadRequestException('Credentials Taken');
        }
      }
      throw error;
    }
  }

  // function to validate the registered customer
  async sendVendorVerification(email: string) {
    try {
      const vendor = await this.prisma.vendor.findUnique({
        where: { email },
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
        to: vendor.email,
        subject: 'Email Verification',
        html: `<p>Hello,</p>

        <p>Thank you for signing up on waddle, you only have one step left, kindly click <a href="${this.config.getOrThrow('VERIFICATION_URL')}/${vendor.id}" target="_blank">HERE</a> to verify your email account.</p>

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

  // function to update the verification process for the registered vendor
  async verifyVendorEmail(userId: string) {
    try {
      await this.prisma.vendor.update({
        where: { id: userId },
        data: { email_verify: true },
      });
      return { message: 'Vendor verified' };
    } catch (error) {
      throw error;
    }
  }

  // function to login as a vendor
  async vendorLogin(dto: SignInDto) {
    try {
      const vendor = await this.prisma.vendor.findUnique({
        where: { email: dto.email },
      });
      if (!vendor) throw new UnauthorizedException('Invalid credential');

      const isValidPassword = await argon.verify(vendor.password, dto.password);
      if (!isValidPassword)
        throw new UnauthorizedException('Invalid Credential');

      return this.signToken(vendor.id, vendor.email);
    } catch (error) {
      throw error;
    }
  }

  // function to login as an admin
  async adminLogin(dto: SignInDto) {
    try {
      const admin = await this.prisma.admin.findUnique({
        where: { email: dto.email },
      });
      if (!admin) throw new UnauthorizedException('Invalid credential');

      const isValidPassword = await argon.verify(admin.password, dto.password);
      if (!isValidPassword)
        throw new UnauthorizedException('Invalid Credential');

      return this.signToken(admin.id, admin.email);
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

  // function to generate a token
  async signToken(userId: string, email: string) {
    const payload = { sub: userId, email };

    const token = await this.jwt.signAsync(payload, {
      expiresIn: this.config.get<string>('JWT_EXPIRATION_TIME'),
      secret: this.config.get<string>('JWT_SECRET_KEY'),
    });

    return { access_token: token };
  }

  // function for generating the reset password token
  async generateResetToken(userEmail: string) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { email: userEmail },
      });
      if (!user) {
        throw new Error('Customer not found');
      }

      // generate token and expiration time
      const resetToken = Math.random().toString(36).substr(2);
      const resetTokenExpiration = Date.now() + 3600000; // 1 hour

      // save token and expiration time to database
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          reset_token: resetToken,
          reset_expiration: resetTokenExpiration.toString(),
        },
      });

      // send reset token to the user
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
        to: user.email,
        subject: `Password Reset Request`,
        html: `
        <p>Hi,</p>

        <p>You requested a password reset. Please click <a href="${this.config.getOrThrow('PASSWORD_RESET_URL')}/${resetToken}" target="_blank">HERE</a> to reset your password.</p>

        <p>It will expire within an hour. If you did not request this, please ignore this email.</p>

        <p>Warm regards,</p>

        <p><b>Waddle Team</b></p>
        `,
      };

      await transporter.sendMail(mailOptions);

      return { resetToken };
    } catch (error) {
      throw error;
    }
  }

  // function for password reset based on reset token
  async resetPassword(resetToken: string, password: string) {
    try {
      const user = await this.prisma.user.findFirst({
        where: {
          reset_token: resetToken,
          reset_expiration: {
            gte: Date.now().toString(),
          },
        },
      });

      if (!user) {
        throw new Error('Invalid or expired token');
      }

      const hashed = await argon.hash(password);

      // save new password
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          password: hashed,
          reset_token: null,
          reset_expiration: null,
        },
      });

      return { message: 'Password reset successful' };
    } catch (error) {
      throw error;
    }
  }
}
