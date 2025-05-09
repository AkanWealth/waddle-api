import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateOrganiserStaffDto, UpdateOrganiserDto } from './dto';
import { PrismaService } from '../prisma/prisma.service';
import * as argon from 'argon2';
import { ConfigService } from '@nestjs/config';
import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { UpdatePasswordDto } from 'src/user/dto';
import { OrganiserRole } from 'src/auth/enum';
import { NotificationService } from 'src/notification/notification.service';

@Injectable()
export class OrganiserService {
  private readonly s3Client = new S3Client({
    region: 'eu-north-1',
    credentials: {
      accessKeyId: this.config.getOrThrow('AWS_ACCESS_KEY'),
      secretAccessKey: this.config.getOrThrow('AWS_SECRET_KEY'),
    },
  });

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
    private notificationService: NotificationService,
  ) {}

  // Start Organiser
  async saveOrganiserFcmToken(userId: string, token: string) {
    try {
      const existingOrganiser = await this.prisma.organiser.findUnique({
        where: { id: userId },
      });

      if (!existingOrganiser) {
        throw new NotFoundException(
          'Organiser with the provided ID does not exist.',
        );
      }

      await this.prisma.organiser.update({
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

  async viewAllOrganiser() {
    try {
      const organiser = await this.prisma.organiser.findMany();

      const organisersWithLogo = organiser.map((list) => {
        const business_logo = `${process.env.S3_PUBLIC_URL}/${this.config.getOrThrow('S3_VENDOR_FOLDER')}/${list.business_logo}`;
        return {
          ...list,
          business_logo,
        };
      });

      return { message: 'All organisers found', organiser: organisersWithLogo };
    } catch (error) {
      throw error;
    }
  }

  async viewMe(authOrganiser: string) {
    try {
      const organiser = await this.prisma.organiser.findUnique({
        where: { id: authOrganiser },
        include: { staffs: true },
      });

      const business_logo = `${process.env.S3_PUBLIC_URL}/${this.config.getOrThrow('S3_VENDOR_FOLDER')}/${organiser.business_logo}`;

      return {
        message: 'Profile found',
        organiser: { ...organiser, business_logo },
      };
    } catch (error) {
      throw error;
    }
  }

  async updateProfile(
    id: string,
    dto: UpdateOrganiserDto,
    fileName?: string,
    file?: Buffer,
  ) {
    try {
      const existingOrganiser = await this.prisma.organiser.findUnique({
        where: { id },
      });

      if (!existingOrganiser) {
        throw new NotFoundException(
          'Organiser with the provided ID does not exist.',
        );
      }

      let businessLogo = existingOrganiser?.business_logo || undefined;

      // Upload the new logo
      if (businessLogo !== fileName) {
        await this.s3Client.send(
          new PutObjectCommand({
            Bucket: this.config.getOrThrow('AWS_BUCKET_NAME'),
            Key: `${this.config.getOrThrow('S3_VENDOR_FOLDER')}/${fileName}`,
            Body: file,
          }),
        );

        // Delete the old logo from bucket
        await this.s3Client.send(
          new DeleteObjectCommand({
            Bucket: this.config.getOrThrow('AWS_BUCKET_NAME'),
            Key:
              `${this.config.getOrThrow('S3_VENDOR_FOLDER')}/${businessLogo}` ||
              'null',
          }),
        );

        // Update the business logo filename
        businessLogo = fileName;
      }

      if (dto.password) {
        const hashed = await argon.hash(dto.password);

        const user = await this.prisma.organiser.update({
          where: { id },
          data: {
            ...dto,
            business_logo: businessLogo || null,
            password: hashed,
          },
        });

        delete user.password;
        return user;
      }

      // if no password is provided, update the user without changing the password
      const user = await this.prisma.organiser.update({
        where: { id },
        data: {
          ...dto,
          business_logo: businessLogo || null,
        },
      });

      delete user.password;
      return { message: 'Profile updated', user };
    } catch (error) {
      throw error;
    }
  }

  async updatePassword(id: string, dto: UpdatePasswordDto) {
    try {
      const existingOrganiser = await this.prisma.organiser.findUnique({
        where: { id },
      });
      if (!existingOrganiser) {
        throw new NotFoundException(
          'Organiser with the provided ID does not exist.',
        );
      }

      const isMatch = await argon.verify(
        existingOrganiser.password,
        dto.old_password,
      );
      if (!isMatch) throw new BadRequestException('Old password is incorrect');

      const hashed = await argon.hash(dto.new_password);

      const organiser = await this.prisma.organiser.update({
        where: { id: existingOrganiser.id },
        data: {
          password: hashed,
        },
      });

      delete organiser.password;
      return { message: 'Password updated successful', organiser };
    } catch (error) {
      throw error;
    }
  }

  async deleteOrganiserTemp(id: string) {
    try {
      const existingOrganiser = await this.prisma.organiser.findUnique({
        where: { id },
      });

      if (!existingOrganiser)
        throw new NotFoundException('Organiser not found');

      await this.prisma.organiser.update({
        where: { id: existingOrganiser.id },
        data: { isDeleted: true },
      });

      return { mesaage: 'Organiser deleted' };
    } catch (error) {
      throw error;
    }
  }

  async deleteOrganiser(id: string) {
    try {
      const existingOrganiser = await this.prisma.organiser.findUnique({
        where: { id },
      });

      if (!existingOrganiser)
        throw new NotFoundException('Organiser not found');

      const organiser = await this.prisma.organiser.delete({
        where: { id: existingOrganiser.id },
      });

      if (organiser?.business_logo) {
        await this.s3Client.send(
          new DeleteObjectCommand({
            Bucket: this.config.getOrThrow('AWS_BUCKET_NAME'),
            Key: `${this.config.getOrThrow('S3_VENDOR_FOLDER')}/${organiser.business_logo}`,
          }),
        );
      }

      return { mesaage: 'Organiser deleted' };
    } catch (error) {
      throw error;
    }
  }
  // End Organiser

  // Start staff
  async createStaff(organiserId: string, dto: CreateOrganiserStaffDto) {
    try {
      const existingOrganiserEmail = await this.prisma.organiser.findUnique({
        where: { email: dto.email },
      });
      const existingStaffEmail = await this.prisma.organiserStaff.findUnique({
        where: { email: dto.email },
      });
      if (existingOrganiserEmail || existingStaffEmail)
        throw new BadRequestException('Email has been used.');

      const hashedPassword = await argon.hash(dto.password);
      const staff = await this.prisma.organiserStaff.create({
        data: {
          ...dto,
          role: dto.role as OrganiserRole,
          password: hashedPassword,
          organiser: { connect: { id: organiserId } },
        },
      });

      await this.sendInvite(staff.id);

      return { message: 'Staff created and invite sent' };
    } catch (error) {
      throw error;
    }
  }

  async sendInvite(id: string) {
    try {
      if (!id) throw new BadRequestException('Id is required');

      const staff = await this.prisma.organiserStaff.findUnique({
        where: { id },
      });
      if (!staff) throw new NotFoundException('Not found');

      // generate token and expiration time
      const resetToken = Math.random().toString(36).substr(2);
      const resetTokenExpiration = Date.now() + 3600000; // 1 hour

      await this.prisma.organiserStaff.update({
        where: { id: staff.id },
        data: {
          reset_token: resetToken,
          reset_expiration: resetTokenExpiration.toString(),
        },
      });

      const subject = 'Vendor Invite';
      const message = `<p>Hello ${staff.name},</p>
  
        <p>I hope this mail finds you well. Pleae note that you have been invited to manage events for your company.</p>

        <p>Kindly follow the steps below to reset your passowrd.</p>

        <ul>
          <li>Click the link to reset the password: https://waddleapp.io/organiser/staff/reset-password</li>
          <li>Use the token <b>${resetToken}</b> to reset your password.</li>
        </ul>
  
        <p>Warm regards,</p>
  
        <p><b>Waddle Team</b></p>
      `;

      await this.notificationService.sendMail(staff.email, subject, message);
      return { message: 'Invite sent' };
    } catch (error) {
      throw error;
    }
  }

  async viewAllStaff(organiserId: string) {
    const staffs = await this.prisma.organiserStaff.findMany({
      where: { organiserId },
    });
    if (!staffs || staffs.length <= 0) throw new NotFoundException('Not found');

    return { message: 'All staff found', staffs };
  }

  async viewStaff(organiserId: string, id: string) {
    const staff = await this.prisma.organiserStaff.findUnique({
      where: { id, organiserId },
    });
    if (!staff) throw new NotFoundException('Not found');

    return { message: 'Staff found', staff };
  }

  async deleteStaffTemp(organiserId: string, id: string) {
    const findStaff = await this.prisma.organiserStaff.findUnique({
      where: { id, organiserId },
    });
    if (!findStaff) throw new NotFoundException('Not found');

    await this.prisma.organiserStaff.update({
      where: { id: findStaff.id },
      data: { isDeleted: true },
    });
    return { message: 'Staff deleted' };
  }

  async deleteStaff(organiserId: string, id: string) {
    const findStaff = await this.prisma.organiserStaff.findUnique({
      where: { id, organiserId },
    });
    if (!findStaff) throw new NotFoundException('Not found');

    await this.prisma.organiserStaff.delete({ where: { id: findStaff.id } });
    return { message: 'Staff deleted' };
  }
  // End Staff
}
