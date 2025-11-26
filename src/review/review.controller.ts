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
import { ReviewService } from './review.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { Roles } from '../auth/decorator/role-decorator';
import { GetUser } from '../auth/decorator/get-user.decorator';
import { JwtGuard } from '../auth/guard/auth.guard';
import { RolesGuard } from '../auth/guard/role.guard';
import {
  ApiAcceptedResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiInternalServerErrorResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Role } from '../auth/enum';
import { ReportReviewDto } from './dto';

@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Unauthorized' })
@ApiInternalServerErrorResponse({ description: 'Internal server error' })
@UseGuards(JwtGuard, RolesGuard)
@Controller('reviews')
export class ReviewController {
  constructor(private readonly reviewService: ReviewService) {}

  @ApiOperation({
    summary: 'post a review for an evemt',
    description: 'User can post a review',
  })
  @ApiCreatedResponse({ description: 'Created' })
  @Post()
  createReview(@Body() dto: CreateReviewDto) {
    return this.reviewService.createReview(dto);
  }

  @ApiOperation({
    summary: 'Report an event review',
    description:
      'Guardians and organisers can flag any review that violates policy.',
  })
  @ApiCreatedResponse({ description: 'Review report submitted successfully' })
  @Post(':reviewId/report')
  @Roles(Role.Guardian, Role.Organiser)
  reportEventReview(
    @GetUser() user: { id: string; role: Role },
    @Param('reviewId') reviewId: string,
    @Body() dto: ReportReviewDto,
  ) {
    return this.reviewService.reportReview(reviewId, dto, user);
  }

  @ApiOperation({
    summary: 'view all reviews for an event',
    description: 'View all reviews for an event',
  })
  @ApiOkResponse({ description: 'Ok' })
  @ApiNotFoundResponse({ description: 'Not found' })
  @Get(':eventId')
  viewAllReviews(@Param('eventId') eventId: string) {
    return this.reviewService.viewAllReviews(eventId);
  }

  @ApiOperation({
    summary: 'Fetch reported reviews for an event',
    description:
      'Organisers can monitor review reports tied to their events. Admins can audit everything.',
  })
  @ApiOkResponse({ description: 'Reported reviews retrieved successfully' })
  @Get('reports/event/:eventId')
  @Roles(Role.Admin, Role.Organiser)
  getEventReviewReports(@Param('eventId') eventId: string) {
    return this.reviewService.getReviewReportsByEvent(eventId);
  }

  @ApiOperation({
    summary: 'view a review by id',
    description: 'View a review by id',
  })
  @ApiOkResponse({ description: 'Ok' })
  @ApiNotFoundResponse({ description: 'Not found' })
  @Get(':id')
  viewReview(@Param('id') id: string) {
    return this.reviewService.viewReview(id);
  }

  @ApiOperation({
    summary: 'update a review by id',
    description: 'Update a review by id',
  })
  @ApiAcceptedResponse({ description: 'Accepted' })
  @ApiNotFoundResponse({ description: 'Not found' })
  @HttpCode(HttpStatus.ACCEPTED)
  @Patch(':id')
  @Roles(Role.Admin)
  updateReview(@Param('id') id: string, @Body() dto: UpdateReviewDto) {
    return this.reviewService.updateReview(id, dto);
  }

  @ApiOperation({
    summary: 'delete a review by id',
    description: 'Delete a review by id',
  })
  @ApiNoContentResponse({ description: 'No content' })
  @ApiNotFoundResponse({ description: 'Not found' })
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':id')
  @Roles(Role.Admin)
  deleteReview(@Param('id') id: string) {
    return this.reviewService.deleteReview(id);
  }
}
