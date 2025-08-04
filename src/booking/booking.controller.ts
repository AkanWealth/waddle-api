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
  Query,
  BadRequestException,
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
  ApiQuery,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Role } from '../auth/enum';
import { BookingConsentDto, CreateRefundDto, PayoutBookingDto } from './dto';

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
    summary: 'View my bookings as a logged-in parent with pagination',
    description: 'Parents can view their booked events',
  })
  @ApiOkResponse({ description: 'Ok' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @Get('me')
  viewAllBookingForUser(
    @GetUser() user: User,
    @Query('page') page = 1,
    @Query('limit') limit = 10,
  ) {
    return this.bookingService.viewAllBookingForUser(user.id, page, limit);
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

  @ApiOperation({
    summary: 'Get list of all vendors with their revenue',
    description:
      'This endpoint returns a list of all vendors along with their total revenue from bookings.',
  })
  @ApiOkResponse({ description: 'Ok' })
  @HttpCode(HttpStatus.OK)
  @Get('vendors/revenue')
  async getVendorStats() {
    return this.bookingService.getRevenuePerVendor();
  }

  @ApiOperation({
    summary: 'payout an organiser for booking',
    description: 'Admin can payout an organiser for booked event',
  })
  @ApiOkResponse({ description: 'Ok' })
  @HttpCode(HttpStatus.OK)
  @Post('organiser/payout')
  payoutBooking(@Body() dto: PayoutBookingDto) {
    return this.bookingService.payoutBooking(
      dto.paymentAccountId,
      dto.amount,
      dto.description,
    );
  }

  @ApiOperation({
    summary: 'Get booking report for vendors',
    description:
      'This endpoint generates a booking report for vendors, including details like total bookings, revenue, and other relevant statistics.',
  })
  @ApiOkResponse({ description: 'Ok' })
  @HttpCode(HttpStatus.OK)
  @Get('vendors/report')
  async getReport() {
    return this.bookingService.getBookingReport();
  }

  @ApiOperation({
    summary: 'Get booking report for a specific organiser',
    description:
      'This endpoint generates a booking report for a specific organiser, including details like total bookings, revenue, and other relevant statistics.',
  })
  @ApiOkResponse({ description: 'Ok' })
  @Get(':organiserId/booking-report')
  async getOrganiserReport(
    @Param('organiserId') organiserId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const now = new Date();
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(now.getFullYear() - 1);

    const fromDate = from ? new Date(from) : oneYearAgo;
    const toDate = to ? new Date(to) : now;

    if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
      throw new BadRequestException(
        'Invalid date format. Use a valid ISO date string.',
      );
    }

    return this.bookingService.getOrganiserReport(
      organiserId,
      fromDate.toISOString(),
      toDate.toISOString(),
    );
  }
}
