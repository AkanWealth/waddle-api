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
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { User } from '@prisma/client';
import { JwtGuard } from '../auth/guard/auth.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import { RolesGuard } from '../auth/guard/role.guard';
import { Roles } from '../auth/decorator/role-decorator';
import { AdminRole, OrganiserRole } from 'src/auth/enum';

@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Unauthorized' })
@ApiInternalServerErrorResponse({ description: 'Internal Server Error' })
@UseGuards(JwtGuard, RolesGuard)
@Controller('events')
export class EventController {
  constructor(private readonly eventService: EventService) {}

  @ApiOperation({
    summary: 'create an event by admin and vendor',
    description: 'Create an event by the main admin or vendor',
  })
  @ApiCreatedResponse({ description: 'Created' })
  @Post()
  @Roles(AdminRole.Admin, AdminRole.Editor, OrganiserRole.Organiser)
  @UseInterceptors(FileInterceptor('images'))
  createEvent(
    @GetUser() user: { id: string; role: string },
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
      return this.eventService.createEvent(
        user.id,
        user.role,
        dto,
        file.originalname,
        file.buffer,
      );
    } else {
      return this.eventService.createEvent(
        user.id,
        user.role,
        dto,
        file?.originalname,
        file?.buffer,
      );
    }
  }

  @ApiOperation({
    summary: 'create an event as vendor staff',
    description: 'Create an event as a staff of the vendor',
  })
  @ApiCreatedResponse({ description: 'Created' })
  @Post('vendor-staff')
  @Roles(OrganiserRole.Manager)
  @UseInterceptors(FileInterceptor('images'))
  createEventByStaff(
    @GetUser() user: { id: string; role: string },
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
      return this.eventService.createEventByStaff(
        user.id,
        user.role,
        dto,
        file.originalname,
        file.buffer,
      );
    } else {
      return this.eventService.createEventByStaff(
        user.id,
        user.role,
        dto,
        file?.originalname,
        file?.buffer,
      );
    }
  }

  @ApiOperation({
    summary: 'view all published events',
    description:
      'Parents, Admin and Organisers are able to view all published events',
  })
  @ApiOkResponse({ description: 'Ok' })
  @Get()
  findAll() {
    return this.eventService.viewAllEvent();
  }

  @ApiOperation({
    summary: 'view created events by admin or vendor',
    description: 'View all events created by the logged in vendor or admin',
  })
  @ApiOkResponse({ description: 'Ok' })
  @Get('me')
  @Roles(AdminRole.Admin, OrganiserRole.Organiser)
  viewMyEvents(@GetUser() user: { id: string }) {
    return this.eventService.viewMyEvents(user.id);
  }

  @ApiOperation({
    summary: 'view created events by admin or vendor staff',
    description:
      'View all events created by the logged in vendor or admin staff',
  })
  @ApiOkResponse({ description: 'Ok' })
  @Get('me/staff')
  @Roles(AdminRole.Editor, OrganiserRole.Manager)
  viewEventsByStaff(@GetUser() user: { id: string }) {
    return this.eventService.viewEventsByStaff(user.id);
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
  @Get('search')
  searchEvent(
    @Query('name') name: string,
    @Query('age') age: string,
    @Query('price') price: string,
  ) {
    return this.eventService.searchEvent(name, age, price);
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
    summary: 'Update an event by the event id',
    description: 'Update an event by id based on the logged in vendor or admin',
  })
  @ApiAcceptedResponse({ description: 'Accepted' })
  @ApiParam({ name: 'id' })
  @HttpCode(HttpStatus.ACCEPTED)
  @Patch(':id')
  @Roles(AdminRole.Admin, OrganiserRole.Organiser)
  @UseInterceptors(FileInterceptor('images'))
  updateEvent(
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
      return this.eventService.updateEvent(
        id,
        user.id,
        dto,
        file.originalname,
        file.buffer,
      );
    } else {
      return this.eventService.updateEvent(id, user.id, dto);
    }
  }

  @ApiOperation({
    summary: 'Update an event as vendor staff by the event ID',
    description: 'Update an event by ID as a logged in vendor staff',
  })
  @ApiAcceptedResponse({ description: 'Accepted' })
  @ApiParam({ name: 'id' })
  @HttpCode(HttpStatus.ACCEPTED)
  @Patch('vendor-staff/:id')
  @Roles(AdminRole.Editor, OrganiserRole.Manager)
  @UseInterceptors(FileInterceptor('images'))
  updateEventByStaff(
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
      return this.eventService.updateEventByStaff(
        id,
        user.id,
        dto,
        file.originalname,
        file.buffer,
      );
    } else {
      return this.eventService.updateEventByStaff(id, user.id, dto);
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
  @Roles(AdminRole.Admin, OrganiserRole.Organiser)
  deleteEvent(@Param('id') id: string, @GetUser() user: User) {
    return this.eventService.deleteEvent(id, user.id);
  }
}
