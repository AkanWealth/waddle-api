import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UpdatePasswordDto, UpdateUserDto } from './dto';
import { PrismaService } from '../prisma/prisma.service';
import * as argon from 'argon2';
import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class UserService {
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
  ) {}

  // save fcm token to the database
  async saveUserFcmToken(userId: string, token: string) {
    try {
      const existingUser = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      if (!existingUser) {
        throw new NotFoundException(
          'User with the provided ID does not exist.',
        );
      }

      await this.prisma.user.update({
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

  // toogle the status of push notification
  async togglePushNotififcation(userId: string) {
    try {
      const existingUser = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      if (!existingUser) {
        throw new NotFoundException(
          'User with the provided ID does not exist.',
        );
      }

      if (existingUser.fcmIsOn) {
        await this.prisma.user.update({
          where: { id: userId },
          data: {
            fcmIsOn: false,
          },
        });
      } else {
        await this.prisma.user.update({
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

  // function to find all the user
  async findAll() {
    try {
      const user = await this.prisma.user.findMany({
        where: {
          isDeleted: false,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      const usersWithImage = user.map((list) => {
        const profile_picture = `${process.env.S3_PUBLIC_URL}/${this.config.getOrThrow('S3_USER_FOLDER')}/${list.profile_picture}`;
        return {
          ...list,
          profile_picture,
        };
      });

      return usersWithImage;
    } catch (error) {
      throw error;
    }
  }

  async findAllDeletedUsers() {
    try {
      const user = await this.prisma.user.findMany({
        where: {
          isDeleted: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      const usersWithImage = user.map((list) => {
        const profile_picture = `${process.env.S3_PUBLIC_URL}/${this.config.getOrThrow('S3_USER_FOLDER')}/${list.profile_picture}`;
        return {
          ...list,
          profile_picture,
        };
      });

      return usersWithImage;
    } catch (error) {
      throw error;
    }
  }

  // function to find the loggedin user
  async findMe(authUser: string) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: authUser },
      });
      delete user.password;

      const profile_picture = `${process.env.S3_PUBLIC_URL}/${this.config.getOrThrow('S3_USER_FOLDER')}/${user.profile_picture}`;

      return { ...user, profile_picture };
    } catch (error) {
      throw error;
    }
  }

  // function to update the loggedin user
  async update(
    id: string,
    dto: UpdateUserDto,
    fileName?: string,
    file?: Buffer,
  ) {
    try {
      const existingUser = await this.prisma.user.findUnique({
        where: { id },
      });

      if (!existingUser) {
        throw new NotFoundException(
          'User with the provided ID does not exist.',
        );
      }

      let profileImage = existingUser?.profile_picture || undefined;

      // Upload the new image
      if (profileImage !== fileName) {
        await this.s3Client.send(
          new PutObjectCommand({
            Bucket: this.config.getOrThrow('AWS_BUCKET_NAME'),
            Key: `${this.config.getOrThrow('S3_USER_FOLDER')}/${fileName}`,
            Body: file,
          }),
        );

        // Delete the old image from bucket
        await this.s3Client.send(
          new DeleteObjectCommand({
            Bucket: this.config.getOrThrow('AWS_BUCKET_NAME'),
            Key:
              `${this.config.getOrThrow('S3_USER_FOLDER')}/${profileImage}` ||
              'null',
          }),
        );

        // Update the profile image filename
        profileImage = fileName;
      }

      if (dto.password) {
        const hashed = await argon.hash(dto.password);

        const user = await this.prisma.user.update({
          where: { id },
          data: {
            ...dto,
            profile_picture: profileImage || null,
            password: hashed,
          },
        });

        delete user.password;
        return user;
      }

      // if no password is provided, update the user without changing the password
      const user = await this.prisma.user.update({
        where: { id },
        data: { ...dto, profile_picture: profileImage || null },
      });

      delete user.password;
      return user;
    } catch (error) {
      throw error;
    }
  }

  // function to update the loggedin user password
  async updatePassword(id: string, dto: UpdatePasswordDto) {
    try {
      const existingUser = await this.prisma.user.findUnique({
        where: { id },
      });
      if (!existingUser) {
        throw new NotFoundException(
          'User with the provided ID does not exist.',
        );
      }

      const isMatch = await argon.verify(
        existingUser.password,
        dto.old_password,
      );
      if (!isMatch) throw new BadRequestException('Old password is incorrect');

      const hashed = await argon.hash(dto.new_password);

      const user = await this.prisma.user.update({
        where: { id: existingUser.id },
        data: {
          password: hashed,
        },
      });

      delete user.password;
      return { message: 'Password updated successful', user };
    } catch (error) {
      throw error;
    }
  }

  // function to delete a user temporarily by ID
  async deleteUserTemp(id: string) {
    try {
      const existingUser = await this.prisma.user.findUnique({ where: { id } });
      if (!existingUser) throw new NotFoundException('User not found');

      await this.prisma.user.update({
        where: { id: existingUser.id },
        data: { isDeleted: true },
      });

      return { message: 'User deleted' };
    } catch (error) {
      throw error;
    }
  }

  // function to restore a user
  async restoreUser(id: string) {
    try {
      const existingUser = await this.prisma.user.findUnique({ where: { id } });
      if (!existingUser) throw new NotFoundException('User not found');

      await this.prisma.user.update({
        where: { id: existingUser.id },
        data: { isDeleted: false },
      });

      return { message: 'User restored' };
    } catch (error) {
      throw error;
    }
  }

  // function to delete a user permanently by ID
  async deleteUser(id: string) {
    try {
      const existingUser = await this.prisma.user.findUnique({ where: { id } });
      if (!existingUser) throw new NotFoundException('User not found');

      const user = await this.prisma.user.delete({
        where: { id: existingUser.id },
      });

      if (user?.profile_picture) {
        await this.s3Client.send(
          new DeleteObjectCommand({
            Bucket: this.config.getOrThrow('AWS_BUCKET_NAME'),
            Key: `${this.config.getOrThrow('S3_USER_FOLDER')}/${user.profile_picture}`,
          }),
        );
      }

      return { message: 'User deleted' };
    } catch (error) {
      throw error;
    }
  }
}
