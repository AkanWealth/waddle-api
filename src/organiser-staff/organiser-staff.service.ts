import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import * as argon from 'argon2';
import { AuthService } from 'src/auth/auth.service';
import { ForgotPasswordDto, SignInDto } from 'src/auth/dto';
import { NotificationService } from 'src/notification/notification.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { UpdatePasswordDto } from 'src/user/dto';

@Injectable()
export class OrganiserStaffService {
  constructor(
    private prisma: PrismaService,
    private authService: AuthService,
    private notification: NotificationService,
  ) {}

  async loginOrganiserStaff(dto: SignInDto) {
    try {
      const staff = await this.prisma.organiserStaff.findUnique({
        where: { email: dto.email },
      });
      if (!staff) throw new UnauthorizedException('Invalid credential');

      // Check if the staff is deleted
      if (staff?.isDeleted) {
        throw new ForbiddenException(
          'Account is trashed, contact support to restore.',
        );
      }

      // Check if the staff is locked
      if (staff?.isLocked) {
        throw new ForbiddenException(
          'Account is locked, reset your password to unlock!',
        );
      }

      // Lock the account after 3 failed attempts
      if (staff.failedLoginAttempts >= 3) {
        await this.prisma.organiserStaff.update({
          where: { id: staff.id },
          data: { isLocked: false },
        });
        throw new ForbiddenException('Account is locked, try again later!');
      }

      const verifyPassword = await argon.verify(staff.password, dto.password);
      if (!verifyPassword) {
        await this.prisma.organiserStaff.update({
          where: { id: staff.id },
          data: { failedLoginAttempts: staff.failedLoginAttempts + 1 },
        });
        throw new UnauthorizedException('Invalid credential');
      }

      // Reset login attempts on successful attempt
      await this.prisma.organiserStaff.update({
        where: { id: staff.id },
        data: { failedLoginAttempts: 0 },
      });

      return await this.authService.signToken(
        staff.id,
        staff.email,
        staff.role,
      );
    } catch (error) {
      throw error;
    }
  }

  async generateResetTokenForOrganiserStaff(dto: ForgotPasswordDto) {
    try {
      const staff = await this.prisma.organiserStaff.findUnique({
        where: { email: dto.email },
      });
      if (!staff) {
        throw new NotFoundException('Staff not found');
      }

      // Check if the staff is deleted
      if (staff?.isDeleted) {
        throw new ForbiddenException(
          'Account is trashed, contact support to restore.',
        );
      }

      // generate token and expiration time
      const resetToken = Math.random().toString(36).substr(2);
      const resetTokenExpiration = Date.now() + 3600000; // 1 hour

      // save token and expiration time to database
      await this.prisma.organiserStaff.update({
        where: { id: staff.id },
        data: {
          reset_token: resetToken,
          reset_expiration: resetTokenExpiration.toString(),
        },
      });

      // send reset token to the user
      const subject = `Password Reset Request`;
      const message = `
      <p>Hi ${staff.name},</p>

      <p>You requested a password reset. Here is your reset token: <b>${resetToken}</b> to reset your password.</p>

      <p>It will expire within an hour. If you did not request this, please ignore this email.</p>

      <p>Warm regards,</p>

      <p><b>Waddle Team</b></p>
      `;

      await this.notification.sendMail(staff.email, subject, message);

      return { message: 'Reset token sent' };
    } catch (error) {
      throw error;
    }
  }

  async resetPassword(resetToken: string, password: string) {
    try {
      const staff = await this.prisma.organiserStaff.findFirst({
        where: {
          reset_token: resetToken,
          reset_expiration: {
            gte: Date.now().toString(),
          },
        },
      });

      if (!staff) throw new NotFoundException('Invalid or expired token');

      // hash and save new password to database
      const hashed = await argon.hash(password);
      await this.prisma.organiserStaff.update({
        where: { id: staff.id },
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

  async viewMe(userId: string) {
    try {
      const staff = await this.prisma.organiserStaff.findUnique({
        where: { id: userId },
      });
      if (!staff) throw new NotFoundException('Staff not found');

      return { message: 'Profile found', staff };
    } catch (error) {
      throw error;
    }
  }

  async updatePassword(id: string, dto: UpdatePasswordDto) {
    try {
      const staff = await this.prisma.organiserStaff.findUnique({
        where: { id },
      });
      if (!staff) throw new NotFoundException('Staff not found');

      const verifyPassword = await argon.verify(
        staff.password,
        dto.old_password,
      );
      if (!verifyPassword)
        throw new UnauthorizedException('Invalid credential');

      const hashedPassword = await argon.hash(dto.new_password);
      await this.prisma.organiserStaff.update({
        where: { id },
        data: { password: hashedPassword },
      });
      return { message: 'Password updated' };
    } catch (error) {
      throw error;
    }
  }
}
