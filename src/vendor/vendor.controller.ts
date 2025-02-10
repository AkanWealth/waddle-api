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
import { RolesGuard } from '../auth/guard/role.guard';
import { Roles } from '../auth/decorator/role-decorator';
import { Role } from '../auth/enum/role.enum';

@ApiBearerAuth()
@ApiUnauthorizedResponse({
  description: 'The vendor is not unathorized to perform this action',
})
@ApiInternalServerErrorResponse({ description: 'Internal Server error' })
@UseGuards(JwtGuard, RolesGuard)
@Controller('vendors')
export class VendorController {
  constructor(private vendorService: VendorService) {}

  // get all vendor
  @ApiOkResponse({ description: 'Successfull' })
  @Get('all')
  @Roles(Role.Admin)
  findAll() {
    return this.vendorService.findAll();
  }

  // get the loggedin vendor
  @ApiOkResponse({ description: 'Successfull' })
  @Get('me')
  @Roles(Role.Vendor)
  findOne(@GetUser() vendor: User) {
    return this.vendorService.findMe(vendor.id);
  }

  // update the loggedin vendor
  @ApiAcceptedResponse({ description: 'Successfully updated' })
  @HttpCode(HttpStatus.ACCEPTED)
  @Patch('me')
  @Roles(Role.Vendor)
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
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':id')
  @Roles(Role.Admin)
  removeOne(@Param('id') id: string) {
    return this.vendorService.removeOne(id);
  }
}
