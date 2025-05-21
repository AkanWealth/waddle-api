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
import { UserService } from './user.service';
import { UpdatePasswordDto, UpdateUserDto } from './dto';
import {
  ApiAcceptedResponse,
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
import { FileInterceptor } from '@nestjs/platform-express';
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
  @Post('me')
  saveUserFcmToken(@GetUser('id') id: string, @Body('token') token: string) {
    return this.userService.saveUserFcmToken(id, token);
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
  @UseInterceptors(FileInterceptor('profile_picture'))
  update(
    @GetUser('id') id: string,
    @Body() dto: UpdateUserDto,
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
      return this.userService.update(id, dto, file.originalname, file.buffer);
    } else {
      return this.userService.update(id, dto);
    }
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
}
