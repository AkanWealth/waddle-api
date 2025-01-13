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
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import {
  ForgotPasswordDto,
  ResetPasswordDto,
  SignInDto,
  UserSignUpDto,
  VendorSignUpDto,
} from './dto';
import {
  ApiAcceptedResponse,
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiInternalServerErrorResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { FacebookAuthGuard, GoogleAuthGuard } from './guard';
import { GetUser } from './decorator';
import { FileInterceptor } from '@nestjs/platform-express';

@ApiInternalServerErrorResponse({ description: 'Internal Server error' })
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // --------------- customer routes ----------------------
  @ApiCreatedResponse({ description: 'Customer created' })
  @ApiBadRequestResponse({ description: 'Credentials taken' })
  @Post('signup/customer')
  @UseInterceptors(FileInterceptor('profile_picture'))
  createCustomer(
    @Body() dto: UserSignUpDto,
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
      return this.authService.createCustomer(
        dto,
        file.originalname,
        file.buffer,
      );
    } else {
      return this.authService.createCustomer(
        dto,
        file?.originalname,
        file?.buffer,
      );
    }
  }

  @ApiOkResponse({ description: 'Verification mail sent' })
  @HttpCode(HttpStatus.OK)
  @Post('verification/send/customer')
  sendCustomerVerification(@Body() dto: UserSignUpDto) {
    return this.authService.sendCustomerVerification(dto.email);
  }

  @ApiAcceptedResponse({ description: 'Customer email verified' })
  @HttpCode(HttpStatus.ACCEPTED)
  @Patch('verification/customer/:id')
  veriyCustomerEmail(@Param('id') userId: string) {
    return this.authService.verifyCustomerEmail(userId);
  }

  @ApiUnauthorizedResponse({ description: 'Invalid credentials' })
  @ApiOkResponse({ description: 'Customer authenticated' })
  @HttpCode(HttpStatus.OK)
  @Post('signin/customer')
  customerLogin(@Body() dto: SignInDto) {
    return this.authService.customerLogin(dto);
  }

  // --------------- vendor routes ----------------------
  @ApiCreatedResponse({ description: 'Vendor created' })
  @ApiBadRequestResponse({ description: 'Credentials taken' })
  @Post('signup/vendor')
  @UseInterceptors(FileInterceptor('business_logo'))
  createVendor(
    @Body() dto: VendorSignUpDto,
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
      return this.authService.createVendor(dto, file.originalname, file.buffer);
    } else {
      return this.authService.createVendor(
        dto,
        file?.originalname,
        file?.buffer,
      );
    }
  }

  @ApiOkResponse({ description: 'Verification mail sent' })
  @HttpCode(HttpStatus.OK)
  @Post('verification/send/vendor')
  sendVendorVerification(@Body() dto: VendorSignUpDto) {
    return this.authService.sendVendorVerification(dto.email);
  }

  @ApiAcceptedResponse({ description: 'Vendor email verified' })
  @HttpCode(HttpStatus.ACCEPTED)
  @Patch('verification/vendor/:id')
  veriyVendorEmail(@Param('id') userId: string) {
    return this.authService.verifyVendorEmail(userId);
  }

  @ApiUnauthorizedResponse({ description: 'Invalid credentials' })
  @ApiOkResponse({ description: 'Vendor authenticated' })
  @HttpCode(HttpStatus.OK)
  @Post('signin/vendor')
  vendorLogin(@Body() dto: SignInDto) {
    return this.authService.vendorLogin(dto);
  }

  // --------------- admin routes ----------------------
  @ApiUnauthorizedResponse({ description: 'Invalid credentials' })
  @ApiOkResponse({ description: 'Admin authenticated' })
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
  @ApiAcceptedResponse({ description: 'Reset token generated' })
  @ApiNotFoundResponse({ description: 'User not found' })
  @HttpCode(HttpStatus.ACCEPTED)
  @Patch('forgot-password')
  generateResetToken(@Body() dto: ForgotPasswordDto) {
    return this.authService.generateResetToken(dto.email);
  }

  // reset password
  @ApiAcceptedResponse({ description: 'Password reset successful' })
  @ApiBadRequestResponse({ description: 'Reset token is required' })
  @HttpCode(HttpStatus.ACCEPTED)
  @Patch('reset-password/:token')
  resetPassword(@Param('token') token: string, @Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(token, dto.password);
  }
}
