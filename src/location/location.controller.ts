import { Controller, Get, Param, Query } from '@nestjs/common';
import { LocationService } from './location.service';
import {
  ApiInternalServerErrorResponse,
  ApiOkResponse,
  ApiParam,
} from '@nestjs/swagger';

@ApiInternalServerErrorResponse({ description: 'Internal Server Error' })
@Controller('location')
export class LocationController {
  constructor(private readonly locationService: LocationService) {}

  @ApiOkResponse({ description: 'Successfull' })
  @ApiParam({ name: 'address' })
  @Get(':address')
  verifyLocation(@Param('address') address: string) {
    return this.locationService.verifyLocation(address);
  }

  @ApiOkResponse({ description: 'Successfull' })
  @ApiParam({ name: 'parameter1' })
  @ApiParam({ name: 'parameter2' })
  @Get('distance/:parameter1/:parameter2')
  calculateDistance(
    @Param('parameter1') parameter1: string,
    @Param('parameter2') parameter2: string,
  ) {
    return this.locationService.calculateDistance(parameter1, parameter2);
  }
}
