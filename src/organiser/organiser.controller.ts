import {
  Controller,
  Get,
  Body,
  Patch,
  Delete,
  UseGuards,
  Param,
  HttpCode,
  HttpStatus,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
  Post,
} from '@nestjs/common';
import { OrganiserService } from './organiser.service';
import { UpdateOrganiserDto } from './dto';
import {
  ApiAcceptedResponse,
  ApiBearerAuth,
  ApiBody,
  ApiInternalServerErrorResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { User } from '@prisma/client';
import { JwtGuard } from '../auth/guard';
import { GetUser } from '../auth/decorator';
import { FileInterceptor } from '@nestjs/platform-express';
import { RolesGuard } from '../auth/guard/role.guard';
import { Roles } from '../auth/decorator/role-decorator';
import { UpdatePasswordDto } from '../user/dto/update-password.dto';
import { Role } from '../auth/enum';
import { ApproveOrganiserDto } from './dto/approve-organiser.dto';

@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Unathorized' })
@ApiInternalServerErrorResponse({ description: 'Internal Server error' })
@UseGuards(JwtGuard, RolesGuard)
@Controller('organisers')
export class OrganiserController {
  constructor(private organiserService: OrganiserService) {}

  // Start Organiser
  @ApiOperation({
    summary: 'save my fcm token as a loggedin organiser',
    description: 'Save my fcm token as a loggedin organiser',
  })
  @ApiBody({
    description: 'Device ID',
    type: String,
    required: true,
    schema: {
      properties: {
        token: {
          example: 'your-device-id',
        },
      },
    },
  })
  @ApiOkResponse({ description: 'Ok' })
  @HttpCode(HttpStatus.OK)
  @Post('device-token')
  saveOrganiserFcmToken(
    @GetUser('id') id: string,
    @Body('token') token: string,
  ) {
    return this.organiserService.saveOrganiserFcmToken(id, token);
  }

  @ApiOperation({
    summary: 'connect to stripe',
    description: 'Connect to stripe',
  })
  @ApiOkResponse({ description: 'Ok' })
  @HttpCode(HttpStatus.OK)
  @Post('connect')
  async connect(@GetUser('id') userId: string) {
    return this.organiserService.connect(userId);
  }

  @ApiOperation({
    summary: 'disconnect from stripe',
    description: 'Disconnect from stripe',
  })
  @ApiOkResponse({ description: 'Ok' })
  @HttpCode(HttpStatus.OK)
  @Delete('disconnect')
  async disconnect(@GetUser('id') userId: string) {
    return this.organiserService.disconnect(userId);
  }

  @ApiOperation({
    summary: 'check if stripe is connected',
    description: 'Check if stripe is connected',
  })
  @ApiOkResponse({ description: 'Ok' })
  @HttpCode(HttpStatus.OK)
  @Get('is-stripe-connected')
  async isStripeConnected(@GetUser('id') userId: string) {
    return this.organiserService.isStripeConnected(userId);
  }

  @ApiOperation({ summary: 'Get organiser recent activities' })
  @ApiQuery({
    name: 'limit',
    description: 'Number of activities to fetch',
    required: false,
    type: Number,
    example: 20,
  })
  @ApiResponse({
    status: 200,
    description: 'List of recent activities',
    type: Object, // could be replaced with a DTO class
    isArray: true,
  })
  @HttpCode(HttpStatus.OK)
  @Get('recent-activity')
  async getOrganiserRecentActivities(@GetUser('id') userId: string) {
    return this.organiserService.getOrganiserRecentActivities(userId);
  }

  @ApiOperation({
    summary: 'stripe return',
    description: 'Stripe return',
  })
  @ApiOkResponse({ description: 'Ok' })
  @HttpCode(HttpStatus.OK)
  @Get('return')
  handleReturn() {
    return 'Stripe return completed. You can close this tab.';
  }

  @ApiOperation({
    summary: 'stripe refresh',
    description: 'Stripe refresh',
  })
  @ApiOkResponse({ description: 'Ok' })
  @HttpCode(HttpStatus.OK)
  @Get('refresh')
  handleRefresh() {
    return 'Stripe onboarding was cancelled or expired.';
  }

  @ApiOperation({
    summary: 'toogle push notification for loggedin organiser',
    description: 'Toogle push notification for loggedin organiser',
  })
  @ApiOkResponse({ description: 'Ok' })
  @HttpCode(HttpStatus.OK)
  @Post('push-notification')
  tooglePushNotification(@GetUser('id') id: string) {
    return this.organiserService.togglePushNotififcation(id);
  }

  @ApiOperation({
    summary: 'view all organisers as an admin',
    description: 'Admin can view all organisers',
  })
  @ApiOkResponse({ description: 'Ok' })
  @Get('all')
  @Roles(Role.Admin)
  viewAllOrganiser(@GetUser() admin: User) {
    if (admin) return this.organiserService.viewAllOrganiser();
  }

  @ApiOperation({
    summary: 'view all organiser previous events as an admin',
    description: 'Admin can view all organisers previous events',
  })
  @ApiOkResponse({ description: 'Ok' })
  @Get('organiser/:organiserId/previous-events')
  @Roles(Role.Admin)
  viewAllOrganiserPreviousEvents(
    @GetUser() admin: User,
    @Param('organiserId') organiserId: string,
  ) {
    if (admin)
      return this.organiserService.viewAllOrganiserPreviousEvents(organiserId);
  }

  @ApiOperation({
    summary: 'view my details as a loggedin organiser',
    description: 'Organiser can view their details',
  })
  @ApiOkResponse({ description: 'Ok' })
  @Get('me')
  @Roles(Role.Organiser)
  viewMe(@GetUser() organiser: User) {
    return this.organiserService.viewMe(organiser.id);
  }

  @ApiOperation({
    summary: 'update my details as a loggedin organiser',
    description: 'Organiser can update their details',
  })
  @ApiAcceptedResponse({ description: 'Accepted' })
  @HttpCode(HttpStatus.ACCEPTED)
  @Patch('me')
  @Roles(Role.Organiser)
  @UseInterceptors(FileInterceptor('business_logo'))
  updateProfile(
    @GetUser('id') id: string,
    @Body() dto: UpdateOrganiserDto,
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
      return this.organiserService.updateProfile(
        id,
        dto,
        file.originalname,
        file.buffer,
      );
    } else {
      return this.organiserService.updateProfile(id, dto);
    }
  }

  @ApiOperation({
    summary: 'update my password as a loggedin organiser',
    description: 'Organiser can update their password',
  })
  @ApiAcceptedResponse({ description: 'Accepted' })
  @ApiBearerAuth()
  @HttpCode(HttpStatus.ACCEPTED)
  @Patch('me/password')
  @Roles(Role.Organiser)
  updatePassword(@GetUser('id') id: string, @Body() dto: UpdatePasswordDto) {
    return this.organiserService.updatePassword(id, dto);
  }

  @ApiOperation({
    summary: 'delete a organiser temporarily',
    description: 'Admin can delete a organiser by id',
  })
  @ApiNoContentResponse({ description: 'No content' })
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete('temp/:id')
  @Roles(Role.Admin)
  deleteOrganiserTemp(@GetUser() admin: User, @Param('id') id: string) {
    if (admin) return this.organiserService.deleteOrganiserTemp(id);
  }

  @ApiOperation({
    summary: 'delete a organiser permanently',
    description: 'Admin can delete a organiser by id permanently',
  })
  @ApiNoContentResponse({ description: 'No content' })
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':id')
  @Roles(Role.Admin)
  deleteOrganiser(@GetUser() admin: User, @Param('id') id: string) {
    if (admin) return this.organiserService.deleteOrganiser(id);
  }

  @Patch(':id/approve')
  @HttpCode(HttpStatus.OK)
  @Roles(Role.Admin)
  @ApiOperation({
    summary: 'Approve or reject an organiser',
    description:
      'Admin can approve (or reject) an organiser by setting isApproved to true or false.',
  })
  @ApiOkResponse({ description: 'Organiser approval status updated' })
  @ApiBody({ type: ApproveOrganiserDto })
  approveOrganiser(
    @GetUser() admin: User,
    @Param('id') id: string,
    @Body() body: ApproveOrganiserDto,
  ) {
    if (admin) {
      return this.organiserService.setApprovalStatus(
        id,
        body.isApproved,
        body.rejectionReason,
      );
    }
  }

  @Patch(':id/suspend')
  @HttpCode(HttpStatus.OK)
  @Roles(Role.Admin)
  @ApiOperation({
    summary: 'suspend an organiser',
    description: 'Admin can suspend an organiser by setting  to true.',
  })
  @ApiOkResponse({ description: 'Organiser suspension status updated' })
  suspendOrganiser(
    @GetUser() admin: User,
    @Param('id') id: string,
    @Body() body: { suspensionReason?: string },
  ) {
    if (admin) {
      return this.organiserService.suspendOrganiser(id, body.suspensionReason);
    }
  }

  // End Organiser

  // Start Staff
  // @ApiOperation({
  //   summary: 'create a staff',
  //   description: 'Create a staff as a loggedin organiser',
  // })
  // @ApiCreatedResponse({ description: 'Created' })
  // @ApiBadRequestResponse({ description: 'Bad request' })
  // @Post('staffs')
  // @Roles(Role.Organiser)
  // createStaff(@GetUser() user: User, @Body() dto: CreateOrganiserStaffDto) {
  //   return this.organiserService.createStaff(user.id, dto);
  // }

  // @ApiOperation({
  //   summary: 'send staff invite',
  //   description: 'Send staff invite as a loggedin organiser',
  // })
  // @ApiOkResponse({ description: 'Ok' })
  // @ApiBadRequestResponse({ description: 'Bad request' })
  // @HttpCode(HttpStatus.OK)
  // @Post('staffs/:id')
  // @Roles(Role.Organiser)
  // sendInvite(@GetUser() user: User, @Param('id') id: string) {
  //   if (user) return this.organiserService.sendInvite(id);
  // }

  // @ApiOperation({
  //   summary: 'view all staff',
  //   description: 'View all staff as a loggedin organiser',
  // })
  // @ApiOkResponse({ description: 'Ok' })
  // @ApiNotFoundResponse({ description: 'Not found' })
  // @Get('staffs')
  // @Roles(Role.Organiser)
  // viewAllStaff(@GetUser() user: User) {
  //   return this.organiserService.viewAllStaff(user.id);
  // }

  // @ApiOperation({
  //   summary: 'view a staff',
  //   description: 'View a staff by ID as a loggedin organiser',
  // })
  // @ApiOkResponse({ description: 'Ok' })
  // @ApiNotFoundResponse({ description: 'Not found' })
  // @Get('staffs/:id')
  // @Roles(Role.Organiser || Role.Manager)
  // viewStaff(@GetUser() user: User, @Param('id') id: string) {
  //   return this.organiserService.viewStaff(user.id, id);
  // }

  // @ApiOperation({
  //   summary: 'delete a staff temporarily',
  //   description: 'Delete a staff by ID temporarily as a loggedin organiser',
  // })
  // @ApiNoContentResponse({ description: 'No content' })
  // @ApiNotFoundResponse({ description: 'Not found' })
  // @HttpCode(HttpStatus.NO_CONTENT)
  // @Delete('staffs/temp/:id')
  // @Roles(Role.Organiser)
  // deleteStaffTemp(@GetUser() user: User, @Param('id') id: string) {
  //   return this.organiserService.deleteStaffTemp(user.id, id);
  // }

  // @ApiOperation({
  //   summary: 'delete a staff permanently',
  //   description: 'Delete a staff by ID permanently as a loggedin organiser',
  // })
  // @ApiNoContentResponse({ description: 'No content' })
  // @ApiNotFoundResponse({ description: 'Not found' })
  // @HttpCode(HttpStatus.NO_CONTENT)
  // @Delete('staffs/:id')
  // @Roles(Role.Organiser)
  // deleteStaff(@GetUser() user: User, @Param('id') id: string) {
  //   return this.organiserService.deleteStaff(user.id, id);
  // }
  // End Staff
}
