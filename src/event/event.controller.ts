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
import { Role } from '../auth/enum/role.enum';

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
  @Roles(Role.Admin, Role.Vendor)
  @UseInterceptors(FileInterceptor('images'))
  create(
    @GetUser() user: User,
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
      return this.eventService.create(
        user.id,
        user.role,
        dto,
        file.originalname,
        file.buffer,
      );
    } else {
      return this.eventService.create(
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
    return this.eventService.findAll();
  }

  @ApiOperation({
    summary: 'for admin or vendors to view created events',
    description: 'Fetch all events created by the logged in Vendor or Admin',
  })
  @ApiOkResponse({ description: 'Successfull' })
  @Get('me')
  @Roles(Role.Admin, Role.Vendor)
  findMyEvents(@GetUser() user: { id: string; role: string }) {
    return this.eventService.findMyEvents(user.id, user.role);
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
  search(
    @Query('name') name: string,
    @Query('age') age: string,
    @Query('price') price: string,
  ) {
    return this.eventService.search(name, age, price);
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
    return this.eventService.filter(age, category, address);
  }

  @ApiOperation({
    summary: 'find an event by the event id',
    description: 'Parents, Admin and Vendors are able to find an event by id',
  })
  @ApiOkResponse({ description: 'Successfull' })
  @ApiParam({ name: 'id' })
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.eventService.findOne(id);
  }

  @ApiOperation({
    summary: 'Update an event by the event id',
    description: 'Update an event by id based on the logged in Vendor or Admin',
  })
  @ApiAcceptedResponse({ description: 'Data accepted' })
  @ApiParam({ name: 'id' })
  @HttpCode(HttpStatus.ACCEPTED)
  @Patch(':id')
  @Roles(Role.Admin, Role.Vendor)
  @UseInterceptors(FileInterceptor('images'))
  update(
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
      return this.eventService.update(
        id,
        user.id,
        user.role,
        dto,
        file.originalname,
        file.buffer,
      );
    } else {
      return this.eventService.update(id, user.id, user.role, dto);
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
  @Roles(Role.Admin, Role.Vendor)
  remove(@Param('id') id: string, @GetUser() user: User) {
    return this.eventService.remove(id, user.id, user.role);
  }
}
