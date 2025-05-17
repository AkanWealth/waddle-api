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
import { GetUser } from 'src/auth/decorator';
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
import { Roles } from 'src/auth/decorator/role-decorator';
import { Role } from 'src/auth/enum';

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
  @Get()
  findAllSourcedEvent() {
    return this.crowdSourcingService.findAllSourcedEvent();
  }

  @ApiOperation({
    summary: 'view a crowdsourced event by ID',
    description: 'View a crowdsourced event by ID',
  })
  @ApiOkResponse({ description: 'Ok' })
  @ApiNotFoundResponse({ description: 'Not found' })
  @Get(':id')
  findOneSourcedEvent(@Param('id') id: string) {
    return this.crowdSourcingService.findOneSourcedEvent(id);
  }

  @ApiOperation({
    summary: 'update a crowdsourced event',
    description: 'Update a crowdsourced event by ID',
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
    summary: 'delete a crowdsourced event temporarily',
    description: 'Delete a crowdsourced event by ID temporarily',
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
    summary: 'delete a crowdsourced event',
    description: 'Delete a crowdsourced event by ID',
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
    @GetUser('di') id: string,
    @Body() dto: CommentCrowdSourcingDto,
  ) {
    return this.crowdSourcingService.commentOnSourcedEvent(id, dto);
  }

  @ApiOperation({
    summary: 'reply to comment for crowd sourcing event',
    description: 'Reply to a comment for crowd sourcing event by parent',
  })
  @ApiCreatedResponse({ description: 'Created' })
  @ApiBadRequestResponse({ description: 'Bad request' })
  @Post('reply')
  async respondToComment(
    @GetUser('di') id: string,
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
