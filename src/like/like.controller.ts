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
  @Post()
  createLike(@GetUser() user: User, @Body() dto: CreateLikeDto) {
    return this.likeService.createLike(user.id, dto);
  }

  @ApiOperation({
    summary: 'view all likes by event',
    description: 'Parents can view all likes by event',
  })
  @ApiOkResponse({ description: 'Ok' })
  @ApiNotFoundResponse({ description: 'Not found' })
  @Get(':eventId')
  viewAllLikes(@Param('eventId') eventId: string) {
    return this.likeService.viewAllLikes(eventId);
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
