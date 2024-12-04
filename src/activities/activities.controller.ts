import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { ActivitiesService } from './activities.service';
import { CreateActivitiesDto, UpdateActivitiesDto } from './dto';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiParam,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

@ApiBearerAuth()
@ApiUnauthorizedResponse({
  description: 'The user is not unathorized to perform this action',
})
@ApiOkResponse({ description: 'Successfull' })
@Controller('activities')
export class ActivitiesController {
  constructor(private readonly activitiesService: ActivitiesService) {}

  @Post()
  create(@Body() dto: CreateActivitiesDto) {
    return this.activitiesService.create(dto);
  }

  @Get()
  findAll() {
    return this.activitiesService.findAll();
  }

  @ApiParam({ name: 'id' })
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.activitiesService.findOne(id);
  }

  @ApiParam({ name: 'id' })
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateActivitiesDto) {
    return this.activitiesService.update(id, dto);
  }

  @ApiParam({ name: 'id' })
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.activitiesService.remove(id);
  }
}
