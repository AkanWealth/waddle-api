import { Controller, Get, Param } from '@nestjs/common';
import { LocationService } from './location.service';
import {
  ApiInternalServerErrorResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
} from '@nestjs/swagger';

@ApiInternalServerErrorResponse({ description: 'Internal Server Error' })
@Controller('location')
export class LocationController {
  constructor(private readonly locationService: LocationService) {}

  @ApiOperation({
    summary: 'validate the provided address on google',
    description: 'Validate the provided address on google during registration ',
  })
  @ApiOkResponse({ description: 'Successfull' })
  @ApiParam({ name: 'address' })
  @Get(':address')
  verifyLocation(@Param('address') address: string) {
    return this.locationService.verifyLocation(address);
  }

  @ApiOperation({
    summary: 'view the distance of the event',
    description: 'View the distance of the event from your location',
  })
  @ApiOkResponse({ description: 'Successfull' })
  @ApiParam({ name: 'origin' })
  @ApiParam({ name: 'destination' })
  @Get('distance/:origin/:destination')
  calculateDistance(
    @Param('origin') origin: string,
    @Param('destination') destination: string,
  ) {
    return this.locationService.calculateDistance(origin, destination);
  }
}
