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
import { ActivitiesService } from './activities.service';
import { CreateActivitiesDto, UpdateActivitiesDto } from './dto';
import { GetUser } from '../auth/decorator/get-user.decorator';
import {
  ApiAcceptedResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiInternalServerErrorResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiParam,
  ApiQuery,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Vendor } from '@prisma/client';
import { JwtGuard } from '../auth/guard/auth.guard';
import { FileInterceptor } from '@nestjs/platform-express';

@ApiBearerAuth()
@ApiUnauthorizedResponse({
  description: 'The user is not unathorized to perform this action',
})
@ApiInternalServerErrorResponse({ description: 'Internal Server Error' })
@UseGuards(JwtGuard)
@Controller('activities')
export class ActivitiesController {
  constructor(private readonly activitiesService: ActivitiesService) {}

  @ApiCreatedResponse({ description: 'Created Successfull' })
  @Post()
  @UseInterceptors(FileInterceptor('images'))
  create(
    @GetUser() vendor: Vendor,
    @Body() dto: CreateActivitiesDto,
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
      return this.activitiesService.create(
        vendor.id,
        dto,
        file.originalname,
        file.buffer,
      );
    } else {
      return this.activitiesService.create(
        vendor.id,
        dto,
        file?.originalname,
        file?.buffer,
      );
    }
  }

  @ApiOkResponse({ description: 'Successfull' })
  @Get()
  findAll() {
    return this.activitiesService.findAll();
  }

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
    return this.activitiesService.search(name, age, price);
  }

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
    return this.activitiesService.filter(age, category, address);
  }

  @ApiOkResponse({ description: 'Successfull' })
  @ApiParam({ name: 'id' })
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.activitiesService.findOne(id);
  }

  @ApiAcceptedResponse({ description: 'Data accepted' })
  @ApiParam({ name: 'id' })
  @HttpCode(HttpStatus.ACCEPTED)
  @Patch(':id')
  @UseInterceptors(FileInterceptor('images'))
  update(
    @Param('id') id: string,
    @Body() dto: UpdateActivitiesDto,
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
      return this.activitiesService.update(
        id,
        dto,
        file.originalname,
        file.buffer,
      );
    } else {
      return this.activitiesService.update(id, dto);
    }
  }

  @ApiNoContentResponse({ description: 'Deleted successfully' })
  @ApiParam({ name: 'id' })
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.activitiesService.remove(id);
  }
}
