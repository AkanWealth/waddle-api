import { Controller } from '@nestjs/common';
// import { OrganiserStaffService } from './organiser-staff.service';
// import { GetUser } from 'src/auth/decorator';
// import { User } from '@prisma/client';
// import {
//   BlacklistTokenDto,
//   ForgotPasswordDto,
//   ResetPasswordDto,
//   SignInDto,
// } from 'src/auth/dto';
import { ApiInternalServerErrorResponse } from '@nestjs/swagger';
// import { UpdatePasswordDto } from 'src/user/dto';
// import { AuthService } from 'src/auth/auth.service';
// import { JwtGuard } from 'src/auth/guard';
// import { RolesGuard } from 'src/auth/guard/role.guard';
// import { Roles } from 'src/auth/decorator/role-decorator';
// import { Role } from 'src/auth/enum';

@ApiInternalServerErrorResponse({ description: 'Internal server error' })
@Controller('organiser-staff')
export class OrganiserStaffController {
  constructor() {}

  // @ApiOperation({
  //   summary: 'login as a organiser staff',
  //   description: 'Organiser staff can login',
  // })
  // @ApiOkResponse({ description: 'Ok' })
  // @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  // @HttpCode(HttpStatus.OK)
  // @Post('auth/login')
  // loginOrganiserStaff(@Body() dto: SignInDto) {
  //   return this.organiserStaffService.loginOrganiserStaff(dto);
  // }

  // @ApiOperation({
  //   summary: 'generate token for organiser staff password reset',
  //   description: 'Organiser staff is sent a token to reset their password',
  // })
  // @ApiAcceptedResponse({ description: 'Accepted' })
  // @ApiNotFoundResponse({ description: 'Not found' })
  // @HttpCode(HttpStatus.ACCEPTED)
  // @Patch('forgot-password')
  // forgotPassword(@Body() dto: ForgotPasswordDto) {
  //   return this.organiserStaffService.generateResetTokenForOrganiserStaff(dto);
  // }

  // @ApiOperation({
  //   summary: 'reset organiser staff password',
  //   description: 'Organiser staff can reset their password',
  // })
  // @ApiAcceptedResponse({ description: 'Accepted' })
  // @ApiNotFoundResponse({ description: 'Not found' })
  // @ApiBadRequestResponse({ description: 'Bad request' })
  // @HttpCode(HttpStatus.ACCEPTED)
  // @Patch('reset-password')
  // resetPassword(@Param('token') token: string, @Body() dto: ResetPasswordDto) {
  //   return this.organiserStaffService.resetPassword(token, dto.password);
  // }

  // @ApiBearerAuth()
  // @UseGuards(JwtGuard, RolesGuard)
  // @ApiOperation({
  //   summary: 'save my fcm token as a loggedin organiser-staff',
  //   description: 'Save my fcm token as a loggedin organiser-staff',
  // })
  // @ApiBody({
  //   description: 'Device ID',
  //   type: String,
  //   required: true,
  //   schema: {
  //     properties: {
  //       token: {
  //         example: 'your-device-id',
  //       },
  //     },
  //   },
  // })
  // @ApiOkResponse({ description: 'Ok' })
  // @HttpCode(HttpStatus.OK)
  // @Post('me')
  // saveOrganiserStaffFcmToken(
  //   @GetUser('id') id: string,
  //   @Body('token') token: string,
  // ) {
  //   return this.organiserStaffService.saveOrganiserStaffFcmToken(id, token);
  // }

  // @ApiBearerAuth()
  // @UseGuards(JwtGuard, RolesGuard)
  // @ApiOperation({
  //   summary: 'logout as a organiser staff',
  //   description: 'Organiser staff can logout',
  // })
  // @ApiOkResponse({ description: 'Ok' })
  // @HttpCode(HttpStatus.OK)
  // @Post('auth/logout')
  // // @Roles(Role.Manager)
  // async logoutOrganiserStaff(@Body() dto: BlacklistTokenDto) {
  //   await this.authService.addToken(dto);
  //   return { message: 'Logged out successfully' };
  // }

  // @ApiBearerAuth()
  // @UseGuards(JwtGuard, RolesGuard)
  // @ApiOperation({
  //   summary: 'view organiser staff profile',
  //   description: 'Organiser staff can view their profile',
  // })
  // @ApiOkResponse({ description: 'Ok' })
  // @ApiNotFoundResponse({ description: 'Not found' })
  // @Get('me')
  // // @Roles(Role.Manager)
  // viewMe(@GetUser() user: User) {
  //   return this.organiserStaffService.viewMe(user.id);
  // }

  // @ApiBearerAuth()
  // @UseGuards(JwtGuard, RolesGuard)
  // @ApiOperation({
  //   summary: 'update staff password',
  //   description: 'Organiser staff can update their password',
  // })
  // @ApiAcceptedResponse({ description: 'Accepted' })
  // @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  // @ApiNotFoundResponse({ description: 'Not found' })
  // @HttpCode(HttpStatus.ACCEPTED)
  // @Patch('me')
  // // @Roles(Role.Manager)
  // updatePassword(
  //   @GetUser() user: { id: string },
  //   @Body() dto: UpdatePasswordDto,
  // ) {
  //   return this.organiserStaffService.updatePassword(user.id, dto);
  // }
}
