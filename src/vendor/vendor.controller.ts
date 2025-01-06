import {
  Controller,
  Get,
  Body,
  Patch,
  Delete,
  UseGuards,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { VendorService } from './vendor.service';
import { UpdateVendorDto } from './dto';
import {
  ApiAcceptedResponse,
  ApiBearerAuth,
  ApiInternalServerErrorResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { User } from '@prisma/client';
import { JwtGuard } from '../auth/guard';
import { GetUser } from '../auth/decorator';

@ApiUnauthorizedResponse({
  description: 'The vendor is not unathorized to perform this action',
})
@ApiInternalServerErrorResponse({ description: 'Internal Server error' })
@UseGuards(JwtGuard)
@Controller('vendors')
export class VendorController {
  constructor(private vendorService: VendorService) {}

  // get all vendor
  @ApiOkResponse({ description: 'Successfull' })
  @ApiBearerAuth()
  @Get('all')
  findAll() {
    try {
      return this.vendorService.findAll();
    } catch (error) {
      throw error;
    }
  }

  // get the loggedin vendor
  @ApiOkResponse({ description: 'Successfull' })
  @ApiBearerAuth()
  @Get('me')
  findOne(@GetUser() vendor: User) {
    try {
      return vendor;
    } catch (error) {
      throw error;
    }
  }

  // update the loggedin vendor
  @ApiAcceptedResponse({ description: 'Successfully updated' })
  @ApiBearerAuth()
  @HttpCode(HttpStatus.ACCEPTED)
  @Patch('me')
  update(@GetUser('id') id: string, @Body() dto: UpdateVendorDto) {
    return this.vendorService.update(id, dto);
  }

  // delete a vendor
  @ApiNoContentResponse({ description: 'Deleted Successfully' })
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':id')
  removeOne(@Param('id') id: string) {
    return this.vendorService.removeOne(id);
  }
}
