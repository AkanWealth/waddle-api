import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import {
  BlacklistTokenDto,
  SignInDto,
  UserSignUpDto,
  OrganiserSignUpDto,
  SsoSignInDto,
} from './dto';
import { PrismaService } from '../prisma/prisma.service';
import * as argon from 'argon2';
import { JwtService } from '@nestjs/jwt';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { ConfigService } from '@nestjs/config';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { Mailer, Otp } from '../helper';

@Injectable()
export class AuthService {
  private readonly s3Client = new S3Client({
    region: 'eu-north-1',
    credentials: {
      accessKeyId: this.config.getOrThrow('AWS_ACCESS_KEY'),
      secretAccessKey: this.config.getOrThrow('AWS_SECRET_KEY'),
    },
  });

  constructor(
    private config: ConfigService,
    private prisma: PrismaService,
    private jwt: JwtService,
    private otp: Otp,
    private mailer: Mailer,
  ) {}

  // Start Customer
  async createCustomer(dto: UserSignUpDto, fileName?: string, file?: Buffer) {
    try {
      if (file) {
        await this.s3Client.send(
          new PutObjectCommand({
            Bucket: this.config.getOrThrow('AWS_BUCKET_NAME'),
            Key: `${this.config.getOrThrow('S3_USER_FOLDER')}/${fileName}`,
            Body: file,
            ACL: 'public-read',
          }),
        );
      }

      const hash = await argon.hash(dto.password);

      // generate token and expiration time
      const verificatonToken = this.otp.generateBasicOTP();
      console.log(verificatonToken, 'This is the verification token');
      console.log(dto, 'This is the dto');
      const payload = {
        name: dto.name,
        email: dto.email,
        password: hash,
        verification_token: verificatonToken.token,
        verification_token_expiration: verificatonToken.expiration.toString(),
      };
      console.log('Insert payload:', payload);

      const customer = await this.prisma.user.create({
        data: {
          name: dto.name,
          email: dto.email,
          role: 'GUARDIAN',
          // profile_picture: fileName || null,
          password: hash,
          verification_token: verificatonToken.token,
          verification_token_expiration: verificatonToken.expiration.toString(),
        },
      });

      if (!customer) throw new BadRequestException('Email already in use');

      // email verification section
      const subject = 'Email Verification';
      const message = `<p>Hello ${customer.name},</p>

      <p>Thank you for signing up on Waddle, you only have one step left, kindly verify using the token: <b>${verificatonToken.token}</b> to complete our signup process</p>

      <p>Warm regards,</p>

      <p>Waddle Team</p>
      `;

      const mail = await this.mailer.sendMail(customer.email, subject, message);

      const token = await this.signToken(customer.id, customer.email, '');

      return {
        message: mail.message,
        access_token: token.access_token,
        refresh_token: token.refresh_token,
      };
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new BadRequestException('Credentials Taken');
        }
      }
      throw error;
    }
  }

  async verifyCustomerEmail(token: string) {
    try {
      const user = await this.prisma.user.findFirst({
        where: {
          verification_token: token,
          verification_token_expiration: {
            gte: Date.now().toString(),
          },
        },
      });

      if (!user) {
        throw new BadRequestException('Invalid or expired token');
      }

      // Update user verification status in the database
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          email_verify: true,
          verification_token: null,
          verification_token_expiration: null,
        },
      });

      return { message: 'User verified' };
    } catch (error) {
      throw error;
    }
  }

  async customerLogin(dto: SignInDto) {
    try {
      const customer = await this.prisma.user.findUnique({
        where: { email: dto.email },
      });

      // If validation fails
      if (!customer) {
        throw new UnauthorizedException('Invalid Credential');
      }

      // Check if the customer is deleted
      if (customer?.isDeleted) {
        throw new ForbiddenException(
          'Account is trashed, contact support to restore.',
        );
      }

      // Check if the customer is locked
      if (customer?.isLocked) {
        throw new ForbiddenException('Account is locked, try again later!');
      }

      // Lock the account after 3 failed attempts
      if (customer?.failedLoginAttempts >= 3) {
        await this.prisma.user.update({
          where: { id: customer.id },
          data: { isLocked: false },
        });
        throw new ForbiddenException('Account is locked, try again later!');
      }

      const isValidPassword = await argon.verify(
        customer.password,
        dto.password,
      );

      // If validation fails
      if (!isValidPassword) {
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
      return this.signToken(customer.id, customer.email, '');
    } catch (error) {
      throw error;
    }
  }

  async validateSsoSignin(dto: SsoSignInDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto?.email },
    });

    if (user) {
      return await this.signToken(user.id, user.email, user.role);
    } else {
      const newUser = await this.prisma.user.create({
        data: <any>{ ...dto, email_verify: true },
      });
      return await this.signToken(newUser.id, newUser.email, newUser.role);
    }
  }

  async validateGoogleUser(googleUser: SsoSignInDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: googleUser?.email },
    });

    if (user) return user;

    return await this.prisma.user.create({
      data: <any>{ ...googleUser, email_verify: true },
    });
  }

  async validateFacebookUser(facebookUser: SsoSignInDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: facebookUser?.email },
    });

    if (user) return user;

    return await this.prisma.user.create({
      data: <any>{ ...facebookUser, email_verify: true },
    });
  }

  async generateResetTokenForUser(userEmail: string) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { email: userEmail },
      });
      if (!user) {
        throw new NotFoundException('Customer not found');
      }

      // Check if the staff is deleted
      if (user?.isDeleted) {
        throw new ForbiddenException(
          'Account is trashed, contact support to restore.',
        );
      }

      // generate token and expiration time
      const resetToken = this.otp.generateBasicOTP();

      // save token and expiration time to database
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          reset_token: resetToken.token,
          reset_expiration: resetToken.expiration.toString(),
        },
      });

      // send reset token to the user
      const subject = `Password Reset Request`;
      const message = `
      <p>Hi,</p>

      <p>You requested a password reset. Here is your reset token: <b>${resetToken.token}</b> to reset your password.</p>

      <p>It will expire within an hour. If you did not request this, please ignore this email.</p>

      <p>Warm regards,</p>

      <p><b>Waddle Team</b></p>
      `;

      await this.mailer.sendMail(user.email, subject, message);

      return { resetToken };
    } catch (error) {
      throw error;
    }
  }

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
        throw new NotFoundException('Invalid or expired token');
      }

      const hashed = await argon.hash(password);

      // save new password to database
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          password: hashed,
          isLocked: false,
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
  // End Customer

  // Start Organiser
  async createOrganiser(
    dto: OrganiserSignUpDto,
    fileName?: string,
    file?: Buffer,
  ) {
    try {
      const existingEmail = await this.prisma.organiser.findUnique({
        where: { email: dto.email },
      });
      if (existingEmail) throw new BadRequestException('Email already in use');

      if (file) {
        await this.s3Client.send(
          new PutObjectCommand({
            Bucket: this.config.getOrThrow('AWS_BUCKET_NAME'),
            Key: `${this.config.getOrThrow('S3_VENDOR_FOLDER')}/${fileName}`,
            Body: file,
            ACL: 'public-read',
          }),
        );
      }

      const hash = await argon.hash(dto.password);
      const verificationToken = this.otp.generateBasicOTP();

      const organiser = await this.prisma.organiser.create({
        data: {
          ...dto,
          business_logo: fileName || null,
          password: hash,
          verification_token: verificationToken.token,
          verification_token_expiration:
            verificationToken.expiration.toString(),
        },
      });

      const subject = 'Email Verification';
      const message = `<p>Hello ${organiser.name},</p>

      <p>Thank you for signing up on Waddle, you only have one step left, kindly verify using the token: <b>${verificationToken.token}</b> to complete our signup process</p>

      <p>Warm regards,</p>

      <p>Waddle Team</p>
      `;

      const mail = await this.mailer.sendMail(
        organiser.email,
        subject,
        message,
      );
      const token = await this.signToken(
        organiser.id,
        organiser.email,
        organiser.role,
      );

      return {
        message: mail.message,
        access_token: token.access_token,
        refresh_token: token.refresh_token,
      };
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new BadRequestException('Credentials Taken');
        }
      }
      throw error;
    }
  }

  async verifyOrganiserEmail(token: string) {
    try {
      const organiser = await this.prisma.organiser.findFirst({
        where: {
          verification_token: token,
          verification_token_expiration: {
            gte: Date.now().toString(),
          },
        },
      });

      if (!organiser) {
        throw new BadRequestException('Invalid or expired token');
      }

      // Update user verification status in the database
      await this.prisma.organiser.update({
        where: { id: organiser.id },
        data: {
          email_verify: true,
          verification_token: null,
          verification_token_expiration: null,
        },
      });

      return { message: 'Organiser verified' };
    } catch (error) {
      throw error;
    }
  }

  async organiserLogin(dto: SignInDto) {
    try {
      const organiser = await this.prisma.organiser.findUnique({
        where: { email: dto.email },
      });
      if (!organiser) {
        throw new UnauthorizedException('Invalid Credential');
      }

      // Check if the organiser is deleted
      if (organiser?.isDeleted) {
        throw new ForbiddenException(
          'Account is trashed, contact support to restore.',
        );
      }

      // Check if the organiser is locked
      if (organiser?.isLocked) {
        throw new ForbiddenException('Account is locked, try again later!');
      }

      // Lock the account after 3 failed attempts
      if (organiser.failedLoginAttempts >= 3) {
        await this.prisma.organiser.update({
          where: { id: organiser.id },
          data: { isLocked: false },
        });
        throw new ForbiddenException('Account is locked, try again later!');
      }

      const isValidPassword = await argon.verify(
        organiser.password,
        dto.password,
      );

      // If validation fails
      if (!isValidPassword) {
        await this.prisma.organiser.update({
          where: { id: organiser.id },
          data: { failedLoginAttempts: organiser.failedLoginAttempts + 1 },
        });
        throw new UnauthorizedException('Invalid Credential');
      }

      // Reset login attempts on successful attempt
      await this.prisma.organiser.update({
        where: { id: organiser.id },

        data: { lastLoginAt: new Date(), failedLoginAttempts: 0 },
      });

      // Proceed with your normal login logic (e.g., generating JWT)
      return this.signToken(organiser.id, organiser.email, organiser.role);
    } catch (error) {
      throw error;
    }
  }

  async generateResetTokenForOrganiser(userEmail: string) {
    try {
      const organiser = await this.prisma.organiser.findUnique({
        where: { email: userEmail },
      });
      if (!organiser) {
        throw new NotFoundException('Organiser not found');
      }

      // Check if the staff is deleted
      if (organiser?.isDeleted) {
        throw new ForbiddenException(
          'Account is trashed, contact support to restore.',
        );
      }

      // generate token and expiration time
      const resetToken = this.otp.generateBasicOTP();

      // save token and expiration time to database
      await this.prisma.organiser.update({
        where: { id: organiser.id },
        data: {
          reset_token: resetToken.token,
          reset_expiration: resetToken.expiration.toString(),
        },
      });

      // send reset token to the user
      const subject = `Password Reset Request`;
      const message = `
      <p>Hi,</p>

      <p>You requested a password reset. Here is your reset token: <b>${resetToken.token}</b> to reset your password.</p>

      <p>It will expire within an hour. If you did not request this, please ignore this email.</p>

      <p>Warm regards,</p>

      <p><b>Waddle Team</b></p>
      `;

      await this.mailer.sendMail(organiser.email, subject, message);

      return { resetToken };
    } catch (error) {
      throw error;
    }
  }

  async resetOrganiserPassword(resetToken: string, password: string) {
    try {
      const organiser = await this.prisma.organiser.findFirst({
        where: {
          reset_token: resetToken,
          reset_expiration: {
            gte: Date.now().toString(),
          },
        },
      });

      if (!organiser) {
        throw new NotFoundException('Invalid or expired token');
      }

      const hashed = await argon.hash(password);

      // save new password to database
      await this.prisma.organiser.update({
        where: { id: organiser.id },
        data: {
          password: hashed,
          isLocked: false,
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
  // End Organiser

  // Start Admin
  async verifyAdminEmail(token: string, password: string) {
    try {
      const oneHourAgo = Date.now() - 60 * 60 * 1000;

      const admin = await this.prisma.admin.findFirst({
        where: {
          reset_token: token,
          reset_expiration: {
            gte: oneHourAgo.toString(),
          },
        },
      });

      if (!admin) throw new BadRequestException('Invalid or expired token');

      const hashed = await argon.hash(password);

      // save new password to database
      await this.prisma.admin.update({
        where: { id: admin.id },
        data: {
          password: hashed,
          activationStatus: 'ACTIVE',
          email_verify: true,
          reset_token: null,
          reset_expiration: null,
        },
      });

      return { message: 'Admin verified' };
    } catch (error) {
      throw error;
    }
  }

  async adminLogin(dto: SignInDto) {
    try {
      const admin = await this.prisma.admin.findUnique({
        where: { email: dto.email },
      });
      if (!admin) throw new UnauthorizedException('Invalid credential');

      const isValidPassword = await argon.verify(admin.password, dto.password);
      if (!isValidPassword)
        throw new UnauthorizedException('Invalid Credential');

      if (admin.activationStatus === 'INACTIVE')
        throw new ForbiddenException('Your account is not active.');
      if (admin.isDeleted)
        throw new ForbiddenException('Sorry, you can not log in this account');

      // Check if the admin is verified
      if (!admin.email_verify)
        throw new ForbiddenException('Your acount is not verified.');

      return this.signToken(admin.id, admin.email, admin.role);
    } catch (error) {
      throw error;
    }
  }

  async generateResetTokenForAdmin(userEmail: string) {
    try {
      const admin = await this.prisma.admin.findUnique({
        where: { email: userEmail },
      });
      if (!admin) {
        throw new NotFoundException('Admin not found');
      }

      // generate token and expiration time
      const resetToken = this.otp.generateBasicOTP();

      // save token and expiration time to database
      await this.prisma.admin.update({
        where: { id: admin.id },
        data: {
          reset_token: resetToken.token,
          reset_expiration: resetToken.expiration.toString(),
        },
      });

      // send reset token to the user
      const subject = `Password Reset Request`;
      const message = `
      <p>Hi ${admin.first_name},</p>

      <p>You requested a password reset. Here is your reset token: <b>${resetToken.token}</b> to reset your password.</p>

      <p>It will expire within an hour. If you did not request this, please ignore this email.</p>

      <p>Warm regards,</p>

      <p><b>Waddle Team</b></p>
      `;

      const mail = await this.mailer.sendMail(admin.email, subject, message);

      return { message: mail.message, resetToken };
    } catch (error) {
      throw error;
    }
  }
  async generateResetTokenForAdminWeb(userEmail: string) {
    try {
      const admin = await this.prisma.admin.findUnique({
        where: { email: userEmail },
      });
      if (!admin) {
        throw new NotFoundException('Admin not found');
      }

      // generate token and expiration time
      const resetToken = this.otp.generateBasicOTP();

      // save token and expiration time to database
      await this.prisma.admin.update({
        where: { id: admin.id },
        data: {
          reset_token: resetToken.token,
          reset_expiration: resetToken.expiration.toString(),
        },
      });
      const resetUrl = `https://waddle-admn.vercel.app/reset-password?token=${resetToken.token}`;

      // send reset token to the user
      const subject = `Password Reset Request`;
      const message = `
      <p>Hi ${admin.first_name},</p>

      <p>You requested a password reset. Click the link below to reset your password:</p>
      <p><a href="${resetUrl}" target="_blank">${resetUrl}</a></p>
      <p>This link will expire within an hour. If you did not request this, please ignore this email.</p>

      <p>Warm regards,</p>      
      
      <p><b>Waddle Team</b></p>
      `;

      const mail = await this.mailer.sendMail(admin.email, subject, message);

      return { message: mail.message, resetToken };
    } catch (error) {
      throw error;
    }
  }

  async resetAdminPassword(resetToken: string, password: string) {
    try {
      const admin = await this.prisma.admin.findFirst({
        where: {
          reset_token: resetToken,
          reset_expiration: {
            gte: Date.now().toString(),
          },
        },
      });

      if (!admin) {
        throw new NotFoundException('Invalid or expired token');
      }

      const hashed = await argon.hash(password);

      // save new password to database
      await this.prisma.admin.update({
        where: { id: admin.id },
        data: {
          email_verify: true,
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
  // End Admin

  async signToken(userId: string, email: string, role: string) {
    const payload = { sub: userId, email, role };

    const access_token = await this.jwt.signAsync(payload, {
      expiresIn: this.config.get<string>('JWT_EXPIRATION_TIME'),
      secret: this.config.get<string>('JWT_SECRET_KEY'),
    });

    const refresh_token = await this.jwt.signAsync(payload, {
      expiresIn: this.config.get<string>('JWT_REFRESH_EXPIRATION_TIME'),
      secret: this.config.get<string>('JWT_REFRESH_SECRET_KEY'),
    });

    return { message: 'Login successful', access_token, refresh_token };
  }

  async refreshToken(token: string) {
    const blacklistToken = await this.prisma.blacklistedToken.findFirst({
      where: { refresh_token: token },
    });
    console.log(blacklistToken);
    if (blacklistToken) {
      throw new ForbiddenException('Login, token has been blacklisted!');
    }
    console.log(token, 'This is the token');
    console.log('Try stuff here');
    console.log(this.config.get<string>('JWT_REFRESH_SECRET_KEY'));
    const decoded = await this.jwt.verifyAsync(token, {
      secret: this.config.get<string>('JWT_REFRESH_SECRET_KEY'),
    });
    console.log('Decoded token:', decoded);
    if (!decoded) {
      throw new UnauthorizedException('Token is invalid');
    }
    console.log('We are gonna test');

    const payload = {
      sub: decoded.sub,
      email: decoded.email,
      role: decoded.role,
    };

    const access_token = await this.jwt.signAsync(payload, {
      expiresIn: this.config.get<string>('JWT_EXPIRATION_TIME'),
      secret: this.config.get<string>('JWT_SECRET_KEY'),
    });

    return { access_token };
  }

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
