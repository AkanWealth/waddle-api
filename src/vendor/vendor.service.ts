import { Injectable } from '@nestjs/common';
import { UpdateVendorDto } from './dto';
import { PrismaService } from '../prisma/prisma.service';
import * as argon from 'argon2';

@Injectable()
export class VendorService {
  constructor(private prisma: PrismaService) {}

  // function to update the loggedin vendor
  async findAll() {
    try {
      const user = await this.prisma.vendor.findMany();
      return user;
    } catch (error) {
      throw error;
    }
  }

  // function to update the loggedin user
  async update(id: string, dto: UpdateVendorDto) {
    try {
      if (dto.password) {
        const hashed = await argon.hash(dto.password);

        const user = await this.prisma.vendor.update({
          where: { id },
          data: { ...dto, password: hashed },
        });

        delete user.password;
        return user;
      }

      // if no password is provided, update the user without changing the password
      const user = await this.prisma.vendor.update({
        where: { id },
        data: { ...dto },
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
      await this.prisma.vendor.delete({ where: { id } });

      return { mesaage: 'Vendor deleted' };
    } catch (error) {
      throw error;
    }
  }
}
