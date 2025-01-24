import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateActivitiesDto, UpdateActivitiesDto } from './dto';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';

@Injectable()
export class ActivitiesService {
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

  // function to add a activities to the database
  async create(
    vendorId: string,
    dto: CreateActivitiesDto,
    fileName?: string,
    file?: Buffer,
  ) {
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

      const date = new Date(dto.date);

      const activity = await this.prisma.activities.create({
        data: { ...dto, date, images: fileName || null, vendorId },
      });

      return activity;
    } catch (error) {
      throw error;
    }
  }

  // function to find all activities from the database
  async findAll() {
    try {
      const activities = await this.prisma.activities.findMany({
        include: { Vendor: true },
      });

      const activitiesWithImage = activities.map((list) => {
        const images = `${process.env.R2_PUBLIC_ENDPOINT}/${list.images}`;
        return {
          ...list,
          images,
        };
      });

      return activitiesWithImage;
    } catch (error) {
      throw error;
    }
  }

  // function to find a activities from the database
  async findOne(id: string) {
    try {
      const activity = await this.prisma.activities.findUnique({
        where: { id },
        include: {
          Vendor: true,
        },
      });
      if (!activity)
        throw new NotFoundException(
          'Activity with the provdied ID does not exist.',
        );

      const images = `${process.env.R2_PUBLIC_ENDPOINT}/${activity.images}`;

      return { ...activity, images };
    } catch (error) {
      throw error;
    }
  }

  // function to search for activities from the database
  async search(name: string, age: string, price: string) {
    try {
      const whereClause: any = {};

      if (name) {
        whereClause.name = { contains: name, mode: 'insensitive' };
      }

      if (age) {
        whereClause.age = { equals: age, mode: 'insensitive' };
      }

      if (price) {
        whereClause.price = price;
      }

      const activity = await this.prisma.activities.findMany({
        where: whereClause,
        include: { Vendor: true },
      });
      if (!activity || activity.length === 0)
        throw new NotFoundException(
          'Activity with the provided name does not exist.',
        );

      const activitiesWithImage = activity.map((list) => {
        const images = `${process.env.R2_PUBLIC_ENDPOINT}/${list.images}`;
        return {
          ...list,
          images,
        };
      });

      return activitiesWithImage;
    } catch (error) {
      throw error;
    }
  }

  // function to filter activities by age range or category from the database
  async filter(age_range?: string, category?: string, address?: string) {
    try {
      const whereClause: any = {};

      if (age_range) {
        whereClause.age_range = age_range;
      }

      if (address) {
        whereClause.address = { contains: address, mode: 'insensitive' };
      }

      if (category) {
        whereClause.category = { equals: category, mode: 'insensitive' };
      }

      const activity = await this.prisma.activities.findMany({
        where: whereClause,
        include: { Vendor: true },
      });

      if (!activity || activity.length === 0) {
        throw new NotFoundException(
          'No activities found with the provided criteria.',
        );
      }

      const activitiesWithImage = activity.map((list) => {
        const images = `${process.env.R2_PUBLIC_ENDPOINT}/${list.images}`;
        return {
          ...list,
          images,
        };
      });

      return activitiesWithImage;
    } catch (error) {
      throw error;
    }
  }

  // function to update an activity in the database
  async update(
    id: string,
    dto: UpdateActivitiesDto,
    fileName?: string,
    file?: Buffer,
  ) {
    try {
      const existingActivity = await this.prisma.activities.findUnique({
        where: { id },
      });
      if (!existingActivity)
        throw new NotFoundException(
          'Activity with the provdied ID does not exist.',
        );

      let image = existingActivity?.images || undefined;

      // Upload the new image
      if (image !== fileName) {
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
            Key: image || 'null',
          }),
        );

        // Update the profile image filename
        image = fileName;
      }

      const activity = await this.prisma.activities.update({
        where: { id: existingActivity.id },
        data: <any>{ ...dto, images: image || null },
      });

      return activity;
    } catch (error) {
      throw error;
    }
  }

  // function to delete an activity from the database
  async remove(id: string) {
    try {
      const existingActivities = await this.prisma.activities.findUnique({
        where: { id },
      });
      if (!existingActivities)
        throw new NotFoundException(
          'Activity with the provdied ID does not exist.',
        );

      if (existingActivities?.images) {
        await this.s3Client.send(
          new DeleteObjectCommand({
            Bucket: this.config.getOrThrow('BUCKET_NAME'),
            Key: existingActivities.images,
          }),
        );
      }

      await this.prisma.activities.delete({
        where: { id: existingActivities.id },
      });

      return { message: 'Activity deleted.' };
    } catch (error) {
      throw error;
    }
  }
}
