import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
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
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Role } from '../auth/enum';
import { BookingConsentDto, CreateRefundDto } from './dto';

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
    summary: 'consent to book an event as a loggedin parent',
    description: 'Parents can consent to book an event',
  })
  @ApiCreatedResponse({ description: 'Created' })
  @Post('consent')
  bookingConsent(
    @GetUser() user: { id: string },
    @Body() dto: BookingConsentDto,
  ) {
    if (user) return this.bookingService.bookingConsent(dto);
  }

  @ApiOperation({
    summary: 'view all bookings',
    description: 'Admin can view all booked events',
  })
  @ApiOkResponse({ description: 'Ok' })
  @Get()
  @Roles(Role.Admin)
  viewAllBookings() {
    return this.bookingService.viewAllBookings();
  }

  @ApiOperation({
    summary: 'view all bookings as a loggedin organiser',
    description: 'Organiser can view all booked events of theirs',
  })
  @ApiOkResponse({ description: 'Ok' })
  @Get('organiser/all')
  @Roles(Role.Organiser)
  viewMyBookingsAsOrganiser(@GetUser() user: { id: string }) {
    return this.bookingService.viewMyBookingsAsOrganiser(user.id);
  }

  @ApiOperation({
    summary: 'view all bookings as a loggedin admin',
    description: 'Admin can view all booked events of theirs',
  })
  @ApiOkResponse({ description: 'Ok' })
  @Get('host/all')
  @Roles(Role.Admin)
  viewBookingsAsAdmin(@GetUser() user: { id: string }) {
    return this.bookingService.viewBookingsAsAdmin(user.id);
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
  @Roles(Role.Admin || Role.Organiser)
  updateBooking(@Param('id') id: string, @Body() dto: UpdateBookingDto) {
    return this.bookingService.updateBooking(id, dto);
  }

  @ApiOperation({
    summary: 'cancel a booking',
    description: 'Admin can cancel a booked event',
  })
  @ApiOkResponse({ description: 'Ok' })
  @HttpCode(HttpStatus.OK)
  @Post('cancel')
  cancelBooking(@Body() dto: CreateRefundDto) {
    return this.bookingService.cancelBooking(dto);
  }
}
