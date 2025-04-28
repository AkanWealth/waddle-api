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
  Post,
} from '@nestjs/common';
import { VendorService } from './vendor.service';
import { CreateVendorStaffDto, UpdateVendorDto } from './dto';
import {
  ApiAcceptedResponse,
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiInternalServerErrorResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { User } from '@prisma/client';
import { JwtGuard } from '../auth/guard';
import { GetUser } from '../auth/decorator';
import { FileInterceptor } from '@nestjs/platform-express';
import { RolesGuard } from '../auth/guard/role.guard';
import { Roles } from '../auth/decorator/role-decorator';
import { UpdatePasswordDto } from '../user/dto/update-password.dto';
import { AdminRole, VendorRole } from 'src/auth/enum';

@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Unathorized' })
@ApiInternalServerErrorResponse({ description: 'Internal Server error' })
@UseGuards(JwtGuard, RolesGuard)
@Controller('vendors')
export class VendorController {
  constructor(private vendorService: VendorService) {}

  // Start Vendor
  @ApiOperation({
    summary: 'view all vendors as an admin',
    description: 'Admin can view all vendors',
  })
  @ApiOkResponse({ description: 'Successfull' })
  @Get('all')
  @Roles(AdminRole.Admin || AdminRole.Editor || AdminRole.Viewer)
  viewAllVendor(@GetUser() admin: User) {
    return this.vendorService.viewAllVendor();
  }

  @ApiOperation({
    summary: 'view my details as a loggedin vendor',
    description: 'Vendor can view their details',
  })
  @ApiOkResponse({ description: 'Successfull' })
  @Get('me')
  @Roles(VendorRole.Vendor)
  viewMe(@GetUser() vendor: User) {
    return this.vendorService.viewMe(vendor.id);
  }

  @ApiOperation({
    summary: 'update my details as a loggedin vendor',
    description: 'Vendor can update their details',
  })
  @ApiAcceptedResponse({ description: 'Successfully updated' })
  @HttpCode(HttpStatus.ACCEPTED)
  @Patch('me')
  @Roles(VendorRole.Vendor || VendorRole.Representative || VendorRole.Support)
  @UseInterceptors(FileInterceptor('business_logo'))
  updateProfile(
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
      return this.vendorService.updateProfile(
        id,
        dto,
        file.originalname,
        file.buffer,
      );
    } else {
      return this.vendorService.updateProfile(id, dto);
    }
  }

  @ApiOperation({
    summary: 'update my password as a loggedin vendor',
    description: 'Vendor can update their password',
  })
  @ApiAcceptedResponse({ description: 'Successfully updated' })
  @ApiBearerAuth()
  @HttpCode(HttpStatus.ACCEPTED)
  @Patch('me/password')
  @Roles(VendorRole.Vendor || VendorRole.Representative || VendorRole.Support)
  updatePassword(@GetUser('id') id: string, @Body() dto: UpdatePasswordDto) {
    return this.vendorService.updatePassword(id, dto);
  }

  @ApiOperation({
    summary: 'delete a vendor temporarily',
    description: 'Admin can delete a vendor by id',
  })
  @ApiNoContentResponse({ description: 'Deleted Successfully' })
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete('temp/:id')
  @Roles(AdminRole.Admin)
  deleteVendorTemp(@GetUser() admin: User, @Param('id') id: string) {
    return this.vendorService.deleteVendorTemp(id);
  }

  @ApiOperation({
    summary: 'delete a vendor permanently',
    description: 'Admin can delete a vendor by id permanently',
  })
  @ApiNoContentResponse({ description: 'Deleted Successfully' })
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':id')
  @Roles(AdminRole.Admin)
  deleteVendor(@GetUser() admin: User, @Param('id') id: string) {
    return this.vendorService.deleteVendor(id);
  }
  // End Vendor

  // Start Staff
  @ApiOperation({
    summary: 'create a staff',
    description: 'Create a staff as a loggedin vendor',
  })
  @ApiCreatedResponse({ description: 'Created' })
  @ApiBadRequestResponse({ description: 'Bad request' })
  @Post('staffs')
  @Roles(VendorRole.Vendor)
  createStaff(@GetUser() user: User, @Body() dto: CreateVendorStaffDto) {
    return this.vendorService.createStaff(user.id, dto);
  }

  @ApiOperation({
    summary: 'view all staff',
    description: 'View all staff as a loggedin vendor',
  })
  @ApiOkResponse({ description: 'Ok' })
  @ApiNotFoundResponse({ description: 'Not found' })
  @Get('staffs')
  @Roles(VendorRole.Vendor)
  viewAllStaff(@GetUser() user: User) {
    return this.vendorService.viewAllStaff(user.id);
  }

  @ApiOperation({
    summary: 'view a staff',
    description: 'View a staff by ID as a loggedin vendor',
  })
  @ApiOkResponse({ description: 'Ok' })
  @ApiNotFoundResponse({ description: 'Not found' })
  @Get('staffs/:id')
  @Roles(VendorRole.Vendor || VendorRole.Representative || VendorRole.Support)
  viewStaff(@GetUser() user: User, @Param('id') id: string) {
    return this.vendorService.viewStaff(user.id, id);
  }

  @ApiOperation({
    summary: 'delete a staff temporarily',
    description: 'Delete a staff by ID temporarily as a loggedin vendor',
  })
  @ApiNoContentResponse({ description: 'No content' })
  @ApiNotFoundResponse({ description: 'Not found' })
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete('staffs/temp/:id')
  @Roles(VendorRole.Vendor)
  deleteStaffTemp(@GetUser() user: User, @Param('id') id: string) {
    return this.vendorService.deleteStaffTemp(user.id, id);
  }

  @ApiOperation({
    summary: 'delete a staff permanently',
    description: 'Delete a staff by ID permanently as a loggedin vendor',
  })
  @ApiNoContentResponse({ description: 'No content' })
  @ApiNotFoundResponse({ description: 'Not found' })
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete('staffs/:id')
  @Roles(VendorRole.Vendor)
  deleteStaff(@GetUser() user: User, @Param('id') id: string) {
    return this.vendorService.deleteStaff(user.id, id);
  }
  // End Staff
}
