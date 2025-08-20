import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UploadedFiles,
  UseInterceptors,
  UseGuards,
  HttpCode,
  HttpStatus,
  Query,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { CrowdSourcingService } from './crowd-sourcing.service';
import {
  CommentCrowdSourcingDto,
  CreateCrowdSourcingDto,
  UpdateCrowdSourcingDto,
  FlagCommentDto,
} from './dto';
import { GetUser } from '../auth/decorator';
import { User } from '@prisma/client';
import {
  ApiAcceptedResponse,
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiInternalServerErrorResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../auth/decorator/role-decorator';
import { Role } from '../auth/enum';
// import { UpdateReviewDto } from './dto/update-review.dto';
// import { BulkAttendanceStatsDto } from './dto/bulk-attendance-stats.dto';
// import { SetAttendanceDto } from './dto/set-attendance.dto';
import { CreateCrowdSourceReviewDto } from './dto/create-crowdsource-review.dto';
import { PaginationQueryDto } from './dto/pagination-query.dto';
import {
  AttendanceStatusDto,
  ToggleRecommendationDto,
} from './dto/recommendation.dto';

@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Unauthorized' })
@ApiInternalServerErrorResponse({ description: 'Internal server error' })
@UseGuards(AuthGuard('jwt'))
@Controller('crowd-sourcing')
export class CrowdSourcingController {
  constructor(private readonly crowdSourcingService: CrowdSourcingService) {}

  // Start Crowd Sourcing
  @ApiOperation({
    summary: 'create a new crowd sourcing event',
    description: 'Create a new crowd sourcing event by parent',
  })
  @ApiCreatedResponse({ description: 'Created' })
  @Post()
  // @UseInterceptors(FilesInterceptor('images'))
  async createSourcedEvent(
    @GetUser() user: User,
    @Body() dto: CreateCrowdSourcingDto,
  ) {
    return this.crowdSourcingService.createSourcedEvent(user.id, dto);
  }

  @ApiOperation({
    summary: 'verify a new crowd sourcing event',
    description: 'Verify a new crowd sourcing event by admin',
  })
  @ApiOkResponse({ description: 'Ok' })
  @ApiNotFoundResponse({ description: 'Not found' })
  @Post('verify/:id')
  @Roles(Role.Admin)
  async verifyCrowdSourcedEvent(
    @GetUser() user: User,
    @Param('id') id: string,
  ) {
    if (user) return this.crowdSourcingService.verifyCrowdSourcedEvent(id);
  }

  @ApiOperation({
    summary: 'unverify a crowd sourcing event',
    description: 'unverify a new crowd sourcing event by admin',
  })
  @ApiOkResponse({ description: 'Ok' })
  @ApiNotFoundResponse({ description: 'Not found' })
  @Post('unverify/:id')
  @Roles(Role.Admin)
  async unverifyCrowdSourcedEvent(
    @GetUser() user: User,
    @Param('id') id: string,
  ) {
    if (user) return this.crowdSourcingService.unverifyCrowdSourcedEvent(id);
  }

  @ApiOperation({
    summary: 'view all verified crowdsourced event',
    description: 'View all verified crowdsourced event',
  })
  @ApiOkResponse({ description: 'Ok' })
  @ApiNotFoundResponse({ description: 'Not found' })
  @Get('events/:page/:pageSize')
  findAllSourcedEvent(
    @Param('page') page: string,
    @Param('pageSize') pageSize: string,
  ) {
    return this.crowdSourcingService.findAllSourcedEvent(
      parseInt(page),
      parseInt(pageSize),
    );
  }

  @ApiOperation({
    summary: 'view all verified crowdsourced event admin',
    description: 'View all verified crowdsourced event admin',
  })
  @ApiOkResponse({ description: 'Ok' })
  @ApiNotFoundResponse({ description: 'Not found' })
  @Get('events/admin')
  findAllSourcedEventAdmin() {
    return this.crowdSourcingService.findAllSourcedEventAdmin();
  }

  @ApiOperation({
    summary: 'view all verified crowdsourced place',
    description: 'View all verified crowdsourced place',
  })
  @ApiOkResponse({ description: 'Ok' })
  @ApiNotFoundResponse({ description: 'Not found' })
  @Get('places/:page/:pageSize')
  findAllSourcedPlace(
    @Param('page') page: string,
    @Param('pageSize') pageSize: string,
  ) {
    return this.crowdSourcingService.findAllSourcedPlace(
      parseInt(page),
      parseInt(pageSize),
    );
  }

  // @ApiOperation({
  //   summary: 'view loggedin user crowdsourced event',
  //   description: 'View loggedin user crowdsourced event',
  // })
  // @ApiOkResponse({ description: 'Ok' })
  // @ApiNotFoundResponse({ description: 'Not found' })
  // @Get('me/events')
  // findMySourcedEvent(@GetUser('id') id: string) {
  //   return this.crowdSourcingService.findMySourcedEvent(id);
  // }
  @ApiOperation({
    summary: 'view logged-in user crowdsourced event',
    description: 'View logged-in user crowdsourced event with pagination',
  })
  @ApiOkResponse({ description: 'Ok' })
  @ApiNotFoundResponse({ description: 'Not found' })
  @Get('me/events')
  findMySourcedEvent(
    @GetUser('id') id: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    return this.crowdSourcingService.findMySourcedEvent(id, page, limit);
  }

  // @ApiOperation({
  //   summary: 'view loggedin user crowdsourced place',
  //   description: 'View loggedin user crowdsourced place',
  // })
  // @ApiOkResponse({ description: 'Ok' })
  // @ApiNotFoundResponse({ description: 'Not found' })
  // @Get('me/places')
  // findMySourcedPlace(@GetUser('id') id: string) {
  //   return this.crowdSourcingService.findMySourcedPlace(id);
  // }

  @ApiOperation({
    summary: 'view logged-in user crowdsourced place',
    description: 'View logged-in user crowdsourced place with pagination',
  })
  @ApiOkResponse({ description: 'Ok' })
  @ApiNotFoundResponse({ description: 'Not found' })
  @Get('me/places')
  findMySourcedPlace(
    @GetUser('id') id: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    return this.crowdSourcingService.findMySourcedPlace(id, page, limit);
  }

  @ApiOperation({
    summary: 'view a crowdsourced event/place by ID',
    description: 'View a crowdsourced event/place by ID',
  })
  @ApiOkResponse({ description: 'Ok' })
  @ApiNotFoundResponse({ description: 'Not found' })
  @Get(':id')
  findOneSourcedEvent(@Param('id') id: string) {
    return this.crowdSourcingService.findOneSourcedEvent(id);
  }

  @ApiOperation({
    summary: 'update a crowdsourced event/place',
    description: 'Update a crowdsourced event/place by ID',
  })
  @ApiAcceptedResponse({ description: 'Accepted' })
  @ApiNotFoundResponse({ description: 'Not found' })
  @HttpCode(HttpStatus.ACCEPTED)
  @Patch(':id')
  @UseInterceptors(FilesInterceptor('images'))
  async updateSourcedEvent(
    @GetUser() user: User,
    @Param('id') id: string,
    @Body() dto: UpdateCrowdSourcingDto,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    const fileBuffers = files?.map((file) => file.buffer) || [];
    const fileNames = files?.map((file) => file.originalname) || [];

    return this.crowdSourcingService.updateSourcedEvent(
      user.id,
      id,
      dto,
      fileNames,
      fileBuffers,
    );
  }

  @ApiOperation({
    summary: 'delete a crowdsourced event/place temporarily',
    description: 'Delete a crowdsourced event/place by ID temporarily',
  })
  @ApiNoContentResponse({ description: 'No content' })
  @ApiNotFoundResponse({ description: 'Not found' })
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete('temp/:id')
  @Roles(Role.Admin)
  removeSourcedEventTemp(
    @GetUser() user: { id: string },
    @Param('id') id: string,
  ) {
    if (user) return this.crowdSourcingService.removeSourcedEventTemp(id);
  }

  @ApiOperation({
    summary: 'delete a crowdsourced event/place',
    description: 'Delete a crowdsourced event/place by ID',
  })
  @ApiNoContentResponse({ description: 'No content' })
  @ApiNotFoundResponse({ description: 'Not found' })
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':id')
  @Roles(Role.Admin)
  removeSourcedEvent(@GetUser() user: { id: string }, @Param('id') id: string) {
    if (user) return this.crowdSourcingService.removeSourcedEvent(id);
  }
  // End Crowd Sourcing

  // Start Commenting and Replying
  @ApiOperation({
    summary: 'create a new comment for crowd sourcing event',
    description: 'Create a new comment for crowd sourcing event by parent',
  })
  @ApiCreatedResponse({ description: 'Created' })
  @ApiBadRequestResponse({ description: 'Bad request' })
  @Post('comment')
  async commentOnSourcedEvent(
    @GetUser('id') id: string,
    @Body() dto: CommentCrowdSourcingDto,
  ) {
    return this.crowdSourcingService.commentOnSourcedEvent(id, dto);
  }

  @ApiOperation({
    summary: 'reply to comment for crowd sourcing event/place',
    description: 'Reply to a comment for crowd sourcing event/place by parent',
  })
  @ApiCreatedResponse({ description: 'Created' })
  @ApiBadRequestResponse({ description: 'Bad request' })
  @Post('reply')
  async respondToComment(
    @GetUser('id') id: string,
    @Body() dto: CommentCrowdSourcingDto,
  ) {
    return this.crowdSourcingService.respondToComment(id, dto);
  }

  @ApiOperation({
    summary: 'view all comment by crowd sourced ID',
    description: 'View all comment by crowd sourced ID',
  })
  @ApiOkResponse({ description: 'Ok' })
  @ApiNotFoundResponse({ description: 'Not found' })
  @Get('comment/:id')
  async viewCommentsForSourcedEvent(@Param('id') id: string) {
    return this.crowdSourcingService.viewCommentsForSourcedEvent(id);
  }

  @ApiOperation({
    summary: 'view all response by comment ID',
    description: 'View all response by comment ID',
  })
  @ApiOkResponse({ description: 'Ok' })
  @ApiNotFoundResponse({ description: 'Not found' })
  @Get('reply/:id')
  async viewRepliesForComment(@Param('id') id: string) {
    return this.crowdSourcingService.viewRepliesForComment(id);
  }

  //Working Fine And Used
  @ApiOperation({
    summary: 'Submit a review for a crowdsourced place',
    description:
      'Each parent can review a crowdsourced place. Only one review per user per place is allowed.',
  })
  @ApiCreatedResponse({ description: 'Review created successfully' })
  @ApiConflictResponse({ description: 'You have already reviewed this place' })
  @ApiBadRequestResponse({ description: 'Invalid request' })
  @ApiNotFoundResponse({ description: 'CrowdSource not found' })
  @Post('review/:id')
  async submitReview(
    @GetUser('id') userId: string,
    @Param('id') crowdSourceId: string,
    @Body() dto: CreateCrowdSourceReviewDto,
  ) {
    return this.crowdSourcingService.createPlaceReview(
      userId,
      crowdSourceId,
      dto,
    );
  }

  // Working Fine And Used
  @ApiOperation({
    summary: 'Get recommendation percentage for a crowdsourced place',
    description:
      'Returns the percentage of parents that recommended this crowdsourced place',
  })
  @ApiOkResponse({ description: 'Percentage calculated successfully' })
  @ApiNotFoundResponse({ description: 'CrowdSource not found' })
  @Get('review/:id/recommendation-percentage')
  async getRecommendationPercentage(@Param('id') crowdSourceId: string) {
    const percentage =
      await this.crowdSourcingService.getRecommendationPlacePercentage(
        crowdSourceId,
      );
    return { crowdSourceId, percentage };
  }

  @Get(':id/percentage')
  @ApiOperation({
    summary: 'Get percentage statistics for a crowdsource (event or place)',
    description:
      'For events: percentage of people going (excluding PENDING). For places: percentage of people recommending (excluding PENDING).',
  })
  @ApiOkResponse({ description: 'Percentage calculated successfully' })
  @ApiNotFoundResponse({ description: 'CrowdSource not found' })
  async getCrowdSourcePercentage(@Param('id') crowdSourceId: string) {
    return this.crowdSourcingService.getCrowdSourcePercentage(crowdSourceId);
  }

  @Get('event/:id/attendance-percentage')
  @ApiOperation({
    summary: 'Get attendance percentage for an event',
    description:
      'Returns the percentage of people going to the event (excluding PENDING responses)',
  })
  @ApiOkResponse({ description: 'Percentage calculated successfully' })
  @ApiNotFoundResponse({ description: 'Event not found' })
  async getEventAttendancePercentage(@Param('id') crowdSourceId: string) {
    const percentage =
      await this.crowdSourcingService.getEventAttendancePercentage(
        crowdSourceId,
      );
    return { crowdSourceId, percentage };
  }

  @Get('place/:id/recommendation-percentage')
  @ApiOperation({
    summary: 'Get recommendation percentage for a place',
    description:
      'Returns the percentage of people recommending the place (excluding PENDING responses)',
  })
  @ApiOkResponse({ description: 'Percentage calculated successfully' })
  @ApiNotFoundResponse({ description: 'Place not found' })
  async getPlaceRecommendationPercentage(@Param('id') crowdSourceId: string) {
    const percentage =
      await this.crowdSourcingService.getPlaceRecommendationPercentage(
        crowdSourceId,
      );
    return { crowdSourceId, percentage };
  }

  @Get(':crowdSourceId/my-attendance')
  @ApiOperation({
    summary: 'Check my attendance status for an event',
    description:
      "Returns the current user's attendance status (YES/NO/PENDING) for a specific event",
  })
  @ApiParam({ name: 'crowdSourceId', type: String })
  @ApiOkResponse({ description: 'Attendance status retrieved successfully' })
  @ApiNotFoundResponse({ description: 'Event not found' })
  async getMyAttendanceStatus(
    @GetUser('id') userId: string,
    @Param('crowdSourceId') crowdSourceId: string,
  ) {
    return this.crowdSourcingService.getMyAttendanceStatus(
      userId,
      crowdSourceId,
    );
  }

  //Working Fine And Used
  @ApiOperation({
    summary: 'Fetch paginated reviews for a crowdsourced place',
    description:
      'Returns reviews (including comment, recommendation, user info) in paginated form',
  })
  @ApiOkResponse({ description: 'Reviews fetched successfully' })
  @ApiNotFoundResponse({ description: 'CrowdSource not found' })
  @Get('review/:id/paginated')
  async getPaginatedReviews(
    @Param('id') crowdSourceId: string,
    @Query() query: PaginationQueryDto,
  ) {
    const { page, limit } = query;
    return this.crowdSourcingService.getPaginatedPlaceReviews(
      crowdSourceId,
      page,
      limit,
    );
  }

  @ApiOperation({
    summary: 'Fetch paginated reviews for a crowdsourced place as an admin',
    description:
      'Returns reviews (including comment, recommendation, user info) in paginated form as an adminn',
  })
  @ApiOkResponse({ description: 'Reviews fetched successfully' })
  @ApiNotFoundResponse({ description: 'CrowdSource not found' })
  @Get('admin-review/:id/paginated')
  async getPaginatedReviewsAsAdmin(
    @Param('id') crowdSourceId: string,
    @Query() query: PaginationQueryDto,
  ) {
    const { page, limit } = query;
    return this.crowdSourcingService.getPaginatedReviewsAsAdmin(
      crowdSourceId,
      page,
      limit,
    );
  }

  @ApiOperation({
    summary: 'Fetch paginated reviews for a crowdsourced events',
    description:
      'Returns reviews (including comment, recommendation, user info) in paginated form',
  })
  @ApiOkResponse({ description: 'Reviews fetched successfully' })
  @ApiNotFoundResponse({ description: 'CrowdSource not found' })
  @Get('events-review/:id/paginated')
  async getPaginatedEventCommentss(
    @Param('id') crowdSourceId: string,
    @Query() query: PaginationQueryDto,
  ) {
    const { page, limit } = query;
    return this.crowdSourcingService.getPaginatedEventComments(
      crowdSourceId,
      page,
      limit,
    );
  }

  @ApiOperation({
    summary: 'Fetch paginated reviews for a crowdsourced events As An Admin',
    description:
      'Returns reviews (including comment, recommendation, user info) in paginated form As Admin',
  })
  @ApiOkResponse({ description: 'Reviews fetched successfully' })
  @ApiNotFoundResponse({ description: 'CrowdSource not found' })
  @Get('admin/events-review/:id/paginated')
  async getPaginatedEventCommentsAsAdmin(
    @Param('id') crowdSourceId: string,
    @Query() query: PaginationQueryDto,
  ) {
    const { page, limit } = query;
    return this.crowdSourcingService.getPaginatedEventCommentsAsAdmin(
      crowdSourceId,
      page,
      limit,
    );
  }

  @Get('place/:crowdSourceId/parents')
  @ApiOperation({ summary: 'Get list of parents who recommended a place' })
  @ApiParam({ name: 'crowdSourceId', type: String })
  @ApiResponse({ status: 200, description: 'List retrieved successfully' })
  getParentsWhoRecommendedPlace(@Param('crowdSourceId') id: string) {
    return this.crowdSourcingService.getParentsWhoRecommendedPlace(id);
  }

  @Get('event/:crowdSourceId/parents')
  @ApiOperation({ summary: 'Get list of parents who recommended an event' })
  @ApiParam({ name: 'crowdSourceId', type: String })
  @ApiResponse({ status: 200, description: 'List retrieved successfully' })
  getParentsWhoRecommendedEvent(@Param('crowdSourceId') id: string) {
    return this.crowdSourcingService.getParentsWhoRecommendedEvent(id);
  }

  @Post('event/:crowdSourceId/recommendation')
  @ApiOperation({ summary: 'Toggle recommendation for an event' })
  @ApiParam({ name: 'crowdSourceId', type: String })
  @ApiBody({ type: ToggleRecommendationDto })
  @ApiResponse({
    status: 200,
    description: 'Recommendation toggled successfully',
  })
  toggleEventRecommendation(
    @Param('crowdSourceId') id: string,
    @Body() body: ToggleRecommendationDto,
  ) {
    return this.crowdSourcingService.toggleEventRecommendation(
      body.userId,
      id,
      body.wouldRecommend,
    );
  }

  @Post(':crowdSourceId/attendance')
  @ApiOperation({
    summary: 'Set attendance status for a user on a crowdsourcexx',
  })
  @ApiParam({ name: 'crowdSourceId', type: String })
  @ApiBody({ type: AttendanceStatusDto })
  @ApiResponse({
    status: 200,
    description: 'Attendance status set successfully',
  })
  setAttendanceWithStatus(
    @GetUser() user: User,
    @Param('crowdSourceId') id: string,
    @Body() body: AttendanceStatusDto,
  ) {
    console.log(body);
    return this.crowdSourcingService.setAttendanceWithStatus(
      user.id,
      id,
      body.going,
    );
  }

  @Get(':crowdSourceId/attendance/stats')
  @ApiOperation({ summary: 'Get attendance stats for a crowdsource' })
  @ApiParam({ name: 'crowdSourceId', type: String })
  @ApiResponse({
    status: 200,
    description: 'Attendance stats retrieved successfully',
  })
  getAttendanceStatsWithStatus(@Param('crowdSourceId') id: string) {
    return this.crowdSourcingService.getAttendanceStatsWithStatus(id);
  }

  @Get(':crowdSourceId/attendance/parents-going')
  @ApiOperation({ summary: 'Get list of parents who are going to an event' })
  @ApiParam({ name: 'crowdSourceId', type: String })
  @ApiResponse({
    status: 200,
    description: 'List of parents going retrieved successfully',
  })
  getParentsGoingToEvent(@Param('crowdSourceId') id: string) {
    return this.crowdSourcingService.getParentsGoingToEvent(id);
  }

  @Post('place/:crowdSourceId/recommendation')
  @ApiOperation({ summary: 'Toggle recommendation for a place' })
  @ApiParam({ name: 'crowdSourceId', type: String })
  @ApiBody({ type: ToggleRecommendationDto })
  @ApiResponse({
    status: 200,
    description: 'Recommendation toggled successfully',
  })
  togglePlaceRecommendation(
    @Param('crowdSourceId') id: string,
    @Body() body: ToggleRecommendationDto,
  ) {
    return this.crowdSourcingService.togglePlaceRecommendation(
      body.userId,
      id,
      body.wouldRecommend,
    );
  }

  @Get('place/:crowdSourceId/recommendation/stats')
  @ApiOperation({ summary: 'Get recommendation stats for a place' })
  @ApiParam({ name: 'crowdSourceId', type: String })
  @ApiResponse({
    status: 200,
    description: 'Recommendation stats retrieved successfully',
  })
  getPlaceRecommendationStats(@Param('crowdSourceId') id: string) {
    return this.crowdSourcingService.getPlaceRecommendationStats(id);
  }

  @Post('place/:crowdSourceId/review/comment')
  @ApiOperation({ summary: 'Add a comment to a place review' })
  @ApiParam({ name: 'crowdSourceId', type: String })
  @ApiBody({ type: CommentCrowdSourcingDto })
  @ApiResponse({
    status: 201,
    description: 'Comment added successfully',
  })
  addReviewComment(
    @GetUser('id') userId: string,
    @Param('crowdSourceId') id: string,
    @Body() dto: CommentCrowdSourcingDto,
  ) {
    return this.crowdSourcingService.addReviewComment(userId, id, dto);
  }

  @Get('place/:crowdSourceId/review/comments')
  @ApiOperation({
    summary: 'Get all comments for a place review with like counts',
  })
  @ApiParam({ name: 'crowdSourceId', type: String })
  @ApiResponse({
    status: 200,
    description: 'Comments retrieved successfully',
  })
  getReviewComments(@Param('crowdSourceId') id: string) {
    return this.crowdSourcingService.getReviewComments(id);
  }

  @Post('comment/:commentId/like')
  @ApiOperation({ summary: 'Toggle like on a comment' })
  @ApiParam({ name: 'commentId', type: String })
  @ApiResponse({
    status: 200,
    description: 'Comment like toggled successfully',
  })
  toggleCommentLike(
    @GetUser('id') userId: string,
    @Param('commentId') commentId: string,
  ) {
    return this.crowdSourcingService.toggleCommentLike(userId, commentId);
  }

  @Post('comment/:commentId/flag')
  @ApiOperation({
    summary: 'Flag a comment as appropriate or inappropriate (Admin only)',
  })
  @ApiParam({ name: 'commentId', type: String })
  @ApiBody({ type: FlagCommentDto })
  @ApiResponse({
    status: 200,
    description: 'Comment flagged successfully',
  })
  @Roles(Role.Admin)
  flagComment(
    @GetUser() user: User,
    @Param('commentId') commentId: string,
    @Body() dto: FlagCommentDto,
  ) {
    return this.crowdSourcingService.flagComment(commentId, dto.status);
  }

  @Post('place-review/:commentId/flag')
  @ApiOperation({
    summary: 'Flag a comment as appropriate or inappropriate (Admin only)',
  })
  @ApiParam({ name: 'commentId', type: String })
  @ApiBody({ type: FlagCommentDto })
  @ApiResponse({
    status: 200,
    description: 'Comment flagged successfully',
  })
  @Roles(Role.Admin)
  flagCrowdsourcePlaceCommentAsAdmin(
    @GetUser() user: User,
    @Param('commentId') commentId: string,
    @Body() dto: FlagCommentDto,
  ) {
    return this.crowdSourcingService.flagCrowdsourcePlaceCommentAsAdmin(
      commentId,
      dto.status,
    );
  }

  // @ApiOperation({
  //   summary: 'update a review for a crowdsourced place',
  //   description: 'Update your review for a crowdsourced place',
  // })
  // @ApiAcceptedResponse({ description: 'Review updated successfully' })
  // @ApiBadRequestResponse({ description: 'Bad request' })
  // @ApiNotFoundResponse({ description: 'Review not found' })
  // @HttpCode(HttpStatus.ACCEPTED)
  // @Patch('review/:id')
  // async updateReview(
  //   @GetUser('id') userId: string,
  //   @Param('id') reviewId: string,
  //   @Body() dto: UpdateReviewDto,
  // ) {
  //   return this.crowdSourcingService.updateReview(userId, reviewId, dto);
  // }
}
