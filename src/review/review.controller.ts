import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ReviewService } from './review.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { Roles } from '../auth/decorator/role-decorator';
import { Role } from '../auth/enum/role.enum';
import { JwtGuard } from '../auth/guard/auth.guard';
import { RolesGuard } from '../auth/guard/role.guard';
import {
  ApiAcceptedResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiInternalServerErrorResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

@ApiBearerAuth()
@ApiUnauthorizedResponse({
  description: 'The user is not unathorized to perform this action',
})
@ApiInternalServerErrorResponse({ description: 'Internal server error' })
@UseGuards(JwtGuard, RolesGuard)
@Controller('reviews')
export class ReviewController {
  constructor(private readonly reviewService: ReviewService) {}

  @ApiCreatedResponse({ description: 'Created Successfull' })
  @Post()
  @Roles(Role.User)
  create(@Body() dto: CreateReviewDto) {
    return this.reviewService.create(dto);
  }

  @ApiOkResponse({ description: 'Successfull' })
  @Get()
  findAll() {
    return this.reviewService.findAll();
  }

  @ApiOkResponse({ description: 'Successfull' })
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.reviewService.findOne(id);
  }

  @ApiAcceptedResponse({ description: 'Data accepted' })
  @HttpCode(HttpStatus.ACCEPTED)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateReviewDto) {
    return this.reviewService.update(id, dto);
  }

  @ApiNoContentResponse({ description: 'Deleted successfully' })
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':id')
  @Roles(Role.Admin)
  remove(@Param('id') id: string) {
    return this.reviewService.remove(id);
  }
}
