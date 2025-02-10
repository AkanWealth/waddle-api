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
import { UserService } from './user.service';
import { UpdateUserDto } from './dto';
import {
  ApiAcceptedResponse,
  ApiBearerAuth,
  ApiInternalServerErrorResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
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

@ApiUnauthorizedResponse({
  description: 'The user is not unathorized to perform this action',
})
@ApiInternalServerErrorResponse({ description: 'Internal Server error' })
@UseGuards(JwtGuard, RolesGuard)
@Controller('users')
export class UserController {
  constructor(private userService: UserService) {}

  // get all user
  @ApiOkResponse({ description: 'Successfull' })
  @ApiBearerAuth()
  @Get('all')
  @Roles(Role.Admin)
  findAll() {
    return this.userService.findAll();
  }

  // get the loggedin user
  @ApiOkResponse({ description: 'Successfull' })
  @ApiBearerAuth()
  @Get('me')
  @Roles(Role.User)
  findOne(@GetUser() user: User) {
    return this.userService.findMe(user.id);
  }

  // update the loggedin user
  @ApiAcceptedResponse({ description: 'Successfully updated' })
  @ApiBearerAuth()
  @HttpCode(HttpStatus.ACCEPTED)
  @Patch('me')
  @Roles(Role.User)
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
            new MaxFileSizeValidator({ maxSize: 10000000 }),
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

  // delete a user
  @ApiNoContentResponse({ description: 'Deleted Successfully' })
  @ApiNotFoundResponse({ description: 'Not found' })
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':id')
  @Roles(Role.Admin)
  removeOne(@Param('id') id: string) {
    return this.userService.removeOne(id);
  }
}
