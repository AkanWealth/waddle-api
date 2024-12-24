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
import {
  ForgotPasswordDto,
  ResetPasswordDto,
  SignInDto,
  SignUpDto,
} from './dto';
import {
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { FacebookAuthGuard, GoogleAuthGuard } from './guard';
import { GetUser } from './decorator';

@ApiBadRequestResponse({ description: 'Credentials taken' })
@ApiUnauthorizedResponse({ description: 'Invalid credentials' })
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // --------------- customer routes ----------------------
  @ApiCreatedResponse({ description: 'Customer created' })
  @Post('signup/customer')
  createCustomer(@Body() dto: SignUpDto) {
    return this.authService.createCustomer(dto);
  }

  @ApiOkResponse({ description: 'Verification mail sent' })
  @Post('verification/send/customer')
  @HttpCode(HttpStatus.OK)
  sendCustomerVerification(@Body() dto: SignUpDto) {
    return this.authService.sendCustomerVerification(dto.email);
  }

  @ApiOkResponse({ description: 'Customer email verified' })
  @Patch('verification/customer/:id')
  @HttpCode(HttpStatus.OK)
  veriyCustomerEmail(@Param('id') userId: string) {
    return this.authService.verifyCustomerEmail(userId);
  }

  @ApiOkResponse({ description: 'Customer authenticated' })
  @HttpCode(HttpStatus.OK)
  @Post('signin/customer')
  customerLogin(@Body() dto: SignInDto) {
    return this.authService.customerLogin(dto);
  }

  // --------------- vendor routes ----------------------
  @ApiCreatedResponse({ description: 'Vendor created' })
  @Post('signup/vendor')
  createVendor(@Body() dto: SignUpDto) {
    return this.authService.createVendor(dto);
  }

  @ApiOkResponse({ description: 'Verification mail sent' })
  @Post('verification/send/vendor')
  @HttpCode(HttpStatus.OK)
  sendVendorVerification(@Body() dto: SignUpDto) {
    return this.authService.sendVendorVerification(dto.email);
  }

  @ApiOkResponse({ description: 'Vendor email verified' })
  @Patch('verification/vendor/:id')
  @HttpCode(HttpStatus.OK)
  veriyVendorEmail(@Param('id') userId: string) {
    return this.authService.verifyVendorEmail(userId);
  }

  @ApiOkResponse({ description: 'Vendor authenticated' })
  @HttpCode(HttpStatus.OK)
  @Post('signin/vendor')
  vendorLogin(@Body() dto: SignInDto) {
    return this.authService.vendorLogin(dto);
  }

  // --------------- admin routes ----------------------
  @ApiOkResponse({ description: 'User authenticated' })
  @HttpCode(HttpStatus.OK)
  @Post('host')
  admin(@Body() dto: SignInDto) {
    return this.authService.adminLogin(dto);
  }

  // --------------- social routes ----------------------
  @ApiOkResponse({ description: 'Sign in with google' })
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

  @ApiOkResponse({ description: 'Sign in with facebook' })
  @HttpCode(HttpStatus.OK)
  @UseGuards(FacebookAuthGuard)
  @Get('facebook/signin')
  facebookLogin() {}

  @ApiOkResponse({ description: 'User authenticated' })
  @HttpCode(HttpStatus.OK)
  @UseGuards(FacebookAuthGuard)
  @Get('facebook/redirect')
  async facebookCallback(
    @GetUser('id') id: string,
    @GetUser('email') email: string,
  ) {
    const response = await this.authService.signToken(id, email);

    return response;
  }

  // ------------ reset password ----------------
  // generate password reset token
  @Patch('forgot-password')
  generateResetToken(@Body() dto: ForgotPasswordDto) {
    return this.authService.generateResetToken(dto.email);
  }

  // reset password
  @Patch('reset-password/:token')
  resetPassword(@Param('token') token: string, @Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(token, dto.password);
  }
}
