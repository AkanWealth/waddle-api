import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as argon from 'argon2';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { CreateAdminDto, UpdateAdminDto } from './dto';
import { UpdatePasswordDto } from '../user/dto';
import { Mailer } from '../helper';

@Injectable()
export class AdminService {
  constructor(
    private prisma: PrismaService,
    private mailer: Mailer,
  ) {}

  async createAdmin(dto: CreateAdminDto) {
    try {
      const existingEmail = await this.prisma.admin.findUnique({
        where: { email: dto.email },
      });
      if (existingEmail) throw new BadRequestException('Email already in use');

      const hash = await argon.hash(dto.password);
      const resetToken = Math.random().toString(36).substr(2);
      const resetTokenExpiration = Date.now() + 3600000; // 1 hour

      const admin = await this.prisma.admin.create({
        data: {
          ...dto,
          password: hash,
          reset_token: resetToken,
          reset_expiration: resetTokenExpiration.toString(),
        },
      });

      await this.sendInvite(admin.id);

      return { message: 'Admin created and invite sent' };
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new BadRequestException('Credentials Taken');
        }
      }
      throw error;
    }
  }

  async deactivateAdmin(id: string) {
    try {
      if (!id) {
        throw new BadRequestException('Id is required');
      }
      const admin = await this.prisma.admin.findUnique({
        where: { id },
      });

      if (!admin) {
        throw new NotFoundException('Admin not found');
      }

      await this.prisma.admin.update({
        where: { id },
        data: {
          isActivated: false,
        },
      });

      return { message: 'Admin successfully deactivated' };
    } catch (error) {
      throw error;
    }
  }

  async reactivateAdmin(id: string) {
    try {
      if (!id) {
        throw new BadRequestException('Id is required');
      }
      const admin = await this.prisma.admin.findUnique({
        where: { id },
      });

      if (!admin) {
        throw new NotFoundException('Admin not found');
      }

      await this.prisma.admin.update({
        where: { id },
        data: {
          isActivated: true,
        },
      });

      return { message: 'Admin successfully deactivated' };
    } catch (error) {
      throw error;
    }
  }

  async sendInvite(id: string) {
    try {
      if (!id) throw new BadRequestException('Id is required');

      const subAdmin = await this.prisma.admin.findUnique({
        where: { id },
      });
      if (!subAdmin) throw new NotFoundException('Not found');

      // generate token and expiration time
      const resetToken = Math.random().toString(36).substr(2);
      const resetTokenExpiration = Date.now() + 3600000; // 1 hour

      await this.prisma.admin.update({
        where: { id: subAdmin.id },
        data: {
          reset_token: resetToken,
          reset_expiration: resetTokenExpiration.toString(),
        },
      });

      const subject = 'Waddle Admin Invite';
      const message = `<p>Hello ${subAdmin.first_name},</p>
    <
          <p>I hope this mail finds you well. Pleae note that you have been invited to manage the waddle app.</p>
  
          <p>Kindly follow the steps below to reset your passowrd.</p>
  
          <ul>
            <li>Click the link to reset the password: https://waddleapp.io/host/reset-password</li>
            <li>Use the token <b>${resetToken}</b> to reset your password.</li>
          </ul>
    
          <p>Warm regards,</p>
    
          <p><b>Waddle Team</b></p>
        `;

      await this.mailer.sendMail(subAdmin.email, subject, message);
      return { message: 'Invite sent' };
    } catch (error) {
      throw error;
    }
  }

  async sendInviteWeb(id: string) {
    try {
      if (!id) throw new BadRequestException('Id is required');

      const subAdmin = await this.prisma.admin.findUnique({
        where: { id },
      });
      if (!subAdmin) throw new NotFoundException('Not found');

      // generate token and expiration time
      const resetToken = Math.random().toString(36).substr(2);
      const resetTokenExpiration = Date.now() + 3600000; // 1 hour

      await this.prisma.admin.update({
        where: { id: subAdmin.id },
        data: {
          reset_token: resetToken,
          reset_expiration: resetTokenExpiration.toString(),
        },
      });

      const setUpPasswordUrl = `http://localhost:3000/set-password?token=${resetToken}`;
      const subject = 'Waddle Admin Invite';
      const message = `<p>Hello ${subAdmin.first_name},</p>
    <
          <p>I hope this mail finds you well. Pleae note that you have been invited to manage the waddle app.</p>
  
          <p>Kindly follow the steps below to set up your passowrd.</p>
  
          <p><a href="${setUpPasswordUrl}" target="_blank">${setUpPasswordUrl}</a></p>
          <p>This link will expire within an hour. If you did not request this, please ignore this email.</p>
    
          <p>Warm regards,</p>
    
          <p><b>Waddle Team</b></p>
        `;

      await this.mailer.sendMail(subAdmin.email, subject, message);
      return { message: 'Invite sent' };
    } catch (error) {
      throw error;
    }
  }

  async viewAllAdmin() {
    try {
      const admin = await this.prisma.admin.findMany();
      if (!admin || admin.length <= 0)
        throw new NotFoundException('No admin found');

      return { message: 'All admin found', admin };
    } catch (error) {
      throw error;
    }
  }

  async viewMe(authAdmin: string) {
    try {
      const admin = await this.prisma.admin.findUnique({
        where: { id: authAdmin },
      });
      if (!admin) throw new NotFoundException('No admin found');

      return { message: 'Profile found', admin };
    } catch (error) {
      throw error;
    }
  }

  async saveAdminFcmToken(userId: string, token: string) {
    try {
      const existingAdmin = await this.prisma.admin.findUnique({
        where: { id: userId },
      });

      if (!existingAdmin) {
        throw new NotFoundException(
          'Admin with the provided ID does not exist.',
        );
      }

      await this.prisma.admin.update({
        where: { id: userId },
        data: {
          fcmToken: token,
        },
      });

      return { message: 'FCM token updated successfully' };
    } catch (error) {
      throw error;
    }
  }

  async togglePushNotififcation(userId: string) {
    try {
      const existingAdmin = await this.prisma.admin.findUnique({
        where: { id: userId },
      });

      if (!existingAdmin) {
        throw new NotFoundException(
          'Admin with the provided ID does not exist.',
        );
      }

      if (existingAdmin.fcmIsOn) {
        await this.prisma.admin.update({
          where: { id: userId },
          data: {
            fcmIsOn: false,
          },
        });
      } else {
        await this.prisma.admin.update({
          where: { id: userId },
          data: {
            fcmIsOn: true,
          },
        });
      }

      return { message: 'Notification status updated' };
    } catch (error) {
      throw error;
    }
  }

  async updateProfile(id: string, dto: UpdateAdminDto) {
    try {
      const existingAdmin = await this.prisma.admin.findUnique({
        where: { id },
      });

      if (!existingAdmin) {
        throw new NotFoundException(
          'Admin with the provided ID does not exist.',
        );
      }

      if (dto.password) {
        const hashed = await argon.hash(dto.password);

        const admin = await this.prisma.admin.update({
          where: { id },
          data: {
            ...dto,
            password: hashed,
          },
        });

        delete admin.password;
        return { message: 'Profile updated', admin };
      }

      // if no password is provided, update the admin without changing the password
      const admin = await this.prisma.admin.update({
        where: { id },
        data: { ...dto },
      });

      delete admin.password;
      return { message: 'Profile updated', admin };
    } catch (error) {
      throw error;
    }
  }

  async updatePassword(id: string, dto: UpdatePasswordDto) {
    try {
      const existingAdmin = await this.prisma.admin.findUnique({
        where: { id },
      });
      if (!existingAdmin) {
        throw new NotFoundException(
          'Admin with the provided ID does not exist.',
        );
      }

      const isMatch = await argon.verify(
        existingAdmin.password,
        dto.old_password,
      );
      if (!isMatch) throw new BadRequestException('Old password is incorrect');

      const hashed = await argon.hash(dto.new_password);

      const admin = await this.prisma.admin.update({
        where: { id: existingAdmin.id },
        data: {
          password: hashed,
        },
      });

      delete admin.password;
      return { message: 'Password updated successful', admin };
    } catch (error) {
      throw error;
    }
  }

  async deleteAdmin(id: string) {
    try {
      const existingAdmin = await this.prisma.admin.findUnique({
        where: { id },
      });

      if (!existingAdmin) throw new NotFoundException('Admin not found');

      await this.prisma.admin.delete({
        where: { id: existingAdmin.id },
      });

      return { mesaage: 'Admin deleted' };
    } catch (error) {
      throw error;
    }
  }

  async deleteAdminWeb(id: string) {
    try {
      const result = await this.prisma.admin.updateMany({
        where: {
          id,
          isDeleted: false,
        },
        data: {
          isDeleted: true,
        },
      });

      if (result.count === 0) {
        throw new NotFoundException('Admin not found or already deleted');
      }

      return { message: 'Admin successfully soft deleted' };
    } catch (error) {
      throw error;
    }
  }
}
