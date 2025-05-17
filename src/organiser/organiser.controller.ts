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
import { OrganiserService } from './organiser.service';
import { UpdateOrganiserDto } from './dto';
import {
  ApiAcceptedResponse,
  ApiBearerAuth,
  ApiBody,
  ApiInternalServerErrorResponse,
  ApiNoContentResponse,
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
import { Role } from 'src/auth/enum';

@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Unathorized' })
@ApiInternalServerErrorResponse({ description: 'Internal Server error' })
@UseGuards(JwtGuard, RolesGuard)
@Controller('organisers')
export class OrganiserController {
  constructor(private organiserService: OrganiserService) {}

  // Start Organiser
  @ApiOperation({
    summary: 'save my fcm token as a loggedin organiser',
    description: 'Save my fcm token as a loggedin organiser',
  })
  @ApiBody({
    description: 'Device ID',
    type: String,
    required: true,
    schema: {
      properties: {
        token: {
          example: 'your-device-id',
        },
      },
    },
  })
  @ApiOkResponse({ description: 'Ok' })
  @HttpCode(HttpStatus.OK)
  @Post('me')
  saveOrganiserFcmToken(
    @GetUser('id') id: string,
    @Body('token') token: string,
  ) {
    return this.organiserService.saveOrganiserFcmToken(id, token);
  }
  @ApiOperation({
    summary: 'view all organisers as an admin',
    description: 'Admin can view all organisers',
  })
  @ApiOkResponse({ description: 'Ok' })
  @Get('all')
  @Roles(Role.Admin)
  viewAllOrganiser(@GetUser() admin: User) {
    if (admin) return this.organiserService.viewAllOrganiser();
  }

  @ApiOperation({
    summary: 'view my details as a loggedin organiser',
    description: 'Organiser can view their details',
  })
  @ApiOkResponse({ description: 'Ok' })
  @Get('me')
  @Roles(Role.Organiser)
  viewMe(@GetUser() organiser: User) {
    return this.organiserService.viewMe(organiser.id);
  }

  @ApiOperation({
    summary: 'update my details as a loggedin organiser',
    description: 'Organiser can update their details',
  })
  @ApiAcceptedResponse({ description: 'Accepted' })
  @HttpCode(HttpStatus.ACCEPTED)
  @Patch('me')
  @Roles(Role.Organiser)
  @UseInterceptors(FileInterceptor('business_logo'))
  updateProfile(
    @GetUser('id') id: string,
    @Body() dto: UpdateOrganiserDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (file) {
      try {
        new ParseFilePipe({
          validators: [
            new MaxFileSizeValidator({ maxSize: 5000000 }),
            new FileTypeValidator({ fileType: 'image/*' }),
          ],
        }).transform(file);
      } catch (error) {
        throw error;
      }
      return this.organiserService.updateProfile(
        id,
        dto,
        file.originalname,
        file.buffer,
      );
    } else {
      return this.organiserService.updateProfile(id, dto);
    }
  }

  @ApiOperation({
    summary: 'update my password as a loggedin organiser',
    description: 'Organiser can update their password',
  })
  @ApiAcceptedResponse({ description: 'Accepted' })
  @ApiBearerAuth()
  @HttpCode(HttpStatus.ACCEPTED)
  @Patch('me/password')
  @Roles(Role.Organiser)
  updatePassword(@GetUser('id') id: string, @Body() dto: UpdatePasswordDto) {
    return this.organiserService.updatePassword(id, dto);
  }

  @ApiOperation({
    summary: 'delete a organiser temporarily',
    description: 'Admin can delete a organiser by id',
  })
  @ApiNoContentResponse({ description: 'No content' })
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete('temp/:id')
  @Roles(Role.Admin)
  deleteOrganiserTemp(@GetUser() admin: User, @Param('id') id: string) {
    if (admin) return this.organiserService.deleteOrganiserTemp(id);
  }

  @ApiOperation({
    summary: 'delete a organiser permanently',
    description: 'Admin can delete a organiser by id permanently',
  })
  @ApiNoContentResponse({ description: 'No content' })
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':id')
  @Roles(Role.Admin)
  deleteOrganiser(@GetUser() admin: User, @Param('id') id: string) {
    if (admin) return this.organiserService.deleteOrganiser(id);
  }
  // End Organiser

  // Start Staff
  // @ApiOperation({
  //   summary: 'create a staff',
  //   description: 'Create a staff as a loggedin organiser',
  // })
  // @ApiCreatedResponse({ description: 'Created' })
  // @ApiBadRequestResponse({ description: 'Bad request' })
  // @Post('staffs')
  // @Roles(Role.Organiser)
  // createStaff(@GetUser() user: User, @Body() dto: CreateOrganiserStaffDto) {
  //   return this.organiserService.createStaff(user.id, dto);
  // }

  // @ApiOperation({
  //   summary: 'send staff invite',
  //   description: 'Send staff invite as a loggedin organiser',
  // })
  // @ApiOkResponse({ description: 'Ok' })
  // @ApiBadRequestResponse({ description: 'Bad request' })
  // @HttpCode(HttpStatus.OK)
  // @Post('staffs/:id')
  // @Roles(Role.Organiser)
  // sendInvite(@GetUser() user: User, @Param('id') id: string) {
  //   if (user) return this.organiserService.sendInvite(id);
  // }

  // @ApiOperation({
  //   summary: 'view all staff',
  //   description: 'View all staff as a loggedin organiser',
  // })
  // @ApiOkResponse({ description: 'Ok' })
  // @ApiNotFoundResponse({ description: 'Not found' })
  // @Get('staffs')
  // @Roles(Role.Organiser)
  // viewAllStaff(@GetUser() user: User) {
  //   return this.organiserService.viewAllStaff(user.id);
  // }

  // @ApiOperation({
  //   summary: 'view a staff',
  //   description: 'View a staff by ID as a loggedin organiser',
  // })
  // @ApiOkResponse({ description: 'Ok' })
  // @ApiNotFoundResponse({ description: 'Not found' })
  // @Get('staffs/:id')
  // @Roles(Role.Organiser || Role.Manager)
  // viewStaff(@GetUser() user: User, @Param('id') id: string) {
  //   return this.organiserService.viewStaff(user.id, id);
  // }

  // @ApiOperation({
  //   summary: 'delete a staff temporarily',
  //   description: 'Delete a staff by ID temporarily as a loggedin organiser',
  // })
  // @ApiNoContentResponse({ description: 'No content' })
  // @ApiNotFoundResponse({ description: 'Not found' })
  // @HttpCode(HttpStatus.NO_CONTENT)
  // @Delete('staffs/temp/:id')
  // @Roles(Role.Organiser)
  // deleteStaffTemp(@GetUser() user: User, @Param('id') id: string) {
  //   return this.organiserService.deleteStaffTemp(user.id, id);
  // }

  // @ApiOperation({
  //   summary: 'delete a staff permanently',
  //   description: 'Delete a staff by ID permanently as a loggedin organiser',
  // })
  // @ApiNoContentResponse({ description: 'No content' })
  // @ApiNotFoundResponse({ description: 'Not found' })
  // @HttpCode(HttpStatus.NO_CONTENT)
  // @Delete('staffs/:id')
  // @Roles(Role.Organiser)
  // deleteStaff(@GetUser() user: User, @Param('id') id: string) {
  //   return this.organiserService.deleteStaff(user.id, id);
  // }
  // End Staff
}
