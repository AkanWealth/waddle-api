import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { LikeService } from './like.service';
import { CreateLikeDto } from './dto';
import { User } from '@prisma/client';
import { JwtGuard } from '../auth/guard/auth.guard';
import { GetUser } from '../auth/decorator/get-user.decorator';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiInternalServerErrorResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

@ApiUnauthorizedResponse({ description: 'Unauthorized' })
@ApiInternalServerErrorResponse({ description: 'Internal server error' })
@ApiBearerAuth()
@UseGuards(JwtGuard)
@Controller('likes')
export class LikeController {
  constructor(private readonly likeService: LikeService) {}

  @ApiOperation({
    summary: 'like an event',
    description: 'Parents can like an event',
  })
  @ApiCreatedResponse({ description: 'Created' })
  @Post('event')
  likeEvent(@GetUser() user: User, @Body() dto: CreateLikeDto) {
    return this.likeService.likeEvent(user.id, dto);
  }

  @ApiOperation({
    summary: 'like a crowdsourced event',
    description: 'Parents can like a crowdsourced event',
  })
  @ApiCreatedResponse({ description: 'Created' })
  @Post('crowd-sourced')
  likeCrowdSourcedEvent(@GetUser() user: User, @Body() dto: CreateLikeDto) {
    return this.likeService.likeCrowdSourcedEvent(user.id, dto);
  }

  @ApiOperation({
    summary: 'view all likes for event',
    description: 'Parents can view all likes for event',
  })
  @ApiOkResponse({ description: 'Ok' })
  @ApiNotFoundResponse({ description: 'Not found' })
  @Get('event/:id')
  viewLikesByEvent(@Param('id') eventId: string) {
    return this.likeService.viewLikesByEvent(eventId);
  }

  @ApiOperation({
    summary: 'view all likes for crowd sourced event',
    description: 'Parents can view all likes for crowd sourced event',
  })
  @ApiOkResponse({ description: 'Ok' })
  @ApiNotFoundResponse({ description: 'Not found' })
  @Get('crowd-sourced/:id')
  viewLikesByCrowdSourceEvent(@Param('id') eventId: string) {
    return this.likeService.viewLikesByCrowdSourceEvent(eventId);
  }

  @ApiOperation({
    summary: 'unlike an event',
    description: 'Parents can unlike an event',
  })
  @ApiNoContentResponse({ description: 'No content' })
  @ApiNotFoundResponse({ description: 'Not found' })
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':id')
  deleteLike(@GetUser() user: User, @Param('id') id: string) {
    return this.likeService.deleteLike(user.id, id);
  }
}
