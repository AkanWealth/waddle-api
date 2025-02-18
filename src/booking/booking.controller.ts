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
  ApiParam,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

@ApiBearerAuth()
@ApiUnauthorizedResponse({
  description: 'The user is not unathorized to perform this action',
})
@ApiInternalServerErrorResponse({ description: 'Internal Server Error' })
@UseGuards(JwtGuard, RolesGuard)
@Controller('bookings')
export class BookingController {
  constructor(private readonly bookingService: BookingService) {}

  @ApiCreatedResponse({ description: 'Created Successfull' })
  @Post()
  @Roles(Role.User)
  createBookingAndCheckoutSession(
    @GetUser() user: User,
    @Body() dto: CreateBookingDto,
  ) {
    return this.bookingService.createBookingAndCheckoutSession(user.id, dto);
  }

  @ApiOkResponse({ description: 'Successfull' })
  @Get()
  @Roles(Role.Admin, Role.Vendor)
  findAll() {
    return this.bookingService.findAll();
  }

  @ApiOkResponse({ description: 'Successfull' })
  @Get('/me')
  @Roles(Role.User)
  findAllForUser(@GetUser() user: User) {
    return this.bookingService.findAllForUser(user.id);
  }

  @ApiOkResponse({ description: 'Successfull' })
  @ApiParam({ name: 'id' })
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.bookingService.findOne(id);
  }

  @ApiAcceptedResponse({ description: 'Data accepted' })
  @ApiParam({ name: 'id' })
  @HttpCode(HttpStatus.ACCEPTED)
  @Patch(':id')
  @Roles(Role.Admin, Role.Vendor)
  update(@Param('id') id: string, @Body() dto: UpdateBookingDto) {
    return this.bookingService.update(id, dto);
  }

  @ApiNoContentResponse({ description: 'Deleted successfully' })
  @ApiParam({ name: 'id' })
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':id')
  @Roles(Role.Admin)
  remove(@Param('id') id: string) {
    return this.bookingService.remove(id);
  }
}
