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
  // UseInterceptors,
  // UploadedFile,
  // ParseFilePipe,
  // MaxFileSizeValidator,
  // FileTypeValidator,
  Post,
  BadRequestException,
} from '@nestjs/common';
import { UserService } from './user.service';
import { UpdatePasswordDto, UpdateUserDto } from './dto';
import {
  ApiAcceptedResponse,
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
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
// import { FileInterceptor } from '@nestjs/platform-express';
import { RolesGuard } from '../auth/guard/role.guard';
import { Roles } from '../auth/decorator/role-decorator';
import { Role } from '../auth/enum';

@ApiBearerAuth()
@ApiUnauthorizedResponse({
  description: 'Unauthorized',
})
@ApiInternalServerErrorResponse({ description: 'Internal Server error' })
@UseGuards(JwtGuard, RolesGuard)
@Controller('users')
export class UserController {
  constructor(private userService: UserService) {}

  // save the user fcm token
  @ApiOperation({
    summary: 'save my fcm token as a loggedin user',
    description: 'Save my fcm token as a loggedin user',
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
  @Post('device-token')
  saveUserFcmToken(@GetUser('id') id: string, @Body('token') token: string) {
    return this.userService.saveUserFcmToken(id, token);
  }

  // toogle the status of push notififcation
  @ApiOperation({
    summary: 'toogle push notification for loggedin user',
    description: 'Toogle push notification for loggedin user',
  })
  @ApiOkResponse({ description: 'Ok' })
  @HttpCode(HttpStatus.OK)
  @Post('push-notification')
  tooglePushNotification(@GetUser('id') id: string) {
    return this.userService.togglePushNotififcation(id);
  }

  // get all user
  @ApiOperation({
    summary: 'view all users as an admin',
    description: 'Admin can view all users',
  })
  @ApiOkResponse({ description: 'Ok' })
  @ApiBearerAuth()
  @Get('all')
  @Roles(Role.Admin)
  findAll() {
    return this.userService.findAll();
  }

  @ApiOperation({
    summary: 'view all users as an admin',
    description: 'Admin can view all users',
  })
  @ApiOkResponse({ description: 'Ok' })
  @ApiBearerAuth()
  @Get('all-deleted')
  @Roles(Role.Admin)
  findAllDeletedUsers() {
    return this.userService.findAllDeletedUsers();
  }

  // get the loggedin user
  @ApiOperation({
    summary: 'view my details as a loggedin user',
    description: 'User can view their details',
  })
  @ApiOkResponse({ description: 'Ok' })
  @Get('me')
  findOne(@GetUser() user: User) {
    return this.userService.findMe(user.id);
  }

  // update the loggedin user
  @ApiOperation({
    summary: 'update my details as a loggedin user',
    description: 'User can update their details',
  })
  @ApiAcceptedResponse({ description: 'Accepted' })
  @HttpCode(HttpStatus.ACCEPTED)
  @Patch('me')
  update(@GetUser('id') id: string, @Body() dto: UpdateUserDto) {
    return this.userService.update(id, dto);
  }

  // update the loggedin user password
  @ApiOperation({
    summary: 'update my password as a loggedin user',
    description: 'User can update their password',
  })
  @ApiAcceptedResponse({ description: 'Accepted' })
  @HttpCode(HttpStatus.ACCEPTED)
  @Patch('me/password')
  updatePassword(@GetUser('id') id: string, @Body() dto: UpdatePasswordDto) {
    return this.userService.updatePassword(id, dto);
  }

  // delete a user temporarily
  @ApiOperation({
    summary: 'delete a user temporarily by id as an admin',
    description: 'Admin can delete a user temporarily by id',
  })
  @ApiNoContentResponse({ description: 'No content' })
  @ApiNotFoundResponse({ description: 'Not found' })
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete('temp/:id')
  @Roles(Role.Admin)
  deleteUserTemp(@Param('id') id: string) {
    return this.userService.deleteUserTemp(id);
  }

  // delete a user permanently
  @ApiOperation({
    summary: 'delete a user permanently by id as an admin',
    description: 'Admin can delete a user permanently by id',
  })
  @ApiNoContentResponse({ description: 'No content' })
  @ApiNotFoundResponse({ description: 'Not found' })
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':id')
  @Roles(Role.Admin)
  deleteUser(@Param('id') id: string) {
    return this.userService.deleteUser(id);
  }

  // restore a user
  @ApiOperation({
    summary: 'restore a user by id as an admin',
    description: 'Admin can restore a user by id',
  })
  @ApiOkResponse({ description: 'Ok' })
  @HttpCode(HttpStatus.OK)
  @Patch('restore/:id')
  @Roles(Role.Admin)
  restoreUser(@Param('id') id: string) {
    return this.userService.restoreUser(id);
  }

  // Request account deletion (sends email with JWT token)
  @ApiOperation({
    summary: 'Request account deletion',
    description:
      'Authenticated user or organiser can request account deletion. The request body should specify whether the account type is "user" or "organiser". An email with a deletion link will be sent.',
  })
  @ApiBody({
    description: 'Specify the account type making the deletion request',
    required: true,
    schema: {
      type: 'object',
      properties: {
        type: {
          type: 'string',
          enum: ['user', 'organiser'],
          example: 'user',
          description: 'Type of account requesting deletion',
        },
      },
    },
  })
  @ApiOkResponse({ description: 'Deletion email sent successfully' })
  @HttpCode(HttpStatus.OK)
  @Patch('request-deletion')
  async requestAccountDeletion(
    @GetUser('id') id: string,
    @Body('type') type: 'user' | 'organiser',
  ) {
    return this.userService.requestAccountDeletion(id, type);
  }

  // delete my account (user or organiser)
  @ApiOperation({
    summary: 'delete my account',
    description:
      'Authenticated user or organiser can permanently delete their account by specifying the account type.',
  })
  @ApiOkResponse({ description: 'Account deleted successfully' })
  @ApiBadRequestResponse({ description: 'Invalid account type' })
  @HttpCode(HttpStatus.OK)
  @Delete('me/:type')
  async deleteMyAccount(
    @GetUser('id') id: string,
    @Param('type') type: 'user' | 'organiser',
  ) {
    if (!['user', 'organiser'].includes(type)) {
      throw new BadRequestException(
        'Invalid account type. Must be user or organiser.',
      );
    }

    await this.userService.deleteMyAccount(id, type);
    return { message: `${type} account deleted successfully.` };
  }
}
