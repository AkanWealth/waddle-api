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
import { User, VendorRole } from '@prisma/client';
import { JwtGuard } from '../auth/guard/auth.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import { RolesGuard } from '../auth/guard/role.guard';
import { Roles } from '../auth/decorator/role-decorator';
import { AdminRole } from 'src/auth/enum';

@ApiBearerAuth()
@ApiUnauthorizedResponse({
  description: 'The user is not unathorized to perform this action',
})
@ApiInternalServerErrorResponse({ description: 'Internal Server Error' })
@UseGuards(JwtGuard, RolesGuard)
@Controller('events')
export class EventController {
  constructor(private readonly eventService: EventService) {}

  @ApiOperation({
    summary: 'for admin and vendor',
    description: 'Admin or Vendor creates an event',
  })
  @ApiCreatedResponse({ description: 'Created Successfull' })
  @Post()
  @Roles(AdminRole.Admin, AdminRole.Editor, VendorRole.Vendor, VendorRole.Representative)
  @UseInterceptors(FileInterceptor('images'))
  create(
    @GetUser() user: {id: string, role: string},
    @Body() dto: CreateEventDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (file) {
      try {
        new ParseFilePipe({
          validators: [
            new MaxFileSizeValidator({ maxSize: 10000000 }),
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
    summary: 'for all published events',
    description:
      'Parents, Admin and Vendors are able to see all published events',
  })
  @ApiOkResponse({ description: 'Successfull' })
  @Get()
  findAll() {
    return this.eventService.viewAllEvent();
  }

  @ApiOperation({
    summary: 'for admin or vendors to view created events',
    description: 'Fetch all events created by the logged in Vendor or Admin',
  })
  @ApiOkResponse({ description: 'Successfull' })
  @Get('me')
  @Roles(AdminRole.Admin, AdminRole.Editor, VendorRole.Vendor, VendorRole.Representative)
  findMyEvents(@GetUser() user: { id: string }) {
    return this.eventService.viewMyEvents(user.id);
  }

  @ApiOperation({
    summary: 'search for published events by name, age or price',
    description:
      'Parents, Admin or Vendors are able to search for published events',
  })
  @ApiOkResponse({ description: 'Successfully searched' })
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
      'Parents, Admin and Vendors are able to filter published events',
  })
  @ApiOkResponse({ description: 'Successfully filtered' })
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
    summary: 'find an event by the event id',
    description: 'Parents, Admin and Vendors are able to find an event by id',
  })
  @ApiOkResponse({ description: 'Successfull' })
  @ApiParam({ name: 'id' })
  @Get(':id')
  viewOneEvent(@Param('id') id: string) {
    return this.eventService.viewOneEvent(id);
  }

  @ApiOperation({
    summary: 'Update an event by the event id',
    description: 'Update an event by id based on the logged in Vendor or Admin',
  })
  @ApiAcceptedResponse({ description: 'Data accepted' })
  @ApiParam({ name: 'id' })
  @HttpCode(HttpStatus.ACCEPTED)
  @Patch(':id')
  @Roles(AdminRole.Admin, AdminRole.Editor, VendorRole.Vendor, VendorRole.Representative)
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
            new MaxFileSizeValidator({ maxSize: 10000000 }),
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
    summary: 'delete an event by event id',
    description:
      'Delete an event by event id based on the logged in Vendor or Admin',
  })
  @ApiNoContentResponse({ description: 'Deleted successfully' })
  @ApiParam({ name: 'id' })
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':id')
  @Roles(AdminRole.Admin, AdminRole.Editor, VendorRole.Vendor, VendorRole.Representative)
  deleteEvent(@Param('id') id: string, @GetUser() user: User) {
    return this.eventService.deleteEvent(id, user.id);
  }
}
