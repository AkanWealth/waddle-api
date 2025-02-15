import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FavoriteService } from './favorite.service';
import { CreateFavoriteDto } from './dto/create-favorite.dto';
import { UpdateFavoriteDto } from './dto/update-favorite.dto';
import { GetUser } from 'src/auth/decorator';
import { User } from '@prisma/client';
import {
  ApiAcceptedResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiInternalServerErrorResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { JwtGuard } from '../auth/guard/auth.guard';
import { RolesGuard } from '../auth/guard/role.guard';
import { Roles } from '../auth/decorator/role-decorator';
import { Role } from '../auth/enum/role.enum';

@ApiBearerAuth()
@ApiUnauthorizedResponse({
  description: 'The user is not unathorized to perform this action',
})
@ApiInternalServerErrorResponse({ description: 'Internal server error' })
@UseGuards(JwtGuard, RolesGuard)
@Controller('favorites')
export class FavoriteController {
  constructor(private readonly favoriteService: FavoriteService) {}

  @ApiCreatedResponse({ description: 'Created Successfull' })
  @Post()
  @Roles(Role.User)
  create(@Body() dto: CreateFavoriteDto, @GetUser() user: User) {
    return this.favoriteService.create(user.id, dto);
  }

  @ApiOkResponse({ description: 'Successfull' })
  @Get()
  @Roles(Role.User)
  findAll(@GetUser() user: User) {
    return this.favoriteService.findAll(user.id);
  }

  @ApiOkResponse({ description: 'Successfull' })
  @Get(':id')
  @Roles(Role.User)
  findOne(@Param('id') id: string, @GetUser() user: User) {
    return this.favoriteService.findOne(id, user.id);
  }

  @ApiAcceptedResponse({ description: 'Data accepted' })
  @HttpCode(HttpStatus.ACCEPTED)
  @Patch(':id')
  @Roles(Role.User)
  update(
    @Param('id') id: string,
    @GetUser() user: User,
    @Body() dto: UpdateFavoriteDto,
  ) {
    return this.favoriteService.update(id, user.id, dto);
  }

  @ApiNoContentResponse({ description: 'Deleted successfully' })
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':id')
  @Roles(Role.User)
  remove(@Param('id') id: string, @GetUser() user: User) {
    return this.favoriteService.remove(id, user.id);
  }
}
