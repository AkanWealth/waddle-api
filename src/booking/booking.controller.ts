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
import { Role } from '../auth/enum/role.enum';
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

@ApiBearerAuth()
@ApiUnauthorizedResponse({
  description: 'The user is not authorized to perform this action',
})
@ApiInternalServerErrorResponse({ description: 'Internal Server Error' })
@UseGuards(JwtGuard, RolesGuard)
@Controller('bookings')
export class BookingController {
  constructor(private readonly bookingService: BookingService) {}

  @ApiOperation({
    summary: 'book an event as a loggedin parent',
    description: 'Parents can book an event',
  })
  @ApiCreatedResponse({ description: 'Created successfully' })
  @Post()
  @Roles(Role.User)
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
  @ApiOkResponse({ description: 'Successfull' })
  @Get()
  @Roles(Role.Admin)
  findAll() {
    return this.bookingService.findAll();
  }

  @ApiOperation({
    summary: 'view all bookings as a loggedin vendor or admin',
    description: 'Admin or Vendor can view all booked events of theirs',
  })
  @ApiOkResponse({ description: 'Successfull' })
  @Get('all')
  @Roles(Role.Admin, Role.Vendor)
  findMyBookings(@GetUser() user: { id: string; role: string }) {
    return this.bookingService.findMyBookings(user.id, user.role);
  }

  @ApiOperation({
    summary: 'view my bookings as a loggedin parent',
    description: 'Parents can view their booked events',
  })
  @ApiOkResponse({ description: 'Successfull' })
  @Get('me')
  @Roles(Role.User)
  findAllForUser(@GetUser() user: User) {
    return this.bookingService.findAllForUser(user.id);
  }

  @ApiOperation({
    summary: 'view a booking by id',
    description: 'Parent, Vendor and Admin can view a booked event by id',
  })
  @ApiOkResponse({ description: 'Successfull' })
  @ApiParam({ name: 'id' })
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.bookingService.findOne(id);
  }

  @ApiOperation({
    summary: 'update a booking by id',
    description: 'Admin or Vendor can update a booked event by id',
  })
  @ApiAcceptedResponse({ description: 'Data accepted' })
  @ApiParam({ name: 'id' })
  @HttpCode(HttpStatus.ACCEPTED)
  @Patch(':id')
  @Roles(Role.Admin, Role.Vendor)
  update(@Param('id') id: string, @Body() dto: UpdateBookingDto) {
    return this.bookingService.update(id, dto);
  }

  @ApiOperation({
    summary: 'delete a booking by id',
    description: 'Admin can delete a booked event by id',
  })
  @ApiNoContentResponse({ description: 'Deleted successfully' })
  @ApiParam({ name: 'id' })
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':id')
  @Roles(Role.Admin)
  remove(@Param('id') id: string) {
    return this.bookingService.remove(id);
  }
}
