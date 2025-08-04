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
  Query,
} from '@nestjs/common';
import { FavoriteService } from './favorite.service';
import { CreateFavoriteDto } from './dto/create-favorite.dto';
import { UpdateFavoriteDto } from './dto/update-favorite.dto';
import { User } from '@prisma/client';
import {
  ApiAcceptedResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiInternalServerErrorResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { JwtGuard } from '../auth/guard/auth.guard';
import { GetUser } from '../auth/decorator/get-user.decorator';

@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Unathorized' })
@ApiInternalServerErrorResponse({ description: 'Internal server error' })
@UseGuards(JwtGuard)
@Controller('favorites')
export class FavoriteController {
  constructor(private readonly favoriteService: FavoriteService) {}

  @ApiOperation({
    summary: 'add an event to wishlist',
    description: 'Parents can add an event to wishlist',
  })
  @ApiCreatedResponse({ description: 'Created' })
  @Post()
  createFavorite(@Body() dto: CreateFavoriteDto, @GetUser() user: User) {
    return this.favoriteService.createFavorite(user.id, dto);
  }

  @ApiOperation({
    summary: 'View all my wishlist with pagination',
    description: 'Parents can view all their wishlist',
  })
  @ApiOkResponse({ description: 'Ok' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @Get()
  viewAllFavorite(
    @GetUser() user: User,
    @Query('page') page = 1,
    @Query('limit') limit = 10,
  ) {
    return this.favoriteService.viewAllFavorite(user.id, page, limit);
  }

  @ApiOperation({
    summary: 'view a wishlist by id',
    description: 'Parents can view a wishlist by id',
  })
  @ApiOkResponse({ description: 'Ok' })
  @Get(':id')
  viewFavorite(@Param('id') id: string, @GetUser() user: User) {
    return this.favoriteService.viewFavorite(id, user.id);
  }

  @ApiOperation({
    summary: 'update a wishlist by id',
    description: 'Parents can update a wishlist by id',
  })
  @ApiAcceptedResponse({ description: 'Accepted' })
  @HttpCode(HttpStatus.ACCEPTED)
  @Patch(':id')
  updateFavorite(
    @Param('id') id: string,
    @GetUser() user: User,
    @Body() dto: UpdateFavoriteDto,
  ) {
    return this.favoriteService.updateFavorite(id, user.id, dto);
  }

  @ApiOperation({
    summary: 'delete a wishlist by id',
    description: 'Parents can delete a wishlist by id',
  })
  @ApiNoContentResponse({ description: 'No content' })
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':id')
  deleteFavorite(@Param('id') id: string, @GetUser() user: User) {
    return this.favoriteService.deleteFavorite(id, user.id);
  }
}
