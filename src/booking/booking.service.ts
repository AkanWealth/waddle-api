import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class BookingService {
  constructor(private prisma: PrismaService) {}

  // create a new booking for an event
  async create(userId: string, dto: CreateBookingDto) {
    try {
      const booking = await this.prisma.booking.create({
        data: { ...dto, userId },
      });

      return booking;
    } catch (error) {
      throw error;
    }
  }

  // find all bookings created
  async findAll() {
    try {
      const bookings = await this.prisma.booking.findMany({
        include: { event: true },
      });

      if (!bookings || bookings.length <= 0)
        throw new NotFoundException('No booking found');

      return bookings;
    } catch (error) {
      throw error;
    }
  }

  // find all bookings created by a loggedin user
  async findAllForUser(userId: string) {
    try {
      const bookings = await this.prisma.booking.findMany({
        where: { userId },
        include: { event: true },
      });

      if (!bookings || bookings.length <= 0)
        throw new NotFoundException('No booking found');

      return bookings;
    } catch (error) {
      throw error;
    }
  }

  // find a booking by id
  async findOne(id: string) {
    try {
      const booking = await this.prisma.booking.findUnique({
        where: { id },
        include: { event: true },
      });

      if (!booking)
        throw new NotFoundException('Booking with the provided ID not found');

      return booking;
    } catch (error) {
      throw error;
    }
  }

  // update a booking by id
  async update(id: string, dto: UpdateBookingDto) {
    try {
      const existingBooking = await this.prisma.booking.findUnique({
        where: { id },
      });

      if (!existingBooking)
        throw new NotFoundException('Booking with the provided ID not found');

      const booking = await this.prisma.booking.update({
        where: { id: existingBooking.id },
        data: <any>{ ...dto },
      });

      return booking;
    } catch (error) {
      throw error;
    }
  }

  // delete a booking by id
  async remove(id: string) {
    try {
      const booking = await this.prisma.booking.findUnique({
        where: { id },
      });

      if (!booking)
        throw new NotFoundException('Booking with the provided ID not found');

      await this.prisma.booking.delete({ where: { id: booking.id } });
    } catch (error) {
      throw error;
    }
  }
}
