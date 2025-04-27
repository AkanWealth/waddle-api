import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateFavoriteDto } from './dto/create-favorite.dto';
import { UpdateFavoriteDto } from './dto/update-favorite.dto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FavoriteService {
  constructor(private prisma: PrismaService) {}

  // create new favorite event
  async create(userId: string, dto: CreateFavoriteDto) {
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
  async findAll(userId: string) {
    try {
      const favorites = await this.prisma.favorite.findMany({
        where: { userId },
        include: { event: true },
      });
      if (!favorites || favorites.length <= 0)
        throw new NotFoundException('No favourite found');

      return favorites;
    } catch (error) {
      throw error;
    }
  }

  // find one favorite event based on id for a user
  async findOne(id: string, userId: string) {
    try {
      const favorite = await this.prisma.favorite.findUnique({
        where: { id, userId },
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
  async update(id: string, userId: string, dto: UpdateFavoriteDto) {
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

  // remove a favorite event based on id for a user
  async remove(id: string, userId: string) {
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
