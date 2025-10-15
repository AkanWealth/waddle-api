import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiQuery, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { GuestService } from './guest.service';

@ApiTags('Guest Activities') // Swagger group name
@Controller('guest')
export class GuestController {
  constructor(private readonly guestService: GuestService) {}

  @Get('activities')
  @ApiOperation({
    summary: 'Fetch guest activities',
    description:
      'Returns a paginated list of upcoming events, crowdsourced events, and places available to guests.',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'pageSize', required: false, type: Number, example: 10 })
  @ApiResponse({
    status: 200,
    description: 'Successfully retrieved paginated guest activities.',
  })
  @ApiResponse({
    status: 404,
    description: 'No items found for the given page.',
  })
  async getGuestActivities(
    @Query('page') page = 1,
    @Query('pageSize') pageSize = 10,
  ) {
    return this.guestService.guestActivities(Number(page), Number(pageSize));
  }
}
