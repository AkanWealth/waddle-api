import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { BookingService } from './booking.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';
import { Roles } from '../auth/decorator/role-decorator';
import { User } from '@prisma/client';
import { GetUser } from '../auth/decorator/get-user.decorator';
import { JwtGuard } from '../auth/guard/auth.guard';
import { RolesGuard } from '../auth/guard/role.guard';
import {
  ApiAcceptedResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiInternalServerErrorResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AdminRole, OrganiserRole } from 'src/auth/enum';

@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Unauthorized' })
@ApiInternalServerErrorResponse({ description: 'Internal Server Error' })
@UseGuards(JwtGuard, RolesGuard)
@Controller('bookings')
export class BookingController {
  constructor(private readonly bookingService: BookingService) {}

  @ApiOperation({
    summary: 'book an event as a loggedin parent',
    description: 'Parents can book an event',
  })
  @ApiCreatedResponse({ description: 'Created' })
  @Post()
  createBookingAndCheckoutSession(
    @GetUser() user: User,
    @Body() dto: CreateBookingDto,
  ) {
    return this.bookingService.createBookingAndCheckoutSession(user.id, dto);
  }

  @ApiOperation({
    summary: 'view all bookings',
    description: 'Admin can view all booked events',
  })
  @ApiOkResponse({ description: 'Ok' })
  @Get()
  @Roles(AdminRole.Admin)
  viewAllBookings() {
    return this.bookingService.viewAllBookings();
  }

  @ApiOperation({
    summary: 'view all bookings as a loggedin organiser or admin',
    description: 'Admin or Organiser can view all booked events of theirs',
  })
  @ApiOkResponse({ description: 'Ok' })
  @Get('all')
  @Roles(AdminRole.Admin, OrganiserRole.Organiser)
  viewMyBookings(@GetUser() user: { id: string; role: string }) {
    return this.bookingService.viewMyBookings(user.id, user.role);
  }

  @ApiOperation({
    summary: 'view my bookings as a loggedin parent',
    description: 'Parents can view their booked events',
  })
  @ApiOkResponse({ description: 'Ok' })
  @Get('me')
  viewAllBookingForUser(@GetUser() user: User) {
    return this.bookingService.viewAllBookingForUser(user.id);
  }

  @ApiOperation({
    summary: 'view a booking by id',
    description: 'Parent, Organiser and Admin can view a booked event by id',
  })
  @ApiOkResponse({ description: 'Ok' })
  @ApiParam({ name: 'id' })
  @Get(':id')
  viewBooking(@Param('id') id: string) {
    return this.bookingService.viewBooking(id);
  }

  @ApiOperation({
    summary: 'update a booking by id',
    description: 'Admin or Organiser can update a booked event by id',
  })
  @ApiAcceptedResponse({ description: 'Accepted' })
  @ApiParam({ name: 'id' })
  @HttpCode(HttpStatus.ACCEPTED)
  @Patch(':id')
  @Roles(AdminRole.Admin, OrganiserRole.Organiser)
  updateBooking(@Param('id') id: string, @Body() dto: UpdateBookingDto) {
    return this.bookingService.updateBooking(id, dto);
  }

  @ApiOperation({
    summary: 'delete a booking by id',
    description: 'Admin can delete a booked event by id',
  })
  @ApiNoContentResponse({ description: 'No content' })
  @ApiParam({ name: 'id' })
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':id')
  @Roles(AdminRole.Admin)
  deleteBooking(@Param('id') id: string) {
    return this.bookingService.deleteBooking(id);
  }
}
