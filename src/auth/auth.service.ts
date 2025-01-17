import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import {
  BlacklistTokenDto,
  SignInDto,
  UserSignUpDto,
  VendorSignUpDto,
} from './dto';
import { PrismaService } from '../prisma/prisma.service';
import * as argon from 'argon2';
import { JwtService } from '@nestjs/jwt';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { ConfigService } from '@nestjs/config';
import { createTransport } from 'nodemailer';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

@Injectable()
export class AuthService {
  private readonly s3Client = new S3Client({
    region: 'auto',
    endpoint: this.config.getOrThrow('S3_API'),
    credentials: {
      accessKeyId: this.config.getOrThrow('ACCESS_KEY_ID'),
      secretAccessKey: this.config.getOrThrow('SECRET_ACCESS_KEY'),
    },
  });

  constructor(
    private config: ConfigService,
    private prisma: PrismaService,
    private jwt: JwtService,
  ) {}

  // function to create a new customer
  async createCustomer(dto: UserSignUpDto, fileName?: string, file?: Buffer) {
    try {
      if (file) {
        await this.s3Client.send(
          new PutObjectCommand({
            Bucket: this.config.getOrThrow('BUCKET_NAME'),
            Key: fileName,
            Body: file,
          }),
        );
      }

      const hash = await argon.hash(dto.password);

      const customer = await this.prisma.user.create({
        data: { ...dto, profile_picture: fileName || null, password: hash },
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

        <p>Thank you for signing up on waddle, you only have one step left, kindly click <a href="${this.config.getOrThrow('GUARDIAN_VERIFICATION_URL')}/${user.id}" target="_blank">HERE</a> to verify your email account.</p>

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

      // Check if the customer is locked
      if (!customer.isActive) {
        throw new UnauthorizedException('Account is locked, try again later!');
      }

      // Lock the account after 3 failed attempts
      if (customer.failedLoginAttempts >= 3) {
        await this.prisma.user.update({
          where: { id: customer.id },
          data: { isActive: false },
        });
        throw new UnauthorizedException('Account is locked, try again later!');
      }

      const isValidPassword = await argon.verify(
        customer.password,
        dto.password,
      );

      // If validation fails
      if (!customer || !isValidPassword) {
        await this.prisma.user.update({
          where: { id: customer.id },
          data: { failedLoginAttempts: customer.failedLoginAttempts + 1 },
        });
        throw new UnauthorizedException('Invalid Credential');
      }

      // Reset login attempts on successful attempt
      await this.prisma.user.update({
        where: { id: customer.id },
        data: { failedLoginAttempts: 0 },
      });

      // Proceed with your normal login logic (e.g., generating JWT)
      return this.signToken(customer.id, customer.email);
    } catch (error) {
      throw error;
    }
  }

  // function to create a new vendor
  async createVendor(dto: VendorSignUpDto, fileName?: string, file?: Buffer) {
    try {
      if (file) {
        await this.s3Client.send(
          new PutObjectCommand({
            Bucket: this.config.getOrThrow('BUCKET_NAME'),
            Key: fileName,
            Body: file,
          }),
        );
      }

      const hash = await argon.hash(dto.password);

      const vendor = await this.prisma.vendor.create({
        data: { ...dto, business_logo: fileName || null, password: hash },
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

        <p>Thank you for signing up on waddle, you only have one step left, kindly click <a href="${this.config.getOrThrow('VENDOR_VERIFICATION_URL')}/${vendor.id}" target="_blank">HERE</a> to verify your email account.</p>

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

      // Check if the vendor is locked
      if (!vendor.isActive) {
        throw new UnauthorizedException('Account is locked, try again later!');
      }

      // Lock the account after 3 failed attempts
      if (vendor.failedLoginAttempts >= 3) {
        await this.prisma.vendor.update({
          where: { id: vendor.id },
          data: { isActive: false },
        });
        throw new UnauthorizedException('Account is locked, try again later!');
      }

      const isValidPassword = await argon.verify(vendor.password, dto.password);

      // If validation fails
      if (!vendor || !isValidPassword) {
        await this.prisma.vendor.update({
          where: { id: vendor.id },
          data: { failedLoginAttempts: vendor.failedLoginAttempts + 1 },
        });
        throw new UnauthorizedException('Invalid Credential');
      }

      // Reset login attempts on successful attempt
      await this.prisma.vendor.update({
        where: { id: vendor.id },
        data: { failedLoginAttempts: 0 },
      });

      // Proceed with your normal login logic (e.g., generating JWT)
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
  async validateGoogleUser(googleUser: UserSignUpDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: googleUser?.email },
    });

    if (user) return user;

    return await this.prisma.user.create({
      data: googleUser,
    });
  }

  // function to validate facebook user
  async validateFacebookUser(facebookUser: UserSignUpDto) {
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

    const access_token = await this.jwt.signAsync(payload, {
      expiresIn: this.config.get<string>('JWT_EXPIRATION_TIME'),
      secret: this.config.get<string>('JWT_SECRET_KEY'),
    });

    const refresh_token = await this.jwt.signAsync(payload, {
      expiresIn: this.config.get<string>('JWT_REFRESH_EXPIRATION_TIME'),
      secret: this.config.get<string>('JWT_REFRESH_SECRET_KEY'),
    });

    return { access_token, refresh_token };
  }

  // function to generate a fresh token
  async refreshToken(token: string) {
    const blacklistToken = await this.prisma.blacklistedToken.findFirst({
      where: { refresh_token: token },
    });
    if (blacklistToken) {
      throw new ForbiddenException('Login, token has been blacklisted!');
    }

    const decoded = await this.jwt.verifyAsync(token, {
      secret: process.env.JWT_REFRESH_SECRET_KEY,
    });
    if (!decoded) {
      throw new UnauthorizedException('Token is invalid');
    }

    const payload = { sub: decoded.sub, email: decoded.email };

    const access_token = await this.jwt.signAsync(payload, {
      expiresIn: this.config.get<string>('JWT_EXPIRATION_TIME'),
      secret: this.config.get<string>('JWT_SECRET_KEY'),
    });

    return { access_token };
  }

  // function for generating the reset password token for user
  async generateResetTokenForUser(userEmail: string) {
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

        <p>You requested a password reset. Here is your reset token: <b>${resetToken}</b> to reset your password.</p>

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

  // function for user password reset based on reset token
  async resetUserPassword(resetToken: string, password: string) {
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
          isActive: true,
          failedLoginAttempts: 0,
          reset_token: null,
          reset_expiration: null,
        },
      });

      return { message: 'Password reset successful' };
    } catch (error) {
      throw error;
    }
  }

  // function for generating the reset password token for vendor
  async generateResetTokenForVendor(userEmail: string) {
    try {
      const vendor = await this.prisma.vendor.findUnique({
        where: { email: userEmail },
      });
      if (!vendor) {
        throw new Error('Customer not found');
      }

      // generate token and expiration time
      const resetToken = Math.random().toString(36).substr(2);
      const resetTokenExpiration = Date.now() + 3600000; // 1 hour

      // save token and expiration time to database
      await this.prisma.vendor.update({
        where: { id: vendor.id },
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
        to: vendor.email,
        subject: `Password Reset Request`,
        html: `
        <p>Hi,</p>

        <p>You requested a password reset. Here is your reset token: <b>${resetToken}</b> to reset your password.</p>

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

  // function for vendor password reset based on reset token
  async resetVendorPassword(resetToken: string, password: string) {
    try {
      const vendor = await this.prisma.vendor.findFirst({
        where: {
          reset_token: resetToken,
          reset_expiration: {
            gte: Date.now().toString(),
          },
        },
      });

      if (!vendor) {
        throw new Error('Invalid or expired token');
      }

      const hashed = await argon.hash(password);

      // save new password
      await this.prisma.vendor.update({
        where: { id: vendor.id },
        data: {
          password: hashed,
          isActive: true,
          failedLoginAttempts: 0,
          reset_token: null,
          reset_expiration: null,
        },
      });

      return { message: 'Password reset successful' };
    } catch (error) {
      throw error;
    }
  }

  // function to blacklist a token
  async addToken(dto: BlacklistTokenDto) {
    try {
      await this.prisma.blacklistedToken.create({
        data: {
          access_token: dto.access_token,
          refresh_token: dto.refresh_token,
        },
      });
      return { message: 'Logged out successfully' };
    } catch (error) {
      throw error;
    }
  }
}
