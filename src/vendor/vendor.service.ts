import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UpdateVendorDto } from './dto';
import { PrismaService } from '../prisma/prisma.service';
import * as argon from 'argon2';
import { ConfigService } from '@nestjs/config';
import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { UpdatePasswordDto } from 'src/user/dto';

@Injectable()
export class VendorService {
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

  // function to find all the vendor
  async findAll() {
    try {
      const vendor = await this.prisma.vendor.findMany();

      const vendorsWithLogo = vendor.map((list) => {
        const business_logo = `${process.env.R2_PUBLIC_ENDPOINT}/${list.business_logo}`;
        return {
          ...list,
          business_logo,
        };
      });

      return vendorsWithLogo;
    } catch (error) {
      throw error;
    }
  }

  // function to find the loggedin vendor
  async findMe(authVendor: string) {
    try {
      const vendor = await this.prisma.vendor.findUnique({
        where: { id: authVendor },
      });

      const business_logo = `${process.env.R2_PUBLIC_ENDPOINT}/${vendor.business_logo}`;

      return { ...vendor, business_logo };
    } catch (error) {
      throw error;
    }
  }

  // function to update the loggedin user
  async update(
    id: string,
    dto: UpdateVendorDto,
    fileName?: string,
    file?: Buffer,
  ) {
    try {
      const existingVendor = await this.prisma.vendor.findUnique({
        where: { id },
      });

      if (!existingVendor) {
        throw new NotFoundException(
          'Vendor with the provided ID does not exist.',
        );
      }

      let businessLogo = existingVendor?.business_logo || undefined;

      // Upload the new logo
      if (businessLogo !== fileName) {
        await this.s3Client.send(
          new PutObjectCommand({
            Bucket: this.config.getOrThrow('BUCKET_NAME'),
            Key: fileName,
            Body: file,
          }),
        );

        // Delete the old logo from bucket
        await this.s3Client.send(
          new DeleteObjectCommand({
            Bucket: this.config.getOrThrow('BUCKET_NAME'),
            Key: businessLogo || 'null',
          }),
        );

        // Update the business logo filename
        businessLogo = fileName;
      }

      if (dto.password) {
        const hashed = await argon.hash(dto.password);

        const user = await this.prisma.vendor.update({
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
      const user = await this.prisma.vendor.update({
        where: { id },
        data: { ...dto, business_logo: businessLogo || null },
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
      const existingVendor = await this.prisma.vendor.findUnique({
        where: { id },
      });
      if (!existingVendor) {
        throw new NotFoundException(
          'Vendor with the provided ID does not exist.',
        );
      }

      const isMatch = await argon.verify(
        existingVendor.password,
        dto.old_password,
      );
      if (!isMatch) throw new BadRequestException('Old password is incorrect');

      const hashed = await argon.hash(dto.new_password);

      const vendor = await this.prisma.vendor.update({
        where: { id: existingVendor.id },
        data: {
          password: hashed,
        },
      });

      delete vendor.password;
      return { message: 'Password updated successful', vendor };
    } catch (error) {
      throw error;
    }
  }

  // function to delete the a user by ID
  async removeOne(id: string) {
    try {
      const existingVendor = await this.prisma.vendor.findUnique({
        where: { id },
      });

      if (!existingVendor) throw new NotFoundException('Vendor not found');

      const vendor = await this.prisma.vendor.delete({
        where: { id: existingVendor.id },
      });

      if (vendor?.business_logo) {
        await this.s3Client.send(
          new DeleteObjectCommand({
            Bucket: this.config.getOrThrow('BUCKET_NAME'),
            Key: vendor.business_logo,
          }),
        );
      }

      return { mesaage: 'Vendor deleted' };
    } catch (error) {
      throw error;
    }
  }
}
