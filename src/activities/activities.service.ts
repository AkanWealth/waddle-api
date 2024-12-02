import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateActivitiesDto, UpdateActivitiesDto } from './dto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ActivitiesService {
  constructor(private prisma: PrismaService) {}

  // function to add a movie to the database
  async create(dto: CreateActivitiesDto) {
    try {
      const activity = await this.prisma.activities.create({
        data: { ...dto },
      });

      return activity;
    } catch (error) {
      throw error;
    }
  }

  // function to find all movies from the database
  async findAll() {
    try {
      const activities = await this.prisma.activities.findMany();
      return activities;
    } catch (error) {
      throw error;
    }
  }

  // function to find a movie from the database
  async findOne(id: string) {
    try {
      const activity = await this.prisma.activities.findUnique({
        where: { id },
      });
      if (!activity)
        throw new NotFoundException(
          'Activity with the provdied ID does not exist.',
        );

      return activity;
    } catch (error) {
      throw error;
    }
  }

  // function to update a movie in the database
  async update(id: string, dto: UpdateActivitiesDto) {
    try {
      const activity = await this.prisma.activities.update({
        where: { id },
        data: <any>{ ...dto },
      });
      if (!activity)
        throw new NotFoundException(
          'Activity with the provdied ID does not exist.',
        );

      return activity;
    } catch (error) {
      throw error;
    }
  }

  // function to delete a movie from the database
  async remove(id: string) {
    try {
      const activities = await this.prisma.activities.delete({ where: { id } });
      if (!activities)
        throw new NotFoundException(
          'Activity with the provdied ID does not exist.',
        );

      return { message: 'Activity deleted.' };
    } catch (error) {
      throw error;
    }
  }
}
