import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Get,
  UseGuards,
  Patch,
  Param,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { SignInDto, SignUpDto } from './dto';
import {
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { GoogleAuthGuard } from './guard';
import { GetUser } from './decorator';

@ApiBadRequestResponse({ description: 'Credentials taken' })
@ApiUnauthorizedResponse({ description: 'Invalid credentials' })
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @ApiCreatedResponse({ description: 'User created' })
  @Post('signup')
  register(@Body() dto: SignUpDto) {
    return this.authService.register(dto);
  }

  @ApiOkResponse({ description: 'User email verified' })
  @Patch('verification/:id')
  veriyEmail(@Param('id') userId: string) {
    return this.authService.verifyEmail(userId);
  }

  @ApiOkResponse({ description: 'User authenticated' })
  @HttpCode(HttpStatus.OK)
  @Post('signin')
  login(@Body() dto: SignInDto) {
    return this.authService.login(dto);
  }

  @ApiOkResponse({ description: 'User authenticated' })
  @HttpCode(HttpStatus.OK)
  @Post('host')
  admin(@Body() dto: SignInDto) {
    return this.authService.admin(dto);
  }

  @ApiOkResponse({ description: 'User authenticated' })
  @HttpCode(HttpStatus.OK)
  @UseGuards(GoogleAuthGuard)
  @Get('google/signin')
  googleLogin() {}

  @ApiOkResponse({ description: 'User authenticated' })
  @HttpCode(HttpStatus.OK)
  @UseGuards(GoogleAuthGuard)
  @Get('google/callback')
  async googleCallback(
    @GetUser('id') id: string,
    @GetUser('email') email: string,
  ) {
    const response = await this.authService.signToken(id, email);

    return response;
  }
}
