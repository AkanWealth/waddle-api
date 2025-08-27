import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateFavoriteDto } from './dto/create-favorite.dto';
import { UpdateFavoriteDto } from './dto/update-favorite.dto';
import { PrismaService } from '../prisma/prisma.service';
import { EventStatus } from 'src/utils/constants/eventTypes';

@Injectable()
export class FavoriteService {
  constructor(private prisma: PrismaService) {}

  // create new favorite event
  //To sort out later on

  async createFavorite(userId: string, dto: CreateFavoriteDto) {
    try {
      const favorite = await this.prisma.favorite.create({
        data: { ...dto, userId },
      });
      return favorite;
    } catch (error) {
      throw error;
    }
  }

  // find all favorite event for a user
  async viewAllFavorite(userId: string, page = 1, limit = 10) {
    try {
      const skip = (page - 1) * limit;

      const [favorites, total] = await this.prisma.$transaction([
        this.prisma.favorite.findMany({
          where: {
            userId,
            event: {
              status: EventStatus.APPROVED,
              isCancelled: false,
              isDeleted: false,
            },
          },
          include: { event: true },
          skip,
          take: Number(limit),
          orderBy: { createdAt: 'desc' },
        }),
        this.prisma.favorite.count({
          where: {
            userId,
            event: {
              status: EventStatus.APPROVED,
              isDeleted: false,
            },
          },
        }),
      ]);

      return {
        message: 'Favorites found',
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        favorites,
      };
    } catch (error) {
      throw error;
    }
  }

  // find one favorite event based on id for a user
  async viewFavorite(id: string, userId: string) {
    try {
      const favorite = await this.prisma.favorite.findFirst({
        where: {
          id,
          userId,
          event: {
            status: EventStatus.APPROVED,
            isCancelled: false,
            isDeleted: false,
          },
        },
        include: { event: true },
      });
      if (!favorite)
        throw new NotFoundException(
          'No favorite event with the provided ID found',
        );

      return favorite;
    } catch (error) {
      throw error;
    }
  }

  // update one favorite event based on id for a user
  async updateFavorite(id: string, userId: string, dto: UpdateFavoriteDto) {
    try {
      const existingFavorite = await this.prisma.favorite.findUnique({
        where: { id, userId },
      });
      if (!existingFavorite)
        throw new NotFoundException(
          'No favorite event with the provided ID found',
        );

      await this.prisma.favorite.update({
        where: { id: existingFavorite.id },
        data: { ...dto },
      });
    } catch (error) {
      throw error;
    }
  }

  // delete a favorite event based on id for a user
  async deleteFavorite(id: string, userId: string) {
    try {
      const existingFavorite = await this.prisma.favorite.findUnique({
        where: { id, userId },
      });
      if (!existingFavorite)
        throw new NotFoundException(
          'No favorite event with the provided ID found',
        );

      await this.prisma.favorite.delete({
        where: { id: existingFavorite.id },
      });
    } catch (error) {
      throw error;
    }
  }
}
