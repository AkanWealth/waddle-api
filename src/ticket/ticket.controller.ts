import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { TicketService } from './ticket.service';
import { CreateTicketDto } from './dto';
import { User } from '@prisma/client';
import { GetUser } from '../auth/decorator/get-user.decorator';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiInternalServerErrorResponse,
  ApiOkResponse,
  ApiOperation,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { JwtGuard } from '../auth/guard/auth.guard';

@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Unauthorized' })
@ApiInternalServerErrorResponse({ description: 'Internal Server Error' })
@UseGuards(JwtGuard)
@Controller('ticket')
export class TicketController {
  constructor(private readonly ticketService: TicketService) {}

  @ApiOperation({
    summary: 'open a ticket',
    description: 'Parents can open a ticket',
  })
  @ApiCreatedResponse({ description: 'Created' })
  @Post()
  createTicket(@Body() dto: CreateTicketDto) {
    return this.ticketService.createTicket(dto);
  }

  @ApiOperation({
    summary: 'view all my tickets',
    description: 'Parents can view all thier tickets',
  })
  @ApiOkResponse({ description: 'Ok' })
  @Get()
  viewAllTickets(@GetUser() user: User) {
    return this.ticketService.viewAllTickets(user.email);
  }

  @ApiOperation({
    summary: 'view a ticket by ID',
    description: 'Parents can view a ticket by ID',
  })
  @ApiOkResponse({ description: 'Ok' })
  @Get(':id')
  viewTicket(@Param('id') id: number) {
    return this.ticketService.viewTicket(id);
  }

  @ApiOperation({
    summary: 'view a conversation by ticket ID',
    description: 'Parents can view a conversation by ticket ID',
  })
  @ApiOkResponse({ description: 'Ok' })
  @Get(':id/conversations')
  viewConversation(@Param('id') id: number) {
    return this.ticketService.viewConversation(id);
  }

  // @Patch(':id')
  // updateTicket(@Param('id') id: number, @Body() dto: UpdateTicketDto) {
  //   return this.ticketService.updateTicket(id, dto);
  // }

  // @ApiNoContentResponse({ description: 'No content' })
  // @HttpCode(HttpStatus.NO_CONTENT)
  // @Delete(':id')
  // @Roles(Role.Admin)
  // deleteTicket(@Param('id') id: number) {
  //   return this.ticketService.deleteTicket(id);
  // }
}
