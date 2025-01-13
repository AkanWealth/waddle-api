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
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
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
import { FileInterceptor } from '@nestjs/platform-express';

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
    return this.vendorService.findAll();
  }

  // get the loggedin vendor
  @ApiOkResponse({ description: 'Successfull' })
  @ApiBearerAuth()
  @Get('me')
  findOne(@GetUser() vendor: User) {
    return this.vendorService.findMe(vendor.id);
  }

  // update the loggedin vendor
  @ApiAcceptedResponse({ description: 'Successfully updated' })
  @ApiBearerAuth()
  @HttpCode(HttpStatus.ACCEPTED)
  @Patch('me')
  @UseInterceptors(FileInterceptor('business_logo'))
  update(
    @GetUser('id') id: string,
    @Body() dto: UpdateVendorDto,
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
      return this.vendorService.update(id, dto, file.originalname, file.buffer);
    } else {
      return this.vendorService.update(id, dto);
    }
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
