import { Injectable, NotFoundException } from '@nestjs/common';
import { UpdateUserDto } from './dto';
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
    region: 'auto',
    endpoint: this.config.getOrThrow('S3_API'),
    credentials: {
      accessKeyId: this.config.getOrThrow('ACCESS_KEY_ID'),
      secretAccessKey: this.config.getOrThrow('SECRET_ACCESS_KEY'),
    },
  });

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {}

  // function to find all the user
  async findAll() {
    try {
      const user = await this.prisma.user.findMany();

      const usersWithImage = user.map((list) => {
        const profile_picture = `${process.env.R2_PUBLIC_ENDPOINT}/${list.profile_picture}`;
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

      const profile_picture = `${process.env.R2_PUBLIC_ENDPOINT}/${user.profile_picture}`;

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
            Bucket: this.config.getOrThrow('BUCKET_NAME'),
            Key: fileName,
            Body: file,
          }),
        );

        // Delete the old image from bucket
        await this.s3Client.send(
          new DeleteObjectCommand({
            Bucket: this.config.getOrThrow('BUCKET_NAME'),
            Key: profileImage || 'null',
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

  // function to delete the a user by ID
  async removeOne(id: string) {
    try {
      const existingUser = await this.prisma.user.findUnique({ where: { id } });

      if (!existingUser) throw new NotFoundException('User not found');

      const user = await this.prisma.user.delete({
        where: { id: existingUser.id },
      });

      if (user?.profile_picture) {
        await this.s3Client.send(
          new DeleteObjectCommand({
            Bucket: this.config.getOrThrow('BUCKET_NAME'),
            Key: user.profile_picture,
          }),
        );
      }

      return { message: 'User deleted' };
    } catch (error) {
      throw error;
    }
  }
}
