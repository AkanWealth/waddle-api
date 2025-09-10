import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
  ParseBoolPipe,
} from '@nestjs/common';
import { EventService } from './event.service';
import {
  ConfirmEventCancellation,
  CreateEventDto,
  UpdateEventDto,
} from './dto';
import { GetUser } from '../auth/decorator/get-user.decorator';
import {
  ApiAcceptedResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiInternalServerErrorResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { EventType, User } from '@prisma/client';
import { JwtGuard } from '../auth/guard/auth.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import { RolesGuard } from '../auth/guard/role.guard';
import { Roles } from '../auth/decorator/role-decorator';
import { Role } from '../auth/enum';
import { EventStatus } from 'src/utils/constants/eventTypes';
import { DraftEventDto } from './dto/draft-event.dto';

@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Unauthorized' })
@ApiInternalServerErrorResponse({ description: 'Internal Server Error' })
@UseGuards(JwtGuard, RolesGuard)
@Controller('events')
export class EventController {
  constructor(private readonly eventService: EventService) {}

  @ApiOperation({
    summary: 'create an event by organiser',
    description: 'Create an event by the main organiser',
  })
  @ApiCreatedResponse({ description: 'Created' })
  @Post('organiser')
  @Roles(Role.Organiser)
  @UseInterceptors(FileInterceptor('images'))
  createEventByOrganiser(
    @GetUser() user: { id: string },
    @Body() dto: CreateEventDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (file) {
      try {
        new ParseFilePipe({
          validators: [
            new MaxFileSizeValidator({ maxSize: 5000000 }),
            new FileTypeValidator({ fileType: 'image/*' }),
          ],
        }).transform(file);
      } catch (error) {
        throw error;
      }
      return this.eventService.createEventByOrganiser(
        user.id,
        dto,
        file.originalname,
        file.buffer,
      );
    } else {
      return this.eventService.createEventByOrganiser(
        user.id,
        dto,
        file?.originalname,
        file?.buffer,
      );
    }
  }

  @ApiOperation({
    summary: 'Draft an event by organiser',
    description: 'Draft by the organiser',
  })
  @ApiCreatedResponse({ description: 'Created' })
  @Post('organiser/draft')
  @Roles(Role.Organiser)
  draftsEventByOrganiser(
    @GetUser() user: { id: string },
    @Body() dto: DraftEventDto,
  ) {
    return this.eventService.draftsEventByOrganiser(user.id, dto);
  }

  @ApiOperation({
    summary: 'Duplicate an event as an organiser',
    description: 'Duplicate an event as an organiser',
  })
  @ApiOkResponse({ description: 'Ok' })
  @Patch('organiser/:id/duplicate')
  @Roles(Role.Organiser)
  duplicateEventAsOrganiser(
    @GetUser() user: { id: string },
    @Param('id') eventId: string,
  ) {
    return this.eventService.duplicateEventAsOrganiser(eventId, user.id);
  }

  @ApiOperation({
    summary: 'Publish a drafted event by organiser',
    description: 'Publish a drafted event by the organiser',
  })
  @ApiOkResponse({ description: 'Ok' })
  @Patch('organiser/:id/publish')
  @Roles(Role.Organiser)
  publishDraftedEventByOrganiser(
    @GetUser() user: { id: string },
    @Param('id') eventId: string,
  ) {
    return this.eventService.publishDraftedEventByOrganiser(eventId, user.id);
  }

  @ApiOperation({
    summary: 'Cancel an event as an organiser',
    description: 'Cancel an event as an organiser',
  })
  @ApiOkResponse({ description: 'Ok' })
  @Patch('organiser/:id/cancel')
  @Roles(Role.Organiser)
  cancelAnEventAsOrganiser(
    @GetUser() user: { id: string },
    @Param('id') eventId: string,
  ) {
    return this.eventService.cancelAnEventAsOrganiser(eventId, user.id);
  }

  @ApiOperation({
    summary: 'create an event by admin',
    description: 'Create an event by the admin',
  })
  @ApiCreatedResponse({ description: 'Created' })
  @Post('host')
  @Roles(Role.Admin)
  @UseInterceptors(FileInterceptor('images'))
  createEventByAdmin(
    @GetUser() user: { id: string },
    @Body() dto: CreateEventDto,
    //@UploadedFile() file?: Express.Multer.File,
  ) {
    return this.eventService.createEventByAdmin(user.id, dto);
  }

  @ApiOperation({
    summary: 'Draft an event by admin',
    description: 'Draft by the admin',
  })
  @ApiCreatedResponse({ description: 'Created' })
  @Post('host/draft')
  @Roles(Role.Admin)
  @UseInterceptors(FileInterceptor('images'))
  draftsEventByAdmin(
    @GetUser() user: { id: string },
    @Body() dto: DraftEventDto,
  ) {
    return this.eventService.draftsEventByAdmin(user.id, dto);
  }

  @Patch('host/:id/approve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Approve and publish a drafted event by admin' })
  @ApiParam({ name: 'id', type: String, description: 'Event ID' })
  @ApiResponse({
    status: 200,
    description: 'Event approved and published',
    schema: {
      example: {
        success: true,
        message: 'Event approved and published',
        data: {
          id: 'clxyz...',
          name: 'Sample Event',
          status: 'APPROVED',
          isPublished: true,
          // other event fields...
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Event not found' })
  async approveDraftedEventsByAdmin(@Param('id') eventId: string) {
    return this.eventService.approveDraftedEventsByAdmin(eventId);
  }

  @Patch('host/:id/reject')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Rejected a drafted event by admin' })
  @ApiParam({ name: 'id', type: String, description: 'Event ID' })
  @ApiResponse({
    status: 200,
    description: 'Event rejected',
    schema: {
      example: {
        success: true,
        message: 'Event rejected',
        data: {
          id: 'clxyz...',
          name: 'Sample Event',
          status: EventStatus.NON_COMPLIANT,
          isPublished: false,
          // other event fields...
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Event not found' })
  async rejectDraftedEventsByAdmin(@Param('id') eventId: string) {
    return this.eventService.rejectDraftedEventsByAdmin(eventId);
  }

  @ApiOperation({
    summary: 'view all published paginated events as an admin ',
    description:
      'Parents, Admin and Organisers are able to view all published paginated events as admin',
  })
  @ApiOkResponse({ description: 'Ok' })
  @Get('/admin')
  @Roles(Role.Admin)
  findAllAdmin(@GetUser() user: { id: string }) {
    return this.eventService.viewAllEventAdmin(user.id);
  }

  @ApiOperation({
    summary: 'View all cancelled events as an admin (paginated)',
    description: 'Admin can view all cancelled events with pagination',
  })
  @ApiOkResponse({ description: 'Ok' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'The organiser name or the event name',
    example: 'Test event"',
  })
  @ApiQuery({
    name: 'startDate',
    required: false,
    type: String,
    description: 'Start date for filtering events (ISO date string)',
    example: '2024-01-01',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    type: String,
    description: 'End date for filtering events (ISO date string)',
    example: '2024-12-31',
  })
  @ApiQuery({
    name: 'isCancelled',
    required: false,
    type: Boolean,
    description: 'Filter events by cancellation status (default: false)',
    example: true,
  })
  @Get('/admin/cancel')
  @Roles(Role.Admin)
  viewAllCancelledEventAsAdmin(
    @Query('page', new ParseIntPipe({ optional: true })) page: number = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit: number = 10,
    @Query('search') search?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('isCancelled', new ParseBoolPipe({ optional: true }))
    isCancelled?: boolean,
  ) {
    return this.eventService.viewAllCancelledEventAsAdmin(
      page,
      limit,
      isCancelled,
      search,
      startDate,
      endDate,
    );
  }

  @ApiOperation({
    summary:
      'Send notification to organiser and process refunds for a cancelled event',
    description:
      'Admins can notify the organiser of event cancellation and initiate refund processing for attendees.',
  })
  @ApiOkResponse({
    description: 'Notification sent and refunds processed successfully',
  })
  @ApiParam({ name: 'id', type: String, description: 'Event ID' })
  @Patch('admin/:id/cancel/notify')
  @Roles(Role.Admin)
  sendNotificationReminderAndProcessRefund(
    @Param('id') eventId: string,
    @Body() dto: ConfirmEventCancellation,
  ) {
    return this.eventService.sendNotificationReminderAndProcessRefund(
      eventId,
      dto,
    );
  }

  @ApiOperation({
    summary: 'view created events by organiser',
    description: 'View all events created by the logged in organiser',
  })
  @ApiOkResponse({ description: 'Ok' })
  @Get('organiser')
  @Roles(Role.Organiser)
  viewMyEventsAsOrganiser(@GetUser() user: { id: string }) {
    return this.eventService.viewMyEventsAsOrganiser(user.id);
  }

  @ApiOperation({
    summary: 'view created events by admin',
    description: 'View all events created by the admin',
  })
  @ApiOkResponse({ description: 'Ok' })
  @Get('host')
  @Roles(Role.Admin)
  viewMyEventsAsAdmin(@GetUser() user: { id: string }) {
    return this.eventService.viewMyEventsAsAdmin(user.id);
  }

  @ApiOperation({
    summary: 'fetch all soft deleted events',
    description:
      'Fetch all soft deleted events based on the logged in Organiser or Admin',
  })
  @ApiOkResponse({ description: 'Ok' })
  @Get('all/soft-deleted')
  @Roles(Role.Admin)
  async fetchAllSoftDeletedEvents() {
    return this.eventService.getAllSoftDeletedEvents();
  }

  @ApiOperation({
    summary: 'Approve Events',
    description: 'Approve an event as an admin',
  })
  @ApiOkResponse({ description: 'Ok' })
  @Get('host')
  @Roles(Role.Admin)
  approveEventAsAdmin(@GetUser() user: { id: string }) {
    return this.eventService.viewMyEventsAsAdmin(user.id);
  }

  @ApiOperation({
    summary: 'search for published events by name, age or price',
    description:
      'Parents, Admin or Organisers are able to search for published events',
  })
  @ApiOkResponse({ description: 'Ok' })
  @ApiQuery({ name: 'name', required: false, type: String })
  @ApiQuery({ name: 'age', required: false, type: String })
  @ApiQuery({ name: 'price', required: false, type: String })
  @ApiQuery({ name: 'tags', required: false, type: [String] })
  @ApiQuery({ name: 'facilities', required: false, type: [String] })
  @ApiQuery({ name: 'distance', required: false, type: Number })
  @ApiQuery({
    name: 'date',
    required: false,
    type: String,
    description: 'Date in ISO 8601 format (e.g. 2025-08-28T00:00:00.000Z)',
    example: '2025-08-28T00:00:00.000Z',
  })
  @ApiQuery({
    name: 'eventType',
    required: false,
    type: String,
    enum: EventType,
  })
  @Get('search')
  searchEvent(
    @Query('name') name: string,
    @Query('age') age: string,
    @Query('price') price: string,
    @Query('tags') tags?: string[] | string,
    @Query('facilities') facilities?: string[] | string,
    @Query('distance') distance?: string,
    @Query('eventType') eventType?: string,
    @Query('date') date?: string,
  ) {
    const parsedDate = date ? new Date(date) : undefined;

    return this.eventService.searchEvent(
      name,
      age,
      price,
      tags,
      facilities,
      distance,
      eventType,
      parsedDate,
    );
  }

  @ApiOperation({
    summary:
      'Filter published events by age, category or address with pagination',
    description:
      'Parents, Admin and Organisers are able to filter published events',
  })
  @ApiOkResponse({ description: 'Ok' })
  @ApiQuery({ name: 'age', required: false, type: String })
  @ApiQuery({ name: 'category', required: false, type: String })
  @ApiQuery({ name: 'address', required: false, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiQuery({
    name: 'eventType',
    required: false,
    type: String,
    enum: EventType,
  })
  @Get('filter')
  filterByCriteria(
    @Query('age') age: string,
    @Query('category') category: string,
    @Query('address') address: string,
    @Query('page') page = 1,
    @Query('limit') limit = 10,
    @Query('eventType') eventType: string,
  ) {
    return this.eventService.filterEvent(
      age,
      category,
      address,
      page,
      limit,
      eventType,
    );
  }

  @ApiOperation({
    summary: 'view an event detail by the event id',
    description:
      'Parents, Admin and Organisers are able to find an event detail by id',
  })
  @ApiOkResponse({ description: 'Ok' })
  @ApiParam({ name: 'id' })
  @Get(':id')
  viewOneEvent(@Param('id') id: string) {
    return this.eventService.viewOneEvent(id);
  }

  @ApiOperation({
    summary: 'Update an event as admin by the event id',
    description: 'Update an event by id based on the logged in admin',
  })
  @ApiAcceptedResponse({ description: 'Accepted' })
  @ApiParam({ name: 'id' })
  @HttpCode(HttpStatus.ACCEPTED)
  @Patch('host/:id')
  @Roles(Role.Admin)
  updateEventAsAdmin(
    @Param('id') id: string,
    @GetUser() user: User,
    @Body() dto: UpdateEventDto,
  ) {
    return this.eventService.updateEventAsAdmin(id, user.id, dto);
  }

  @ApiOperation({
    summary: 'Publish a draft as an admin',
    description: 'Publish my draft as a logged in admin',
  })
  @ApiAcceptedResponse({ description: 'Accepted' })
  @ApiParam({ name: 'id' })
  @HttpCode(HttpStatus.ACCEPTED)
  @Patch('host/:id/publish')
  @Roles(Role.Admin)
  publishAdminDraftedEvent(
    @Param('id') id: string,
    @GetUser() user: User,
    @Body() dto: UpdateEventDto,
  ) {
    return this.eventService.publishAdminDraftedEvent(id, user.id, dto);
  }

  @ApiOperation({
    summary: 'Update an event as organiser by the event id',
    description: 'Update an event by id based on the logged in organiser',
  })
  @ApiAcceptedResponse({ description: 'Accepted' })
  @ApiParam({ name: 'id' })
  @HttpCode(HttpStatus.ACCEPTED)
  @Patch('organiser/:id')
  @Roles(Role.Organiser)
  // @UseInterceptors(FileInterceptor('images'))
  updateEventAsOrganiser(
    @Param('id') id: string,
    @GetUser() user: User,
    @Body() dto: UpdateEventDto,
  ) {
    return this.eventService.updateEventAsOrganiser(id, user.id, dto);
  }

  @ApiOperation({
    summary: 'soft delete an event by event ID',
    description:
      'Soft delete an event by event ID based on the logged in Organiser or Admin',
  })
  @ApiNoContentResponse({ description: 'No content' })
  @ApiParam({ name: 'id' })
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete('soft-delete/:id')
  @Roles(Role.Admin, Role.Organiser)
  softDeleteEvent(@Param('id') id: string, @GetUser() user: User) {
    if (user) return this.eventService.softDeleteEvent(id);
  }

  @ApiOperation({
    summary: 'delete an event by event ID',
    description:
      'Delete an event by event ID based on the logged in Organiser or Admin',
  })
  @ApiNoContentResponse({ description: 'No content' })
  @ApiParam({ name: 'id' })
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':id')
  @Roles(Role.Admin, Role.Organiser)
  deleteEvent(@Param('id') id: string, @GetUser() user: User) {
    if (user) return this.eventService.deleteEvent(id);
  }

  @Patch('/soft-delete/:id/restore')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Restore a soft-deleted event by admin' })
  @ApiParam({ name: 'id', type: String, description: 'Event ID' })
  @ApiResponse({
    status: 200,
    description: 'Event restored successfully',
    schema: {
      example: {
        success: true,
        message: 'Event restored successfully',
        data: {
          id: 'clxyz...',
          name: 'Sample Event',
          status: 'APPROVED',
          isPublished: true,
          // other event fields...
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Event not found' })
  async restoreSoftDeletedEvent(@Param('id') eventId: string) {
    return this.eventService.restoreSoftDeletedEvent(eventId);
  }

  @ApiOperation({
    summary: 'view all published paginated events',
    description:
      'Parents, Admin and Organisers are able to view all published paginated events',
  })
  @ApiOkResponse({ description: 'Ok' })
  @Get('/:page/:pageSize')
  findAll(@Param('page') page: string, @Param('pageSize') pageSize: string) {
    return this.eventService.viewAllEvent(parseInt(page), parseInt(pageSize));
  }
}
