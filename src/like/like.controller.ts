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
import {
  CreateEventLikeDto,
  CreateCommentLikeDto,
  CreateReviewLikeDto,
} from './dto';
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
  likeEvent(@GetUser() user: User, @Body() dto: CreateEventLikeDto) {
    return this.likeService.likeEvent(user.id, dto);
  }

  @ApiOperation({
    summary: 'like a crowdsourced event',
    description: 'Parents can like a crowdsourced event',
  })
  @ApiCreatedResponse({ description: 'Created' })
  @Post('crowd-sourced')
  likeCrowdSourcedEvent(
    @GetUser() user: User,
    @Body() dto: CreateEventLikeDto,
  ) {
    return this.likeService.likeCrowdSourcedEvent(user.id, dto);
  }

  @ApiOperation({
    summary: 'like a comment',
    description: 'Parents can like a comment',
  })
  @ApiCreatedResponse({ description: 'Created' })
  @Post('comment')
  likeComment(@GetUser() user: User, @Body() dto: CreateCommentLikeDto) {
    return this.likeService.likeComment(user.id, dto);
  }

  @ApiOperation({
    summary: 'like a review under a recommended place',
    description: 'Parents can like a review under a recommended place',
  })
  @ApiCreatedResponse({ description: 'Created' })
  @Post('crowdsource-place/like')
  likeACrowdsourcePlaceComment(
    @GetUser() user: User,
    @Body() dto: CreateCommentLikeDto,
  ) {
    return this.likeService.likeACrowdsourcePlaceComment(user.id, dto);
  }

  @ApiOperation({
    summary: 'unlike a review under a recommended place',
    description: 'Parents can like a review under a recommended place',
  })
  @ApiCreatedResponse({ description: 'Created' })
  @Post('crowdsource-review/unlike')
  unLikeACrowdsourcePlaceComment(
    @GetUser() user: User,
    @Body() dto: CreateCommentLikeDto,
  ) {
    return this.likeService.unLikeACrowdsourcePlaceComment(
      user.id,
      dto.commentId,
    );
  }

  @ApiOperation({
    summary: 'like a review',
    description: 'Parents can like a review',
  })
  @ApiCreatedResponse({ description: 'Created' })
  @Post('review')
  likeReview(@GetUser() user: User, @Body() dto: CreateReviewLikeDto) {
    return this.likeService.likeReview(user.id, dto);
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
    summary: 'view logged in user liked crowdsourced events and places',
    description:
      'Parents can view all crowdsourced events and places they have liked',
  })
  @ApiOkResponse({ description: 'Ok' })
  @Get('crowd-sourced/me')
  getMyLikedCrowdSource(@GetUser() user: User) {
    return this.likeService.getMyLikedCrowdSource(user.id);
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
    summary: 'view all likes for comment',
    description: 'Parents can view all likes for comment',
  })
  @ApiOkResponse({ description: 'Ok' })
  @ApiNotFoundResponse({ description: 'Not found' })
  @Get('comment/:id')
  viewLikesByComment(@Param('id') commentId: string) {
    return this.likeService.viewLikesByComment(commentId);
  }

  @ApiOperation({
    summary: 'view all likes for review',
    description: 'Parents can view all likes for review',
  })
  @ApiOkResponse({ description: 'Ok' })
  @ApiNotFoundResponse({ description: 'Not found' })
  @Get('review/:id')
  viewLikesByReview(@Param('id') reviewId: string) {
    return this.likeService.viewLikesByReview(reviewId);
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
