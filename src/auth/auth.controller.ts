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
  AdminSignUpDto,
  BlacklistTokenDto,
  VerifyDto,
  ForgotPasswordDto,
  RefreshTokenDto,
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
import { ThrottlerGuard } from '@nestjs/throttler';
import { Role } from './enum/role.enum';
import { NotificationService } from '../notification/notification.service';
import { PrismaService } from '../prisma/prisma.service';

@ApiInternalServerErrorResponse({ description: 'Internal Server error' })
@Controller('auth')
export class AuthController {
  constructor(
    private prisma: PrismaService,
    private readonly authService: AuthService,
    private notification: NotificationService,
  ) {}

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
  async sendCustomerVerification(@Body() dto: ForgotPasswordDto) {
    try {
      // generate token and expiration time
      const verificatonToken = Math.random().toString(36).substr(2);
      const verificationTokenExpiration = Date.now() + 3600000; // 1 hour

      // save token and expiration time to database
      await this.prisma.user.update({
        where: { email: dto.email },
        data: {
          verification_token: verificatonToken,
          verification_token_expiration: verificationTokenExpiration.toString(),
        },
      });

      const subject = 'Email Verification';
      const message = `<p>Hello,</p>

      <p>Thank you for signing up on Waddle, you only have one step left, kindly verify using the token: <b>${verificatonToken}</b> to complete our signup process</p>

      <p>Warm regards,</p>

      <p>Waddle Team</p>
      `;

      return await this.notification.sendMail(dto.email, subject, message);
    } catch (error) {
      throw error;
    }
  }

  @ApiAcceptedResponse({ description: 'Customer email verified' })
  @ApiBadRequestResponse({ description: 'Bad request' })
  @HttpCode(HttpStatus.ACCEPTED)
  @Patch('verification/customer')
  verifyCustomerEmail(@Body() dto: VerifyDto) {
    return this.authService.verifyCustomerEmail(dto.token);
  }

  @ApiUnauthorizedResponse({ description: 'Invalid credentials' })
  @ApiOkResponse({ description: 'Customer authenticated' })
  @HttpCode(HttpStatus.OK)
  @UseGuards(ThrottlerGuard)
  @Post('signin/customer')
  customerLogin(@Body() dto: SignInDto) {
    return this.authService.customerLogin(dto);
  }

  @Post('logout/customer')
  async logoutUser(@Body() dto: BlacklistTokenDto) {
    await this.authService.addToken(dto);
    return { message: 'Logged out successfully' };
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
  async sendVendorVerification(@Body() dto: ForgotPasswordDto) {
    try {
      // generate token and expiration time
      const verificatonToken = Math.random().toString(36).substr(2);
      const verificationTokenExpiration = Date.now() + 3600000; // 1 hour

      // save token and expiration time to database
      await this.prisma.vendor.update({
        where: { email: dto.email },
        data: {
          verification_token: verificatonToken,
          verification_token_expiration: verificationTokenExpiration.toString(),
        },
      });

      const subject = 'Email Verification';
      const message = `<p>Hello,</p>

      <p>Thank you for signing up on Waddle, you only have one step left, kindly verify using the token: <b>${verificatonToken}</b> to complete our signup process</p>

      <p>Warm regards,</p>

      <p>Waddle Team</p>
      `;

      return await this.notification.sendMail(dto.email, subject, message);
    } catch (error) {
      throw error;
    }
  }

  @ApiAcceptedResponse({ description: 'Vendor email verified' })
  @ApiBadRequestResponse({ description: 'Bad request' })
  @HttpCode(HttpStatus.ACCEPTED)
  @Patch('verification/vendor')
  verfiyVendorEmail(@Body() dto: VerifyDto) {
    return this.authService.verifyVendorEmail(dto.token);
  }

  @ApiUnauthorizedResponse({ description: 'Invalid credentials' })
  @ApiOkResponse({ description: 'Vendor authenticated' })
  @HttpCode(HttpStatus.OK)
  @Post('signin/vendor')
  vendorLogin(@Body() dto: SignInDto) {
    return this.authService.vendorLogin(dto);
  }

  @Post('logout/vendor')
  async logoutVendor(@Body() dto: BlacklistTokenDto) {
    await this.authService.addToken(dto);
    return { message: 'Logged out successfully' };
  }

  // --------------- admin routes ----------------------
  @ApiBadRequestResponse({ description: 'Bad request' })
  @ApiCreatedResponse({ description: 'Admin Created' })
  @Post('create/host')
  createAdmin(@Body() dto: AdminSignUpDto) {
    return this.authService.createAdmin(dto);
  }

  @ApiOkResponse({ description: 'Verification mail sent' })
  @HttpCode(HttpStatus.OK)
  @Post('verification/send/admin')
  async sendAdminVerification(@Body() dto: ForgotPasswordDto) {
    try {
      // generate token and expiration time
      const verificatonToken = Math.random().toString(36).substr(2);
      const verificationTokenExpiration = Date.now() + 3600000; // 1 hour

      // save token and expiration time to database
      await this.prisma.admin.update({
        where: { email: dto.email },
        data: {
          verification_token: verificatonToken,
          verification_token_expiration: verificationTokenExpiration.toString(),
        },
      });

      const subject = 'Email Verification';
      const message = `<p>Hello,</p>

      <p>Thank you for signing up on Waddle as an admin, you only have one step left, kindly verify using the token: <b>${verificatonToken}</b> to complete our signup process</p>

      <p>Warm regards,</p>

      <p>Waddle Team</p>
      `;

      return await this.notification.sendMail(dto.email, subject, message);
    } catch (error) {
      throw error;
    }
  }

  @ApiAcceptedResponse({ description: 'Admin email verified' })
  @ApiBadRequestResponse({ description: 'Bad request' })
  @HttpCode(HttpStatus.ACCEPTED)
  @Patch('verification/admin')
  verfiyAdminEmail(@Body() dto: VerifyDto) {
    return this.authService.verifyAdminEmail(dto.token);
  }

  @ApiUnauthorizedResponse({ description: 'Invalid credentials' })
  @ApiOkResponse({ description: 'Admin authenticated' })
  @HttpCode(HttpStatus.OK)
  @Post('signin/host')
  adminLogin(@Body() dto: SignInDto) {
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
    const response = await this.authService.signToken(id, email, Role.User);

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
    const response = await this.authService.signToken(id, email, Role.User);

    return response;
  }

  // --------------- refresh token ----------------------
  @ApiUnauthorizedResponse({ description: 'Invalid credentials' })
  @ApiOkResponse({ description: 'New token generated' })
  @HttpCode(HttpStatus.OK)
  @UseGuards(ThrottlerGuard)
  @Post('refresh')
  customerRefreshToken(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshToken(dto.token);
  }

  // ------------ reset password ----------------
  // generate password reset token
  @ApiAcceptedResponse({ description: 'Reset token generated' })
  @ApiNotFoundResponse({ description: 'User not found' })
  @HttpCode(HttpStatus.ACCEPTED)
  @Patch('forgot-password/user')
  generateResetTokenForUser(@Body() dto: ForgotPasswordDto) {
    return this.authService.generateResetTokenForUser(dto.email);
  }

  @ApiAcceptedResponse({ description: 'Reset token generated' })
  @ApiNotFoundResponse({ description: 'User not found' })
  @HttpCode(HttpStatus.ACCEPTED)
  @Patch('forgot-password/vendor')
  generateResetTokenForVendor(@Body() dto: ForgotPasswordDto) {
    return this.authService.generateResetTokenForVendor(dto.email);
  }

  @ApiAcceptedResponse({ description: 'Reset token generated' })
  @ApiNotFoundResponse({ description: 'User not found' })
  @HttpCode(HttpStatus.ACCEPTED)
  @Patch('forgot-password/admin')
  generateResetTokenForAdmin(@Body() dto: ForgotPasswordDto) {
    return this.authService.generateResetTokenForAdmin(dto.email);
  }

  // reset password
  @ApiAcceptedResponse({ description: 'Password reset successful' })
  @ApiBadRequestResponse({ description: 'Reset token is required' })
  @HttpCode(HttpStatus.ACCEPTED)
  @Patch('reset-password/user/:token')
  resetUserPassword(
    @Param('token') token: string,
    @Body() dto: ResetPasswordDto,
  ) {
    return this.authService.resetUserPassword(token, dto.password);
  }

  @ApiAcceptedResponse({ description: 'Password reset successful' })
  @ApiBadRequestResponse({ description: 'Reset token is required' })
  @HttpCode(HttpStatus.ACCEPTED)
  @Patch('reset-password/vendor/:token')
  resetVendorPassword(
    @Param('token') token: string,
    @Body() dto: ResetPasswordDto,
  ) {
    return this.authService.resetVendorPassword(token, dto.password);
  }

  @ApiAcceptedResponse({ description: 'Password reset successful' })
  @ApiBadRequestResponse({ description: 'Reset token is required' })
  @HttpCode(HttpStatus.ACCEPTED)
  @Patch('reset-password/admin/:token')
  resetAdminPassword(
    @Param('token') token: string,
    @Body() dto: ResetPasswordDto,
  ) {
    return this.authService.resetAdminPassword(token, dto.password);
  }

  // --------------- admin routes ----------------------
  @Post('logout/admin')
  async logoutAdmin(@Body() dto: BlacklistTokenDto) {
    await this.authService.addToken(dto);
    return { message: 'Logged out successfully' };
  }
}
