import {
  Controller,
  Get,
  Body,
  Patch,
  Delete,
  UseGuards,
  Param,
} from '@nestjs/common';
import { UserService } from './user.service';
import { UpdateUserDto } from './dto';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { User } from '@prisma/client';
import { JwtGuard } from '../auth/guard';
import { GetUser } from '../auth/decorator';

@ApiUnauthorizedResponse({
  description: 'The user is not unathorized to perform this action',
})
@ApiOkResponse({ description: 'Successfull' })
@UseGuards(JwtGuard)
@Controller('users')
export class UserController {
  constructor(private userService: UserService) {}

  // get all user
  @ApiBearerAuth()
  @Get('all')
  findAll() {
    try {
      return this.userService.findAll();
    } catch (error) {
      throw error;
    }
  }

  // get the loggedin user
  @ApiBearerAuth()
  @Get('me')
  findOne(@GetUser() user: User) {
    try {
      return user;
    } catch (error) {
      throw error;
    }
  }

  // update the loggedin user
  @ApiBearerAuth()
  @Patch('me')
  update(@GetUser('id') id: string, @Body() dto: UpdateUserDto) {
    return this.userService.update(id, dto);
  }

  // // delete the loggedin user
  // @Delete('me')
  // remove(@GetUser('id') id: string) {
  //   return this.userService.remove(id);
  // }

  // delete a user
  @ApiBearerAuth()
  @Delete(':id')
  removeOne(@Param('id') id: string) {
    return this.userService.removeOne(id);
  }
}
