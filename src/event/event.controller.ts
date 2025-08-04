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
} from '@nestjs/common';
import { EventService } from './event.service';
import { CreateEventDto, UpdateEventDto } from './dto';
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
import { User } from '@prisma/client';
import { JwtGuard } from '../auth/guard/auth.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import { RolesGuard } from '../auth/guard/role.guard';
import { Roles } from '../auth/decorator/role-decorator';
import { Role } from '../auth/enum';
import { EventStatus } from 'src/utils/constants/eventTypes';

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
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.eventService.createEventByAdmin(
      user.id,
      dto,
      file?.originalname,
      file?.buffer,
    );
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
      return this.eventService.draftsEventByAdmin(
        user.id,
        dto,
        file.originalname,
        file.buffer,
      );
    } else {
      return this.eventService.draftsEventByAdmin(
        user.id,
        dto,
        file?.originalname,
        file?.buffer,
      );
    }
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
    summary: 'view all published paginated events',
    description:
      'Parents, Admin and Organisers are able to view all published paginated events',
  })
  @ApiOkResponse({ description: 'Ok' })
  @Get('/:page/:pageSize')
  findAll(@Param('page') page: string, @Param('pageSize') pageSize: string) {
    return this.eventService.viewAllEvent(parseInt(page), parseInt(pageSize));
  }

  @ApiOperation({
    summary: 'view all published paginated events as an admin ',
    description:
      'Parents, Admin and Organisers are able to view all published paginated events as admin',
  })
  @ApiOkResponse({ description: 'Ok' })
  @Get('/admin')
  findAllAdmin() {
    return this.eventService.viewAllEventAdmin();
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
  @Get('search')
  searchEvent(
    @Query('name') name: string,
    @Query('age') age: string,
    @Query('price') price: string,
    @Query('tags') tags?: string[] | string,
    @Query('facilities') facilities?: string[] | string,
    @Query('distance') distance?: string,
  ) {
    return this.eventService.searchEvent(
      name,
      age,
      price,
      tags,
      facilities,
      distance,
    );
  }

  @ApiOperation({
    summary: 'filter published events by age,category or address',
    description:
      'Parents, Admin and Organisers are able to filter published events',
  })
  @ApiOkResponse({ description: 'Ok' })
  @ApiQuery({ name: 'age', required: false, type: String })
  @ApiQuery({ name: 'category', required: false, type: String })
  @ApiQuery({ name: 'address', required: false, type: String })
  @Get('filter')
  filterByCriteria(
    @Query('age') age: string,
    @Query('category') category: string,
    @Query('address') address: string,
  ) {
    return this.eventService.filterEvent(age, category, address);
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
  @UseInterceptors(FileInterceptor('images'))
  updateEventAsAdmin(
    @Param('id') id: string,
    @GetUser() user: User,
    @Body() dto: UpdateEventDto,
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
      return this.eventService.updateEventAsAdmin(
        id,
        user.id,
        dto,
        file.originalname,
        file.buffer,
      );
    } else {
      return this.eventService.updateEventAsAdmin(id, user.id, dto);
    }
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
  @UseInterceptors(FileInterceptor('images'))
  updateEventAsOrganiser(
    @Param('id') id: string,
    @GetUser() user: User,
    @Body() dto: UpdateEventDto,
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
      return this.eventService.updateEventAsOrganiser(
        id,
        user.id,
        dto,
        file.originalname,
        file.buffer,
      );
    } else {
      return this.eventService.updateEventAsOrganiser(id, user.id, dto);
    }
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
}
