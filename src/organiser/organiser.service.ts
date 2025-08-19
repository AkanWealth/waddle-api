import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UpdateOrganiserDto } from './dto';
import { PrismaService } from '../prisma/prisma.service';
import * as argon from 'argon2';
import { ConfigService } from '@nestjs/config';
import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import Stripe from 'stripe';
import { UpdatePasswordDto } from '../user/dto';
import { NotificationService } from '../notification/notification.service';
import { OrganiserStatus } from 'src/utils/constants/organiserTypes';
import { EventStatus } from 'src/utils/constants/eventTypes';
import { NotificationHelper } from 'src/notification/notification.helper';
import { Mailer } from 'src/helper';
import { RecentActivityType } from '@prisma/client';

@Injectable()
export class OrganiserService {
  private readonly s3Client = new S3Client({
    region: 'eu-north-1',
    credentials: {
      accessKeyId: this.config.getOrThrow('AWS_ACCESS_KEY'),
      secretAccessKey: this.config.getOrThrow('AWS_SECRET_KEY'),
    },
  });
  private stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2025-02-24.acacia',
  });

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
    private mailer: Mailer,
    private notificationService: NotificationService,
    private notificationHelper: NotificationHelper,
  ) {}

  private async createConnectAccount(userId: string) {
    const account = await this.stripe.accounts.create({
      type: 'express', // or 'standard'
    });
    // Save account ID in DB
    await this.prisma.organiser.update({
      where: { id: userId },
      data: { stripe_account_id: account.id, is_stripe_connected: true },
    });

    return account;
  }
  private async generateAccountLink(accountId: string) {
    const link = await this.stripe.accountLinks.create({
      account: accountId,
      refresh_url: 'https://api.waddleapp.io/api/v1/organisers/refresh',
      return_url: 'https://api.waddleapp.io/api/v1/organisers/return',
      type: 'account_onboarding',
    });

    return link.url;
  }

  async connect(userId: string) {
    const user = await this.prisma.organiser.findUnique({
      where: { id: userId },
    });

    let accountId = user?.stripe_account_id;

    if (!accountId) {
      const account = await this.createConnectAccount(userId);
      accountId = account.id;
    }

    const onboardingUrl = await this.generateAccountLink(accountId);
    return { status: 'success', url: onboardingUrl };
  }

  async disconnect(userId: string) {
    const user = await this.prisma.organiser.findUnique({
      where: { id: userId },
      select: { stripe_account_id: true, is_stripe_connected: true },
    });

    if (!user?.stripe_account_id) {
      throw new Error('No Stripe account connected');
    }

    await this.stripe.oauth.deauthorize({
      client_id: process.env.STRIPE_CLIENT_ID,
      stripe_user_id: user.stripe_account_id,
    });

    await this.prisma.organiser.update({
      where: { id: userId },
      data: { stripe_account_id: null, is_stripe_connected: false },
    });
    return { status: 'success', message: 'Stripe disconnected' };
  }

  async isStripeConnected(
    organiserId: string,
  ): Promise<{ status: string; message: string; data: boolean }> {
    const organiser = await this.prisma.organiser.findUnique({
      where: { id: organiserId },
      select: {
        stripe_account_id: true,
        is_stripe_connected: true,
      },
    });

    if (!organiser) {
      throw new NotFoundException('Organiser not found');
    }

    const connected =
      !!organiser.stripe_account_id && organiser.is_stripe_connected === true;

    return {
      status: 'success',
      message: 'Stripe is connected successfully',
      data: connected,
    };
  }

  async saveOrganiserFcmToken(userId: string, token: string) {
    if (!userId || !token) {
      throw new BadRequestException('User ID and token are required.');
    }

    try {
      await this.prisma.organiser.update({
        where: { id: userId },
        data: { fcmToken: token },
      });

      return { message: 'FCM token updated successfully' };
    } catch (error) {
      console.error('Error saving FCM token:', error);
      if (error.code === 'P2025') {
        throw new NotFoundException(
          'Organiser with the provided ID does not exist.',
        );
      }
      throw error;
    }
  }

  async togglePushNotififcation(userId: string) {
    try {
      const existingOrganiser = await this.prisma.organiser.findUnique({
        where: { id: userId },
      });

      if (!existingOrganiser) {
        throw new NotFoundException(
          'Organiser with the provided ID does not exist.',
        );
      }

      if (existingOrganiser.fcmIsOn) {
        await this.prisma.organiser.update({
          where: { id: userId },
          data: {
            fcmIsOn: false,
          },
        });
      } else {
        await this.prisma.organiser.update({
          where: { id: userId },
          data: {
            fcmIsOn: true,
          },
        });
      }

      return { message: 'Notification status updated' };
    } catch (error) {
      throw error;
    }
  }

  async viewAllOrganiser() {
    try {
      const organiser = await this.prisma.organiser.findMany({
        where: {
          isProfileCompleted: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      const organisersWithLogo = organiser.map((list) => {
        const business_logo = `${process.env.S3_PUBLIC_URL}/${this.config.getOrThrow('S3_VENDOR_FOLDER')}/${list.business_logo}`;
        return {
          ...list,
          business_logo,
        };
      });

      return { message: 'All organisers found', organiser: organisersWithLogo };
    } catch (error) {
      throw error;
    }
  }

  async viewAllOrganiserPreviousEvents(organiserId: string) {
    try {
      const organiser = await this.prisma.organiser.findUnique({
        where: { id: organiserId },
        include: {
          events: {
            where: {
              isDeleted: false,
            },
            orderBy: {
              createdAt: 'desc',
            },
            include: {
              bookings: {
                where: {
                  isDeleted: false,
                  status: 'Confirmed', // or all bookings if needed
                },
              },
            },
          },
        },
      });

      if (!organiser) {
        throw new NotFoundException(
          'Organiser with the provided ID does not exist.',
        );
      }

      const now = new Date();

      let totalAttendees = 0;
      let upcomingEvents = 0;
      let pastEvents = 0;

      const eventsWithExtras = organiser.events.map((event) => {
        const event_logo = `${process.env.S3_PUBLIC_URL}/${this.config.getOrThrow(
          'S3_EVENT_FOLDER',
        )}/${event.files[0]}`;

        const isUpcoming = event.date > now;
        const isApproved = event.status === EventStatus.APPROVED;

        if (isUpcoming && isApproved) upcomingEvents++;
        else if (!isUpcoming) pastEvents++;

        const totalEventAttendees = event.bookings.reduce(
          (acc, booking) => acc + booking.ticket_quantity,
          0,
        );
        totalAttendees += totalEventAttendees;

        return {
          ...event,
          event_logo,
          totalEventAttendees,
          isUpcoming,
        };
      });

      return {
        message: 'Organiser events overview fetched successfully',
        totalEventsCreated: organiser.events.length,
        upcomingEvents,
        pastEvents,
        totalAttendees,
        events: eventsWithExtras,
      };
    } catch (error) {
      console.error(error);
      throw new NotFoundException(
        'Organiser with the provided ID does not exist.',
      );
    }
  }

  async viewMe(authOrganiser: string) {
    try {
      const organiser = await this.prisma.organiser.findUnique({
        where: { id: authOrganiser },
      });

      const business_logo = `${process.env.S3_PUBLIC_URL}/${this.config.getOrThrow('S3_VENDOR_FOLDER')}/${organiser.business_logo}`;

      return {
        message: 'Profile found',
        organiser: { ...organiser, business_logo },
      };
    } catch (error) {
      throw error;
    }
  }

  async updateProfile(
    id: string,
    dto: UpdateOrganiserDto,
    fileName?: string,
    file?: Buffer,
  ) {
    try {
      const existingOrganiser = await this.prisma.organiser.findUnique({
        where: { id },
      });

      if (!existingOrganiser) {
        throw new NotFoundException(
          'Organiser with the provided ID does not exist.',
        );
      }

      let businessLogo = existingOrganiser.business_logo || undefined;

      // Upload new logo if changed
      if (fileName && businessLogo !== fileName) {
        await this.s3Client.send(
          new PutObjectCommand({
            Bucket: this.config.getOrThrow('AWS_BUCKET_NAME'),
            Key: `${this.config.getOrThrow('S3_VENDOR_FOLDER')}/${fileName}`,
            Body: file,
          }),
        );

        // Delete old logo
        if (businessLogo) {
          await this.s3Client.send(
            new DeleteObjectCommand({
              Bucket: this.config.getOrThrow('AWS_BUCKET_NAME'),
              Key: `${this.config.getOrThrow('S3_VENDOR_FOLDER')}/${businessLogo}`,
            }),
          );
        }

        businessLogo = fileName;
      }

      // Hash password if provided
      if (dto.password) {
        const hashed = await argon.hash(dto.password);

        const user = await this.prisma.organiser.update({
          where: { id },
          data: {
            ...dto,
            business_logo: businessLogo || null,
            password: hashed,
          },
        });

        delete user.password;
        return user;
      }

      // Filter out undefined values from dto
      const data: any = {
        ...Object.fromEntries(
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          Object.entries(dto).filter(([_, value]) => value !== undefined),
        ),
        ...(businessLogo !== undefined && { business_logo: businessLogo }),
      };

      // Check for unique business_name if updating it
      if ('business_name' in data && data.business_name) {
        const existing = await this.prisma.organiser.findFirst({
          where: {
            business_name: data.business_name,
            NOT: { id },
          },
        });

        if (existing) {
          throw new BadRequestException('Business name is already taken');
        }
      }

      // Update organiser
      const user = await this.prisma.organiser.update({
        where: { id },
        data,
      });

      if (!user) {
        throw new NotFoundException('Organiser not found');
      }

      // Fetch updated organiser to verify completeness
      const updated = await this.prisma.organiser.findUnique({
        where: { id },
      });

      const requiredFields = [
        'name',
        'email',
        'business_name',
        'phone_number',
        'address',
        'description',
        'attachment',
      ];

      const isProfileCompleted = requiredFields.every((field) => {
        return !!updated?.[field];
      });

      if (updated?.isProfileCompleted !== isProfileCompleted) {
        await this.prisma.organiser.update({
          where: { id },
          data: {
            isProfileCompleted,
          },
        });
      }

      delete user.password;
      return { message: 'Profile updated', user };
    } catch (error) {
      throw error;
    }
  }

  async updatePassword(id: string, dto: UpdatePasswordDto) {
    try {
      const existingOrganiser = await this.prisma.organiser.findUnique({
        where: { id },
      });
      if (!existingOrganiser) {
        throw new NotFoundException(
          'Organiser with the provided ID does not exist.',
        );
      }

      const isMatch = await argon.verify(
        existingOrganiser.password,
        dto.old_password,
      );
      if (!isMatch) throw new BadRequestException('Old password is incorrect');

      const hashed = await argon.hash(dto.new_password);

      const organiser = await this.prisma.organiser.update({
        where: { id: existingOrganiser.id },
        data: {
          password: hashed,
        },
      });

      delete organiser.password;
      return { message: 'Password updated successful', organiser };
    } catch (error) {
      throw error;
    }
  }

  async deleteOrganiserTemp(id: string) {
    try {
      const existingOrganiser = await this.prisma.organiser.findUnique({
        where: { id },
      });

      if (!existingOrganiser)
        throw new NotFoundException('Organiser not found');

      await this.prisma.organiser.update({
        where: { id: existingOrganiser.id },
        data: { isDeleted: true },
      });

      return { mesaage: 'Organiser deleted' };
    } catch (error) {
      throw error;
    }
  }

  async deleteOrganiser(id: string) {
    try {
      const existingOrganiser = await this.prisma.organiser.findUnique({
        where: { id },
      });

      if (!existingOrganiser)
        throw new NotFoundException('Organiser not found');

      const organiser = await this.prisma.organiser.delete({
        where: { id: existingOrganiser.id },
      });

      if (organiser?.business_logo) {
        await this.s3Client.send(
          new DeleteObjectCommand({
            Bucket: this.config.getOrThrow('AWS_BUCKET_NAME'),
            Key: `${this.config.getOrThrow('S3_VENDOR_FOLDER')}/${organiser.business_logo}`,
          }),
        );
      }

      return { mesaage: 'Organiser deleted' };
    } catch (error) {
      throw error;
    }
  }

  async setApprovalStatus(
    id: string,
    isApproved: boolean,
    rejectionReason: string,
  ) {
    try {
      const updated = await this.prisma.organiser.update({
        where: { id },
        data: {
          isApproved: isApproved ? true : false,
          rejectionReason: isApproved ? '' : rejectionReason,
          status: isApproved
            ? OrganiserStatus.APPROVED
            : OrganiserStatus.REJECTED,
        },
      });

      // Prepare email details
      let subject: string;
      let message: string;

      if (isApproved) {
        subject = 'Your Waddle Vendor Account Has Been Approved 🎉';
        message = `
        <p>Hello ${updated.name},</p>
        <p>Good news! Your vendor account has been successfully verified and approved. You can now start creating and managing your events on Waddle.</p>

        <p><b>Next Steps:</b></p>
        <ul>
          <li>Log in to your account</li>
          <li>Set up your event listings</li>
          <li>Start receiving bookings from parents</li>
        </ul>

        <p>We’re excited to have you on board. Let’s make great events happen!</p>

        <p>Best regards,<br> The Waddle Team</p>
      `;
      } else {
        subject = 'Your Waddle Vendor Verification Status';
        message = `
  <p>Hello ${updated.name},</p>
  <p>After reviewing your vendor application, we’re unable to approve your account at this time.</p>
  
  <p><b>Reason provided by our team:</b></p>
  <p>${rejectionReason}</p>

  <p><b>What to do next:</b></p>
  <ul>
    <li>Review your submitted information</li>
    <li>Ensure all required documents are clear and valid</li>
    <li>Re-submit your application for verification</li>
  </ul>

  <p>We’d be happy to verify you once the necessary details are provided.</p>

  <p>Best regards,<br>Waddle Team</p>
`;
      }

      // Send email
      try {
        await this.mailer.sendMail(updated.email, subject, message);
      } catch (emailError) {
        console.error('Failed to send approval email:', emailError);
        // Continue with the process even if email fails
      }

      // Send any in-app notification if needed
      try {
        await this.notificationHelper.sendAccountApprovalStatusAlert(
          id,
          updated.name,
          isApproved,
        );
      } catch (notificationError) {
        console.error(
          'Failed to send approval notification:',
          notificationError,
        );
        // Continue with the process even if notification fails
      }

      return {
        message: `Organiser ${isApproved ? 'approved' : 'rejected'}`,
        organiser: updated,
      };
    } catch (error) {
      if (error.code === 'P2025') {
        throw new NotFoundException('Organiser not found');
      }
      throw error;
    }
  }

  async suspendOrganiser(id: string, suspensionReason: string) {
    try {
      const updated = await this.prisma.organiser.update({
        where: { id },
        data: {
          status: OrganiserStatus.SUSPENDED,
          suspensionReason,
        },
      });

      // Send email notification to the organiser
      const subject = 'Your Waddle Vendor Account Has Been Suspended';
      const message = `
        <p>Hello ${updated.name},</p>
        <p>We regret to inform you that your vendor account has been suspended due to a policy violation.</p>
        
        <p><b>Reason for suspension:</b></p>
        <p>${suspensionReason}</p>
        
        <p><b>What this means:</b></p>
        <ul>
          <li>Your account is temporarily disabled</li>
          <li>You cannot create or manage events</li>
          <li>Existing bookings may be affected</li>
        </ul>
        
        <p><b>Next steps:</b></p>
        <ul>
          <li>Review the reason for suspension</li>
          <li>Address any issues mentioned above</li>
          <li>Contact our support team if you believe this is an error</li>
        </ul>
        
        <p>If you have any questions or concerns, please don't hesitate to reach out to our support team.</p>
        
        <p>Best regards,<br> The Waddle Team</p>
      `;

      // Send email notification to the organiser
      try {
        await this.mailer.sendMail(updated.email, subject, message);
      } catch (emailError) {
        console.error('Failed to send suspension email:', emailError);
        // Continue with the process even if email fails
      }

      // Send in-app notification
      try {
        await this.notificationHelper.sendAccountSuspensionAlert(
          id,
          updated.name,
          suspensionReason,
        );
      } catch (notificationError) {
        console.error(
          'Failed to send suspension notification:',
          notificationError,
        );
        // Continue with the process even if notification fails
      }

      return {
        message: `Organiser suspended`,
        organiser: updated,
      };
    } catch (error) {
      if (error.code === 'P2025') {
        throw new NotFoundException('Organiser not found');
      }
      throw error;
    }
  }

  async createOrganiserRecentActivity(data: {
    organiserId: string;
    type: RecentActivityType;
    amount: string;
    title: string;
  }) {
    try {
      return await this.prisma.recentActivity.create({ data });
    } catch (error) {
      throw error;
    }
  }

  async getOrganiserRecentActivities(organiserId: string, limit = 20) {
    const recentActivities = await this.prisma.recentActivity.findMany({
      where: { organiserId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    return { success: true, data: recentActivities };
  }

  // async fetchOrganizerAnalytics(){}

  // End Organiser

  // Start staff
  // async createStaff(organiserId: string, dto: CreateOrganiserStaffDto) {
  //   try {
  //     const existingOrganiserEmail = await this.prisma.organiser.findUnique({
  //       where: { email: dto.email },
  //     });
  //     const existingStaffEmail = await this.prisma.organiserStaff.findUnique({
  //       where: { email: dto.email },
  //     });
  //     if (existingOrganiserEmail || existingStaffEmail)
  //       throw new BadRequestException('Email has been used.');

  //     const hashedPassword = await argon.hash(dto.password);
  //     const staff = await this.prisma.organiserStaff.create({
  //       data: {
  //         ...dto,
  //         role: dto.role as OrganiserRole,
  //         password: hashedPassword,
  //         organiser: { connect: { id: organiserId } },
  //       },
  //     });

  //     await this.sendInvite(staff.id);

  //     return { message: 'Staff created and invite sent' };
  //   } catch (error) {
  //     throw error;
  //   }
  // }

  // async sendInvite(id: string) {
  //   try {
  //     if (!id) throw new BadRequestException('Id is required');

  //     const staff = await this.prisma.organiserStaff.findUnique({
  //       where: { id },
  //     });
  //     if (!staff) throw new NotFoundException('Not found');

  //     // generate token and expiration time
  //     const resetToken = Math.random().toString(36).substr(2);
  //     const resetTokenExpiration = Date.now() + 3600000; // 1 hour

  //     await this.prisma.organiserStaff.update({
  //       where: { id: staff.id },
  //       data: {
  //         reset_token: resetToken,
  //         reset_expiration: resetTokenExpiration.toString(),
  //       },
  //     });

  //     const subject = 'Vendor Invite';
  //     const message = `<p>Hello ${staff.name},</p>

  //       <p>I hope this mail finds you well. Pleae note that you have been invited to manage events for your company.</p>

  //       <p>Kindly follow the steps below to reset your passowrd.</p>

  //       <ul>
  //         <li>Click the link to reset the password: https://waddleapp.io/organiser/staff/reset-password</li>
  //         <li>Use the token <b>${resetToken}</b> to reset your password.</li>
  //       </ul>

  //       <p>Warm regards,</p>

  //       <p><b>Waddle Team</b></p>
  //     `;

  //     await this.notificationService.sendMail(staff.email, subject, message);
  //     return { message: 'Invite sent' };
  //   } catch (error) {
  //     throw error;
  //   }
  // }

  // async viewAllStaff(organiserId: string) {
  //   const staffs = await this.prisma.organiserStaff.findMany({
  //     where: { organiserId },
  //   });
  //   if (!staffs || staffs.length <= 0) throw new NotFoundException('Not found');

  //   return { message: 'All staff found', staffs };
  // }

  // async viewStaff(organiserId: string, id: string) {
  //   const staff = await this.prisma.organiserStaff.findUnique({
  //     where: { id, organiserId },
  //   });
  //   if (!staff) throw new NotFoundException('Not found');

  //   return { message: 'Staff found', staff };
  // }

  // async deleteStaffTemp(organiserId: string, id: string) {
  //   const findStaff = await this.prisma.organiserStaff.findUnique({
  //     where: { id, organiserId },
  //   });
  //   if (!findStaff) throw new NotFoundException('Not found');

  //   await this.prisma.organiserStaff.update({
  //     where: { id: findStaff.id },
  //     data: { isDeleted: true },
  //   });
  //   return { message: 'Staff deleted' };
  // }

  // async deleteStaff(organiserId: string, id: string) {
  //   const findStaff = await this.prisma.organiserStaff.findUnique({
  //     where: { id, organiserId },
  //   });
  //   if (!findStaff) throw new NotFoundException('Not found');

  //   await this.prisma.organiserStaff.delete({ where: { id: findStaff.id } });
  //   return { message: 'Staff deleted' };
  // }
  // End Staff
}
