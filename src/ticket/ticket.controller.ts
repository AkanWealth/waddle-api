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
import { TicketService } from './ticket.service';
import { CreateTicketDto, UpdateTicketDto } from './dto';
import { User } from '@prisma/client';
import { GetUser } from '../auth/decorator/get-user.decorator';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiInternalServerErrorResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Roles } from '../auth/decorator/role-decorator';
import { Role } from '../auth/enum/role.enum';
import { JwtGuard } from '../auth/guard/auth.guard';
import { RolesGuard } from '../auth/guard/role.guard';

@ApiBearerAuth()
@ApiUnauthorizedResponse({
  description: 'The user is not authorized to perform this action',
})
@ApiInternalServerErrorResponse({ description: 'Internal Server Error' })
@UseGuards(JwtGuard, RolesGuard)
@Controller('ticket')
export class TicketController {
  constructor(private readonly ticketService: TicketService) {}

  @ApiCreatedResponse({ description: 'Created successfully' })
  @Post()
  @Roles(Role.User)
  create(@Body() dto: CreateTicketDto) {
    return this.ticketService.create(dto);
  }

  @ApiOkResponse({ description: 'Successfull' })
  @Get()
  findAll(@GetUser() user: User) {
    return this.ticketService.findAll(user.email);
  }

  @ApiOkResponse({ description: 'Successfull' })
  @Get(':id')
  findOne(@Param('id') id: number) {
    return this.ticketService.findOne(id);
  }

  @ApiOkResponse({ description: 'Successfull' })
  @Get(':id/conversations')
  findConversation(@Param('id') id: number) {
    return this.ticketService.findConversation(id);
  }

  // @Patch(':id')
  // update(@Param('id') id: number, @Body() dto: UpdateTicketDto) {
  //   return this.ticketService.update(id, dto);
  // }

  // @ApiNoContentResponse({ description: 'Deleted successfully' })
  // @HttpCode(HttpStatus.NO_CONTENT)
  // @Delete(':id')
  // @Roles(Role.Admin)
  // remove(@Param('id') id: number) {
  //   return this.ticketService.remove(id);
  // }
}
