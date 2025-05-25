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
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { CrowdSourcingService } from './crowd-sourcing.service';
import {
  CommentCrowdSourcingDto,
  CreateCrowdSourcingDto,
  UpdateCrowdSourcingDto,
} from './dto';
import { GetUser } from '../auth/decorator';
import { User } from '@prisma/client';
import {
  ApiAcceptedResponse,
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiInternalServerErrorResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../auth/decorator/role-decorator';
import { Role } from '../auth/enum';

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
  @UseInterceptors(FilesInterceptor('images'))
  async createSourcedEvent(
    @GetUser() user: User,
    @Body() dto: CreateCrowdSourcingDto,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    const fileBuffers = files?.map((file) => file.buffer) || [];
    const fileNames = files?.map((file) => file.originalname) || [];

    return this.crowdSourcingService.createSourcedEvent(
      user.id,
      dto,
      fileNames,
      fileBuffers,
    );
  }

  @ApiOperation({
    summary: 'verify a new crowd sourcing event',
    description: 'Verify a new crowd sourcing event by admin',
  })
  @ApiOkResponse({ description: 'Ok' })
  @ApiNotFoundResponse({ description: 'Not found' })
  @Post('verify')
  @Roles(Role.Admin)
  async verifyCrowdSourcedEvent(
    @GetUser() user: User,
    @Param('id') id: string,
  ) {
    if (user) return this.crowdSourcingService.verifyCrowdSourcedEvent(id);
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

  @ApiOperation({
    summary: 'view loggedin user crowdsourced event',
    description: 'View loggedin user crowdsourced event',
  })
  @ApiOkResponse({ description: 'Ok' })
  @ApiNotFoundResponse({ description: 'Not found' })
  @Get('me/events')
  findMySourcedEvent(@GetUser('id') id: string) {
    return this.crowdSourcingService.findMySourcedEvent(id);
  }

  @ApiOperation({
    summary: 'view loggedin user crowdsourced place',
    description: 'View loggedin user crowdsourced place',
  })
  @ApiOkResponse({ description: 'Ok' })
  @ApiNotFoundResponse({ description: 'Not found' })
  @Get('me/places')
  findMySourcedPlace(@GetUser('id') id: string) {
    return this.crowdSourcingService.findMySourcedPlace(id);
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
    summary: 'create a new comment for crowd sourcing event/place',
    description:
      'Create a new comment for crowd sourcing event/place by parent',
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
  // End Commenting and Replying
}
