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
  BlacklistTokenDto,
  VerifyDto,
  ForgotPasswordDto,
  RefreshTokenDto,
  ResetPasswordDto,
  SignInDto,
  UserSignUpDto,
  OrganiserSignUpDto,
  SsoSignInDto,
} from './dto';
import {
  ApiAcceptedResponse,
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiExcludeEndpoint,
  ApiInternalServerErrorResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { FacebookAuthGuard, GoogleAuthGuard } from './guard';
import { GetUser } from './decorator';
import { FileInterceptor } from '@nestjs/platform-express';
import { ThrottlerGuard } from '@nestjs/throttler';
import { PrismaService } from '../prisma/prisma.service';
import { Mailer } from '../helper';

@ApiInternalServerErrorResponse({ description: 'Internal Server error' })
@Controller('auth')
export class AuthController {
  constructor(
    private prisma: PrismaService,
    private readonly authService: AuthService,
    private mailer: Mailer,
  ) {}

  // --------------- customer routes ----------------------
  @ApiOperation({
    summary: 'create a parent account',
    description: 'Parent can create an account',
  })
  @ApiCreatedResponse({ description: 'Created' })
  @ApiBadRequestResponse({ description: 'Bad request' })
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
            new MaxFileSizeValidator({ maxSize: 5000000 }),
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

  @ApiOperation({
    summary: 'send token to parent to verify email',
    description:
      'Parent is sent a token to verify email if not received on registration',
  })
  @ApiOkResponse({ description: 'Ok' })
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

      return await this.mailer.sendMail(dto.email, subject, message);
    } catch (error) {
      throw error;
    }
  }

  @ApiOperation({
    summary: 'verify parent email',
    description: 'Parent can verify their email based on token received',
  })
  @ApiAcceptedResponse({ description: 'Accepted' })
  @ApiBadRequestResponse({ description: 'Bad request' })
  @HttpCode(HttpStatus.ACCEPTED)
  @Patch('verification/customer')
  verifyCustomerEmail(@Body() dto: VerifyDto) {
    return this.authService.verifyCustomerEmail(dto.token);
  }

  @ApiOperation({
    summary: 'login as a parent',
    description: 'Parent can login after account creation',
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiOkResponse({ description: 'Ok' })
  @HttpCode(HttpStatus.OK)
  @UseGuards(ThrottlerGuard)
  @Post('signin/customer')
  customerLogin(@Body() dto: SignInDto) {
    return this.authService.customerLogin(dto);
  }

  @ApiOperation({
    summary: 'logout as a parent',
    description: 'Parent can logout of the app',
  })
  @ApiOkResponse({ description: 'Ok' })
  @Post('logout/customer')
  async logoutUser(@Body() dto: BlacklistTokenDto) {
    await this.authService.addToken(dto);
    return { message: 'Logged out successfully' };
  }

  // --------------- organiser routes ----------------------
  @ApiOperation({
    summary: 'create a organiser account',
    description: 'Organiser can create an account',
  })
  @ApiCreatedResponse({ description: 'Created' })
  @ApiBadRequestResponse({ description: 'Bad request' })
  @Post('signup/organiser')
  @UseInterceptors(FileInterceptor('business_logo'))
  createOrganiser(
    @Body() dto: OrganiserSignUpDto,
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
      return this.authService.createOrganiser(
        dto,
        file.originalname,
        file.buffer,
      );
    } else {
      return this.authService.createOrganiser(
        dto,
        file?.originalname,
        file?.buffer,
      );
    }
  }

  @ApiOperation({
    summary: 'send token to organiser to verify email',
    description:
      'Organiser is sent a token to verify email if not received on registration',
  })
  @ApiOkResponse({ description: 'Ok' })
  @HttpCode(HttpStatus.OK)
  @Post('verification/send/organiser')
  async sendOrganiserVerification(@Body() dto: ForgotPasswordDto) {
    try {
      // generate token and expiration time
      const verificatonToken = Math.random().toString(36).substr(2);
      const verificationTokenExpiration = Date.now() + 3600000; // 1 hour

      // save token and expiration time to database
      await this.prisma.organiser.update({
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

      return await this.mailer.sendMail(dto.email, subject, message);
    } catch (error) {
      throw error;
    }
  }

  @ApiOperation({
    summary: 'verify a organiser email',
    description: 'Organisers can verify their email',
  })
  @ApiAcceptedResponse({ description: 'Accepted' })
  @ApiBadRequestResponse({ description: 'Bad request' })
  @HttpCode(HttpStatus.ACCEPTED)
  @Patch('verification/organiser')
  verfiyOrganiserEmail(@Body() dto: VerifyDto) {
    return this.authService.verifyOrganiserEmail(dto.token);
  }

  @ApiOperation({
    summary: 'login as a organiser',
    description: 'Organiser can login after account creation',
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiOkResponse({ description: 'Ok' })
  @HttpCode(HttpStatus.OK)
  @Post('signin/organiser')
  organiserLogin(@Body() dto: SignInDto) {
    return this.authService.organiserLogin(dto);
  }

  @ApiOperation({
    summary: 'logout as a organiser',
    description: 'Organiser can logout of the app',
  })
  @ApiOkResponse({ description: 'Ok' })
  @Post('logout/organiser')
  async logoutOrganiser(@Body() dto: BlacklistTokenDto) {
    await this.authService.addToken(dto);
    return { message: 'Logged out successfully' };
  }

  // --------------- admin routes ----------------------
  @ApiOperation({
    summary: 'send token to admin to verify email',
    description:
      'Admin is sent a token to verify email if not received on creation',
  })
  @ApiOkResponse({ description: 'Ok' })
  @HttpCode(HttpStatus.OK)
  @Post('verification/send/host')
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

      return await this.mailer.sendMail(dto.email, subject, message);
    } catch (error) {
      throw error;
    }
  }

  @ApiOperation({
    summary: 'verify an admin email',
    description: 'Admin can verify their email',
  })
  @ApiAcceptedResponse({ description: 'Accepted' })
  @ApiBadRequestResponse({ description: 'Bad request' })
  @HttpCode(HttpStatus.ACCEPTED)
  @Patch('verification/host')
  verfiyAdminEmail(@Body() dto: VerifyDto) {
    return this.authService.verifyAdminEmail(dto.token, dto.password);
  }

  @ApiOperation({
    summary: 'login as an admin',
    description: 'Admin can log into the app',
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiOkResponse({ description: 'Ok' })
  @HttpCode(HttpStatus.OK)
  @Post('signin/host')
  adminLogin(@Body() dto: SignInDto) {
    return this.authService.adminLogin(dto);
  }

  @ApiOperation({
    summary: 'logout as an admin',
    description: 'Admin can logout of the app',
  })
  @ApiOkResponse({ description: 'Ok' })
  @HttpCode(HttpStatus.OK)
  @Post('logout/host')
  async logoutAdmin(@Body() dto: BlacklistTokenDto) {
    await this.authService.addToken(dto);
    return { message: 'Logged out successfully' };
  }

  // --------------- social routes ----------------------
  @ApiOperation({
    summary: 'login using google as a parent',
    description: 'Parents can login using google',
  })
  @ApiOkResponse({ description: 'Ok' })
  @HttpCode(HttpStatus.OK)
  @Post('sso/signin')
  googleSignin(@Body() dto: SsoSignInDto) {
    return this.authService.validateSsoSignin(dto);
  }

  @ApiOperation({
    summary: 'login using google as a parent',
    description: 'Parents can login using google',
  })
  @ApiOkResponse({ description: 'Ok' })
  @HttpCode(HttpStatus.OK)
  @UseGuards(GoogleAuthGuard)
  @Get('google/signin')
  googleLogin() {}

  @ApiExcludeEndpoint()
  @ApiOkResponse({ description: 'Ok' })
  @HttpCode(HttpStatus.OK)
  @UseGuards(GoogleAuthGuard)
  @Get('google/callback')
  async googleCallback(
    @GetUser() user: { id: string; email: string; role: string },
  ) {
    const response = await this.authService.signToken(
      user.id,
      user.email,
      user.role,
    );

    return response;
  }

  @ApiOperation({
    summary: 'login using facebook as a parent',
    description: 'Parents can login using facebook',
  })
  @ApiOkResponse({ description: 'Ok' })
  @HttpCode(HttpStatus.OK)
  @UseGuards(FacebookAuthGuard)
  @Get('facebook/signin')
  facebookLogin() {}

  @ApiExcludeEndpoint()
  @ApiOkResponse({ description: 'Ok' })
  @HttpCode(HttpStatus.OK)
  @UseGuards(FacebookAuthGuard)
  @Get('facebook/redirect')
  async facebookCallback(
    @GetUser() user: { id: string; email: string; role: string },
  ) {
    const response = await this.authService.signToken(
      user.id,
      user.email,
      user.role,
    );

    return response;
  }

  // --------------- refresh token ----------------------
  @ApiOperation({
    summary: 'generate a new access token',
    description: 'Generate a new access token using the refresh token ',
  })
  @ApiUnauthorizedResponse({ description: 'Unauthrized' })
  @ApiOkResponse({ description: 'Ok' })
  @HttpCode(HttpStatus.OK)
  @UseGuards(ThrottlerGuard)
  @Post('refresh')
  customerRefreshToken(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshToken(dto.token);
  }

  // ------------ reset password ----------------
  // generate password reset token
  @ApiOperation({
    summary: 'generate token for parent password reset',
    description: 'Parent is sent a token to reset their password',
  })
  @ApiAcceptedResponse({ description: 'Accepted' })
  @ApiNotFoundResponse({ description: 'Not found' })
  @HttpCode(HttpStatus.ACCEPTED)
  @Patch('forgot-password/user')
  generateResetTokenForUser(@Body() dto: ForgotPasswordDto) {
    return this.authService.generateResetTokenForUser(dto.email);
  }

  @ApiOperation({
    summary: 'generate token for organiser password reset',
    description: 'Organiser is sent a token to reset their password',
  })
  @ApiAcceptedResponse({ description: 'Accepted' })
  @ApiNotFoundResponse({ description: 'Not found' })
  @HttpCode(HttpStatus.ACCEPTED)
  @Patch('forgot-password/organiser')
  generateResetTokenForOrganiser(@Body() dto: ForgotPasswordDto) {
    return this.authService.generateResetTokenForOrganiser(dto.email);
  }

  @ApiOperation({
    summary: 'generate token for admin password reset',
    description: 'Admin is sent a token to reset their password',
  })
  @ApiAcceptedResponse({ description: 'Accepted' })
  @ApiNotFoundResponse({ description: 'Not found' })
  @HttpCode(HttpStatus.ACCEPTED)
  @Patch('forgot-password/host')
  generateResetTokenForAdmin(@Body() dto: ForgotPasswordDto) {
    return this.authService.generateResetTokenForAdmin(dto.email);
  }

  @ApiOperation({
    summary: 'Request password reset link for admin',
    description:
      'Sends a password reset link with a token to the admin’s email address.',
  })
  @ApiAcceptedResponse({ description: 'Accepted' })
  @ApiNotFoundResponse({ description: 'Not found' })
  @HttpCode(HttpStatus.ACCEPTED)
  @Patch('forgot-password/host/web')
  generateResetTokenForAdminWeb(@Body() dto: ForgotPasswordDto) {
    return this.authService.generateResetTokenForAdminWeb(dto.email);
  }

  // reset password
  @ApiOperation({
    summary: 'reset parent password',
    description: 'Parent can reset their password',
  })
  @ApiAcceptedResponse({ description: 'Accepted' })
  @ApiBadRequestResponse({ description: 'Bad request' })
  @HttpCode(HttpStatus.ACCEPTED)
  @Patch('reset-password/user/:token')
  resetUserPassword(
    @Param('token') token: string,
    @Body() dto: ResetPasswordDto,
  ) {
    return this.authService.resetUserPassword(token, dto.password);
  }

  @ApiOperation({
    summary: 'reset organiser password',
    description: 'Organiser can reset their password',
  })
  @ApiAcceptedResponse({ description: 'Accepted' })
  @ApiBadRequestResponse({ description: 'Bad request' })
  @HttpCode(HttpStatus.ACCEPTED)
  @Patch('reset-password/organiser/:token')
  resetOrganiserPassword(
    @Param('token') token: string,
    @Body() dto: ResetPasswordDto,
  ) {
    return this.authService.resetOrganiserPassword(token, dto.password);
  }

  @ApiOperation({
    summary: 'reset admin password',
    description: 'Admin can reset their password',
  })
  @ApiAcceptedResponse({ description: 'Accepted' })
  @ApiBadRequestResponse({ description: 'Bad request' })
  @HttpCode(HttpStatus.ACCEPTED)
  @Patch('reset-password/host/:token')
  resetAdminPassword(
    @Param('token') token: string,
    @Body() dto: ResetPasswordDto,
  ) {
    return this.authService.resetAdminPassword(token, dto.password);
  }
}
