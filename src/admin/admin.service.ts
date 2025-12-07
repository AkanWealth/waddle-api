import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as argon from 'argon2';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { CreateAdminDto, EditAdminDto, UpdateAdminDto } from './dto';
import { UpdatePasswordDto } from '../user/dto';
import { Mailer } from '../helper';
import { NotificationHelper } from '../notification/notification.helper';
import { CommentStatus, CrowdSourceStatus, ReportStatus } from '@prisma/client';

@Injectable()
export class AdminService {
  constructor(
    private prisma: PrismaService,
    private mailer: Mailer,
    private notificationHelper: NotificationHelper,
  ) {}

  async createAdmin(dto: CreateAdminDto) {
    try {
      const [existingEmail, hash] = await Promise.all([
        this.prisma.admin.findUnique({
          where: { email: dto.email },
          select: { id: true },
        }),
        argon.hash(dto.password),
      ]);

      if (existingEmail) throw new BadRequestException('Email already in use');

      const resetToken = Math.random().toString(36).slice(2);
      const resetTokenExpiration = Date.now() + 3600000; // 1 hour

      // 2. Create admin first
      const admin = await this.prisma.admin.create({
        data: {
          email: dto.email,
          first_name: dto.first_name,
          last_name: dto.last_name,
          role: dto.role,
          password: hash,
          reset_token: resetToken,
          reset_expiration: resetTokenExpiration.toString(),
        },
      });

      if (dto.permissions && Object.keys(dto.permissions).length > 0) {
        const permissionEntries = Object.entries(dto.permissions);

        const permissionOperations = permissionEntries.map(
          ([module, actions]) =>
            this.prisma.adminPermission.upsert({
              where: {
                adminId_module: {
                  adminId: admin.id,
                  module,
                },
              },
              update: {
                canCreate: actions.create,
                canView: actions.view,
                canManage: actions.manage,
                canDelete: actions.delete,
              },
              create: {
                adminId: admin.id,
                module,
                canCreate: actions.create,
                canView: actions.view,
                canManage: actions.manage,
                canDelete: actions.delete,
              },
            }),
        );

        await Promise.all(permissionOperations);
      }

      // 4. Send invite after DB ops
      this.sendInviteWeb(admin.id); // Don't await if it's non-critical

      return { message: 'Admin created and invite sent' };
    } catch (error) {
      if (
        error instanceof PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new BadRequestException('Credentials Taken');
      }
      throw error;
    }
  }

  async editAdmin(id: string, payload: EditAdminDto) {
    const { firstName, lastName, emailAddress, role, permissions } = payload;

    try {
      if (!id) throw new BadRequestException('Admin ID is required');

      // Update basic info
      const updatedAdmin = await this.prisma.admin.update({
        where: { id },
        data: {
          first_name: firstName,
          last_name: lastName,
          email: emailAddress,
          role,
        },
      });

      // Upsert permissions
      const permissionPromises = Object.entries(permissions).map(
        async ([module, actions]) => {
          return this.prisma.adminPermission.upsert({
            where: {
              adminId_module: {
                adminId: id,
                module,
              },
            },
            update: {
              canCreate: actions.create,
              canView: actions.view,
              canManage: actions.manage,
              canDelete: actions.delete,
            },
            create: {
              adminId: id,
              module,
              canCreate: actions.create,
              canView: actions.view,
              canManage: actions.manage,
              canDelete: actions.delete,
            },
          });
        },
      );

      await Promise.all(permissionPromises);

      return {
        message: `Admin (${updatedAdmin.first_name} ${updatedAdmin.last_name}) successfully updated`,
      };
    } catch (error) {
      if (error.code === 'P2025') {
        throw new NotFoundException('Admin not found');
      }

      console.error('Error editing admin:', error);
      throw error;
    }
  }

  async deactivateAdmin(id: string) {
    try {
      if (!id) {
        throw new BadRequestException('Admin ID is required');
      }

      const updatedAdmin = await this.prisma.admin.update({
        where: { id },
        data: { activationStatus: 'INACTIVE' },
      });

      console.log('Deactivated admin:', updatedAdmin);

      return {
        message: `Admin (${updatedAdmin.first_name} ${updatedAdmin.last_name}) successfully deactivated`,
      };
    } catch (error) {
      if (error.code === 'P2025') {
        throw new NotFoundException('Admin not found');
      }

      throw error;
    }
  }

  async reactivateAdmin(id: string) {
    try {
      if (!id) {
        throw new BadRequestException('Admin ID is required');
      }

      const updatedAdmin = await this.prisma.admin.update({
        where: { id },
        data: { activationStatus: 'ACTIVE' },
      });

      return {
        message: `Admin (${updatedAdmin.first_name} ${updatedAdmin.last_name}) successfully reactivated`,
      };
    } catch (error) {
      if (error.code === 'P2025') {
        throw new NotFoundException('Admin not found');
      }

      console.error('Error reactivating admin:', error);
      throw error;
    }
  }

  async sendInvite(id: string) {
    try {
      if (!id) throw new BadRequestException('Id is required');

      const subAdmin = await this.prisma.admin.findUnique({
        where: { id },
      });
      if (!subAdmin) throw new NotFoundException('Not found');

      // generate token and expiration time
      const resetToken = Math.random().toString(36).substr(2);
      const resetTokenExpiration = Date.now() + 3600000; // 1 hour

      await this.prisma.admin.update({
        where: { id: subAdmin.id },
        data: {
          reset_token: resetToken,
          reset_expiration: resetTokenExpiration.toString(),
        },
      });

      const subject = 'Waddle Admin Invite';
      const message = `<p>Hello ${subAdmin.first_name},</p>
    <
          <p>I hope this mail finds you well. Please note that you have been invited to manage the waddle app.</p>
  
          <p>Kindly follow the steps below to reset your passowrd.</p>
  
          <ul>
            <li>Click the link to reset the password: <a href="https://www.waddleapp.io/set-password?token=${resetToken}">https://www.waddleapp.io/set-password?token= ${resetToken}</a></li>
          </ul>
    
          <p>Warm regards,</p>
    
          <p><b>Waddle Team</b></p>
        `;

      await this.mailer.sendMail(subAdmin.email, subject, message);
      return { message: 'Invite sent' };
    } catch (error) {
      throw error;
    }
  }

  async sendInviteWeb(id: string) {
    try {
      if (!id) throw new BadRequestException('Id is required');

      const subAdmin = await this.prisma.admin.findUnique({
        where: { id },
      });
      if (!subAdmin) throw new NotFoundException('Not found');

      // generate token and expiration time
      const resetToken = Math.random().toString(36).substr(2);
      const resetTokenExpiration = Date.now() + 3600000; // 1 hour

      await this.prisma.admin.update({
        where: { id: subAdmin.id },
        data: {
          reset_token: resetToken,
          reset_expiration: resetTokenExpiration.toString(),
        },
      });

      const setUpPasswordUrl = `https://www.waddleapp.io/set-password?token=${resetToken}`;
      const subject = 'Waddle Admin Invite';
      const message = `<p>Hello ${subAdmin.first_name},</p>
    <
          <p>I hope this mail finds you well. Please note that you have been invited to manage the waddle app.</p>
          <p>Kindly follow the steps below to set up your password.</p>

          <p><a href="${setUpPasswordUrl}" target="_blank">${setUpPasswordUrl}</a></p>
          <p>This link will expire within an hour. If you did not request this, please ignore this email.</p>
    
          <p>Warm regards,</p>
    
          <p><b>Waddle Team</b></p>
        `;

      await this.mailer.sendMail(subAdmin.email, subject, message);
      return { message: 'Invite sent' };
    } catch (error) {
      throw error;
    }
  }

  async viewAllAdmin() {
    try {
      const admin = await this.prisma.admin.findMany({
        where: {
          isDeleted: false,
        },
        orderBy: {
          createdAt: 'desc',
        },
        include: {
          permissions: {
            select: {
              module: true,
              canCreate: true,
              canView: true,
              canManage: true,
              canDelete: true,
            },
          },
        },
      });

      if (!admin || admin.length <= 0) {
        throw new NotFoundException('No admin found');
      }

      return { message: 'All admin found', admin };
    } catch (error) {
      throw error;
    }
  }

  async viewAllSoftDeletedAdmin() {
    try {
      const admin = await this.prisma.admin.findMany({
        where: {
          isDeleted: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
        include: {
          permissions: {
            select: {
              module: true,
              canCreate: true,
              canView: true,
              canManage: true,
              canDelete: true,
            },
          },
        },
      });

      if (!admin || admin.length <= 0) {
        throw new NotFoundException('No admin found');
      }

      return { message: 'All admin found', admin };
    } catch (error) {
      throw error;
    }
  }

  async viewMe(authAdmin: string) {
    try {
      const admin = await this.prisma.admin.findUnique({
        where: { id: authAdmin },
        include: {
          permissions: true, // This will fetch all related permissions
        },
      });

      if (!admin) throw new NotFoundException('No admin found');

      return { message: 'Profile found', admin };
    } catch (error) {
      throw error;
    }
  }

  async saveAdminFcmToken(userId: string, token: string) {
    try {
      const existingAdmin = await this.prisma.admin.findUnique({
        where: { id: userId },
      });

      if (!existingAdmin) {
        throw new NotFoundException(
          'Admin with the provided ID does not exist.',
        );
      }

      await this.prisma.admin.update({
        where: { id: userId },
        data: {
          fcmToken: token,
        },
      });

      return { message: 'FCM token updated successfully' };
    } catch (error) {
      throw error;
    }
  }

  async togglePushNotififcation(userId: string) {
    try {
      const existingAdmin = await this.prisma.admin.findUnique({
        where: { id: userId },
      });

      if (!existingAdmin) {
        throw new NotFoundException(
          'Admin with the provided ID does not exist.',
        );
      }

      if (existingAdmin.fcmIsOn) {
        await this.prisma.admin.update({
          where: { id: userId },
          data: {
            fcmIsOn: false,
          },
        });
      } else {
        await this.prisma.admin.update({
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

  async updateProfile(id: string, dto: UpdateAdminDto) {
    try {
      const existingAdmin = await this.prisma.admin.findUnique({
        where: { id },
      });

      if (!existingAdmin) {
        throw new NotFoundException(
          'Admin with the provided ID does not exist.',
        );
      }

      if (dto.password) {
        const hashed = await argon.hash(dto.password);

        const admin = await this.prisma.admin.update({
          where: { id },
          data: {
            ...dto,
            password: hashed,
          },
        });

        delete admin.password;
        return { message: 'Profile updated', admin };
      }

      // if no password is provided, update the admin without changing the password
      const admin = await this.prisma.admin.update({
        where: { id },
        data: { ...dto },
      });

      delete admin.password;
      return { message: 'Profile updated', admin };
    } catch (error) {
      throw error;
    }
  }

  async updatePassword(id: string, dto: UpdatePasswordDto) {
    try {
      const existingAdmin = await this.prisma.admin.findUnique({
        where: { id },
      });
      if (!existingAdmin) {
        throw new NotFoundException(
          'Admin with the provided ID does not exist.',
        );
      }

      const isMatch = await argon.verify(
        existingAdmin.password,
        dto.old_password,
      );
      if (!isMatch) throw new BadRequestException('Old password is incorrect');

      const hashed = await argon.hash(dto.new_password);

      const admin = await this.prisma.admin.update({
        where: { id: existingAdmin.id },
        data: {
          password: hashed,
        },
      });

      delete admin.password;
      return { message: 'Password updated successful', admin };
    } catch (error) {
      throw error;
    }
  }

  async deleteAdmin(id: string) {
    try {
      const existingAdmin = await this.prisma.admin.findUnique({
        where: { id },
      });

      if (!existingAdmin) throw new NotFoundException('Admin not found');

      await this.prisma.admin.delete({
        where: { id: existingAdmin.id },
      });

      return { mesaage: 'Admin deleted' };
    } catch (error) {
      throw error;
    }
  }

  async deleteAdminWeb(id: string) {
    try {
      const result = await this.prisma.admin.updateMany({
        where: {
          id,
          isDeleted: false,
        },
        data: {
          isDeleted: true,
        },
      });

      if (result.count === 0) {
        throw new NotFoundException('Admin not found or already deleted');
      }

      return { message: 'Admin successfully soft deleted' };
    } catch (error) {
      throw error;
    }
  }

  async restoreDeletedAdmin(id: string) {
    try {
      const result = await this.prisma.admin.updateMany({
        where: {
          id,
          isDeleted: true,
        },
        data: {
          isDeleted: false,
        },
      });

      if (result.count === 0) {
        throw new NotFoundException('Admin not found or already restored');
      }

      return { message: 'Admin successfully restored' };
    } catch (error) {
      throw error;
    }
  }
  async markVendorAsWaddleApproved(
    vendorId: string,
    isWaddleApproved: boolean,
  ) {
    try {
      const vendor = await this.prisma.organiser.findUnique({
        where: { id: vendorId },
        include: {
          NotificationPreference: true,
        },
      });
      if (!vendor) {
        throw new NotFoundException('Vendor not found');
      }
      await this.prisma.organiser.update({
        where: { id: vendorId },
        data: { isWaddleApproved: isWaddleApproved },
      });
      // if(vendor.NotificationPreference.e) {
      if (isWaddleApproved) {
        await this.notificationHelper.sendWaddleApprovedTagToVendorNotification(
          vendorId,
          vendor.name,
        );
      } else {
        await this.notificationHelper.removeWaddleApprovedTagToVendorNotification(
          vendorId,
          vendor.name,
        );
      }

      return {
        message: ` Vendor successfully ${isWaddleApproved ? 'marked as Waddle Approved' : 'removed from Waddle Approved'}`,
      };
    } catch (error) {
      throw error;
    }
  }

  async getUserActivitys(startDate: Date, endDate: Date) {
    // const currentYear = startDate.getFullYear();

    const [userStats, organizerStats, rawMonthlyData] = await Promise.all([
      this.prisma.user.groupBy({
        by: ['role', 'isLocked'],
        where: {
          isDeleted: false,
          createdAt: { gte: startDate, lt: endDate },
        },
        _count: { id: true },
        _min: { createdAt: true },
      }),
      this.prisma.organiser.groupBy({
        by: ['isDeleted'],
        where: {
          isDeleted: false,
          createdAt: { gte: startDate, lt: endDate },
        },
        _count: { id: true },
        _min: { createdAt: true },
      }),
      this.prisma.$queryRaw<
        Array<{
          year: number;
          month: number;
          parents_count: bigint;
          organizers_count: bigint;
        }>
      >`
        SELECT 
          EXTRACT(YEAR FROM u."createdAt") AS year,
          EXTRACT(MONTH FROM u."createdAt") AS month,
          COUNT(CASE WHEN u.role = 'GUARDIAN' AND u."isDeleted" = false THEN 1 END) AS parents_count,
          0 AS organizers_count
        FROM "user" u
        WHERE u."createdAt" >= ${startDate} AND u."createdAt" < ${endDate}
        GROUP BY year, month
  
        UNION ALL
  
        SELECT 
          EXTRACT(YEAR FROM o."createdAt") AS year,
          EXTRACT(MONTH FROM o."createdAt") AS month,
          0 AS parents_count,
          COUNT(CASE WHEN o."isDeleted" = false THEN 1 END) AS organizers_count
        FROM "organiser" o
        WHERE o."createdAt" >= ${startDate} AND o."createdAt" < ${endDate}
        GROUP BY year, month
      `,
    ]);

    const aggregateCount = (
      data: typeof userStats,
      filterFn: (item: (typeof userStats)[number]) => boolean,
    ) => data.filter(filterFn).reduce((sum, item) => sum + item._count.id, 0);

    const isInRange = (date: Date) =>
      new Date(date) >= startDate && new Date(date) < endDate;

    // Totals
    const totalUsers = aggregateCount(userStats, (s) =>
      isInRange(s._min.createdAt),
    );
    const totalParents = aggregateCount(
      userStats,
      (s) => isInRange(s._min.createdAt) && s.role === 'GUARDIAN',
    );
    const totalInactive = aggregateCount(
      userStats,
      (s) => isInRange(s._min.createdAt) && s.isLocked === true,
    );
    const totalOrganizers = organizerStats
      .filter((s) => isInRange(s._min.createdAt))
      .reduce((sum, s) => sum + s._count.id, 0);

    const userStatsResponse = [
      { type: 'total_users', title: 'Total Users', count: totalUsers },
      { type: 'parents', title: 'Parents', count: totalParents },
      { type: 'organisers', title: 'Event Organisers', count: totalOrganizers },
      { type: 'inactive', title: 'Inactive Users', count: totalInactive },
    ];

    return {
      userStats: userStatsResponse,
      monthlyData: this.processMonthlyGrowthData(
        rawMonthlyData,
        startDate,
        endDate,
      ),
      hasData: totalUsers > 0 || totalOrganizers > 0,
    };
  }

  // async getUserActivity() {
  //   const now = new Date();
  //   const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  //   const previousMonthStart = new Date(
  //     now.getFullYear(),
  //     now.getMonth() - 1,
  //     1,
  //   );
  //   const currentYear = now.getFullYear();

  //   const [userStats, organizerStats, rawMonthlyData] = await Promise.all([
  //     this.prisma.user.groupBy({
  //       by: ['role', 'isLocked'],
  //       where: {
  //         isDeleted: false,
  //         createdAt: { gte: previousMonthStart },
  //       },
  //       _count: { id: true },
  //       _min: { createdAt: true },
  //     }),
  //     this.prisma.organiser.groupBy({
  //       by: ['isDeleted'],
  //       where: {
  //         isDeleted: false,
  //         createdAt: { gte: previousMonthStart },
  //       },
  //       _count: { id: true },
  //       _min: { createdAt: true },
  //     }),
  //     this.prisma.$queryRaw<
  //       Array<{
  //         month: number;
  //         parents_count: bigint;
  //         organizers_count: bigint;
  //       }>
  //     >`
  //       SELECT
  //         EXTRACT(MONTH FROM "createdAt") as month,
  //         COUNT(CASE WHEN u.role = 'GUARDIAN' AND u."isDeleted" = false THEN 1 END) as parents_count,
  //         0 as organizers_count
  //       FROM "user" u
  //       WHERE EXTRACT(YEAR FROM u."createdAt") = ${currentYear}
  //       GROUP BY EXTRACT(MONTH FROM "createdAt")

  //       UNION ALL

  //       SELECT
  //         EXTRACT(MONTH FROM "createdAt") as month,
  //         0 as parents_count,
  //         COUNT(CASE WHEN o."isDeleted" = false THEN 1 END) as organizers_count
  //       FROM "organiser" o
  //       WHERE EXTRACT(YEAR FROM o."createdAt") = ${currentYear}
  //       GROUP BY EXTRACT(MONTH FROM "createdAt")
  //     `,
  //   ]);

  //   const aggregateCount = (
  //     data: typeof userStats,
  //     filterFn: (item: (typeof userStats)[number]) => boolean,
  //   ) => data.filter(filterFn).reduce((sum, item) => sum + item._count.id, 0);

  //   const isCurrent = (date: Date) => new Date(date) >= currentMonthStart;
  //   const isPrevious = (date: Date) =>
  //     new Date(date) >= previousMonthStart &&
  //     new Date(date) < currentMonthStart;

  //   // Users
  //   const currentTotalUsers = aggregateCount(userStats, (s) =>
  //     isCurrent(s._min.createdAt),
  //   );
  //   const currentParents = aggregateCount(
  //     userStats,
  //     (s) => isCurrent(s._min.createdAt) && s.role === 'GUARDIAN',
  //   );
  //   const currentInactive = aggregateCount(
  //     userStats,
  //     (s) => isCurrent(s._min.createdAt) && s.isLocked === true,
  //   );

  //   const previousTotalUsers = aggregateCount(userStats, (s) =>
  //     isPrevious(s._min.createdAt),
  //   );
  //   const previousParents = aggregateCount(
  //     userStats,
  //     (s) => isPrevious(s._min.createdAt) && s.role === 'GUARDIAN',
  //   );
  //   const previousInactive = aggregateCount(
  //     userStats,
  //     (s) => isPrevious(s._min.createdAt) && s.isLocked === true,
  //   );

  //   // Organizers
  //   const currentOrganizers = organizerStats
  //     .filter((s) => isCurrent(s._min.createdAt))
  //     .reduce((sum, s) => sum + s._count.id, 0);

  //   const previousOrganizers = organizerStats
  //     .filter((s) => isPrevious(s._min.createdAt))
  //     .reduce((sum, s) => sum + s._count.id, 0);

  //   const calculateChange = (current: number, previous: number) => {
  //     if (previous === 0) {
  //       return {
  //         change: current > 0 ? '+100%' : '0%',
  //         isPositive: current >= 0,
  //       };
  //     }
  //     const delta = ((current - previous) / previous) * 100;
  //     return {
  //       change: `${delta >= 0 ? '+' : ''}${delta.toFixed(1)}%`,
  //       isPositive: delta >= 0,
  //     };
  //   };
  //   const userStatsResponse = [
  //     {
  //       type: 'total_users',
  //       title: 'Total Users',
  //       count: currentTotalUsers,
  //       ...calculateChange(currentTotalUsers, previousTotalUsers),
  //     },
  //     {
  //       type: 'parents',
  //       title: 'Parents',
  //       count: currentParents,
  //       ...calculateChange(currentParents, previousParents),
  //     },
  //     {
  //       type: 'organisers',
  //       title: 'Event Organisers',
  //       count: currentOrganizers,
  //       ...calculateChange(currentOrganizers, previousOrganizers),
  //     },
  //     {
  //       type: 'inactive',
  //       title: 'Inactive User',
  //       count: currentInactive,
  //       ...calculateChange(currentInactive, previousInactive),
  //     },
  //   ];
  //   return {
  //     userStats: userStatsResponse,
  //     monthlyData: this.processMonthlyGrowthData(rawMonthlyData),
  //     hasData: currentTotalUsers > 0 || currentOrganizers > 0,
  //   };
  // }

  // async getUserActivity(startDate: Date, endDate: Date) {
  //   const rangeInMs = endDate.getTime() - startDate.getTime();
  //   const previousStartDate = new Date(startDate.getTime() - rangeInMs);
  //   const previousEndDate = startDate;

  //   const [userStats, organizerStats, rawMonthlyData] = await Promise.all([
  //     this.prisma.user.groupBy({
  //       by: ['role', 'isLocked'],
  //       where: {
  //         isDeleted: false,
  //         createdAt: { gte: previousStartDate, lt: endDate },
  //       },
  //       _count: { id: true },
  //       _min: { createdAt: true },
  //     }),
  //     this.prisma.organiser.groupBy({
  //       by: ['isDeleted'],
  //       where: {
  //         isDeleted: false,
  //         createdAt: { gte: previousStartDate, lt: endDate },
  //       },
  //       _count: { id: true },
  //       _min: { createdAt: true },
  //     }),
  //     this.prisma.$queryRaw<
  //       Array<{
  //         year: number;
  //         month: number;
  //         parents_count: bigint;
  //         organizers_count: bigint;
  //       }>
  //     >`
  //       SELECT
  //         EXTRACT(YEAR FROM u."createdAt") AS year,
  //         EXTRACT(MONTH FROM u."createdAt") AS month,
  //         COUNT(CASE WHEN u.role = 'GUARDIAN' AND u."isDeleted" = false THEN 1 END) AS parents_count,
  //         0 AS organizers_count
  //       FROM "user" u
  //       WHERE u."createdAt" >= ${startDate} AND u."createdAt" < ${endDate}
  //       GROUP BY year, month

  //       UNION ALL

  //       SELECT
  //         EXTRACT(YEAR FROM o."createdAt") AS year,
  //         EXTRACT(MONTH FROM o."createdAt") AS month,
  //         0 AS parents_count,
  //         COUNT(CASE WHEN o."isDeleted" = false THEN 1 END) AS organizers_count
  //       FROM "organiser" o
  //       WHERE o."createdAt" >= ${startDate} AND o."createdAt" < ${endDate}
  //       GROUP BY year, month
  //     `,
  //   ]);

  //   const aggregateCount = (
  //     data: typeof userStats,
  //     filterFn: (item: (typeof userStats)[number]) => boolean,
  //   ) => data.filter(filterFn).reduce((sum, item) => sum + item._count.id, 0);

  //   const isCurrent = (date: Date) => date >= startDate && date < endDate;
  //   const isPrevious = (date: Date) =>
  //     date >= previousStartDate && date < previousEndDate;

  //   const currentTotalUsers = aggregateCount(userStats, (s) =>
  //     isCurrent(s._min.createdAt),
  //   );
  //   const previousTotalUsers = aggregateCount(userStats, (s) =>
  //     isPrevious(s._min.createdAt),
  //   );

  //   const currentParents = aggregateCount(
  //     userStats,
  //     (s) => isCurrent(s._min.createdAt) && s.role === 'GUARDIAN',
  //   );
  //   const previousParents = aggregateCount(
  //     userStats,
  //     (s) => isPrevious(s._min.createdAt) && s.role === 'GUARDIAN',
  //   );

  //   const currentInactive = aggregateCount(
  //     userStats,
  //     (s) => isCurrent(s._min.createdAt) && s.isLocked === true,
  //   );
  //   const previousInactive = aggregateCount(
  //     userStats,
  //     (s) => isPrevious(s._min.createdAt) && s.isLocked === true,
  //   );

  //   const currentOrganizers = organizerStats
  //     .filter((s) => isCurrent(s._min.createdAt))
  //     .reduce((sum, s) => sum + s._count.id, 0);
  //   const previousOrganizers = organizerStats
  //     .filter((s) => isPrevious(s._min.createdAt))
  //     .reduce((sum, s) => sum + s._count.id, 0);

  //   const calculateChange = (current: number, previous: number) => {
  //     if (previous === 0) {
  //       return {
  //         change: current > 0 ? '+100%' : '0%',
  //         isPositive: current >= 0,
  //       };
  //     }
  //     const delta = ((current - previous) / previous) * 100;
  //     return {
  //       change: `${delta >= 0 ? '+' : ''}${delta.toFixed(1)}%`,
  //       isPositive: delta >= 0,
  //     };
  //   };

  // const userStatsResponse = [
  //   {
  //     type: 'total_users',
  //     title: 'Total Users',
  //     count: currentTotalUsers,
  //     ...calculateChange(currentTotalUsers, previousTotalUsers),
  //   },
  //   {
  //     type: 'parents',
  //     title: 'Parents',
  //     count: currentParents,
  //     ...calculateChange(currentParents, previousParents),
  //   },
  //   {
  //     type: 'organisers',
  //     title: 'Event Organisers',
  //     count: currentOrganizers,
  //     ...calculateChange(currentOrganizers, previousOrganizers),
  //   },
  //   {
  //     type: 'inactive',
  //     title: 'Inactive Users',
  //     count: currentInactive,
  //     ...calculateChange(currentInactive, previousInactive),
  //   },
  // ];

  //   return {
  //     userStats: userStatsResponse,
  //     monthlyData: this.processMonthlyGrowthData(rawMonthlyData),
  //     hasData: currentTotalUsers > 0 || currentOrganizers > 0,
  //   };
  // }

  private processMonthlyGrowthData(
    rawData: Array<{
      year: number;
      month: number;
      parents_count: bigint;
      organizers_count: bigint;
    }>,
    startDate: Date,
    endDate: Date,
  ) {
    const months = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];

    // Aggregate data by year-month
    const dataMap = new Map<string, { parents: number; organizers: number }>();
    rawData.forEach(({ year, month, parents_count, organizers_count }) => {
      const key = `${Number(year)}-${Number(month)}`;
      const current = dataMap.get(key) || { parents: 0, organizers: 0 };
      dataMap.set(key, {
        parents: current.parents + Number(parents_count),
        organizers: current.organizers + Number(organizers_count),
      });
    });

    // Build the list of months within [startDate, endDate)
    const start = new Date(startDate);
    start.setDate(1);
    start.setHours(0, 0, 0, 0);

    const end = new Date(endDate);
    end.setHours(0, 0, 0, 0);

    const result: Array<{ name: string; parents: number; organizers: number }> =
      [];
    const cursor = new Date(start);
    while (cursor < end) {
      const y = cursor.getFullYear();
      const m = cursor.getMonth() + 1; // 1-based
      const key = `${y}-${m}`;
      const entry = dataMap.get(key) || { parents: 0, organizers: 0 };
      result.push({
        name: months[m - 1],
        parents: entry.parents,
        organizers: entry.organizers,
      });
      // advance to next month
      cursor.setMonth(cursor.getMonth() + 1);
    }

    return result;
  }

  // async getUserActivity(startDate: Date, endDate: Date) {
  //   const rangeInMs = endDate.getTime() - startDate.getTime();
  //   const previousStartDate = new Date(startDate.getTime() - rangeInMs);
  //   const previousEndDate = startDate;

  //   // If you want "today only" behaviour
  //   const todayStart = new Date();
  //   todayStart.setHours(0, 0, 0, 0);
  //   // const now = new Date();

  //   const [userStats, organizerStats, rawMonthlyData] = await Promise.all([
  //     this.prisma.user.groupBy({
  //       by: ['role', 'isLocked'],
  //       where: {
  //         isDeleted: false,
  //         createdAt: { gte: previousStartDate, lt: endDate },
  //       },
  //       _count: { id: true },
  //       _min: { createdAt: true },
  //     }),
  //     this.prisma.organiser.groupBy({
  //       by: ['isDeleted', 'isProfileCompleted'],
  //       where: {
  //         isDeleted: false,
  //         isProfileCompleted: true, // ✅ Only completed profiles
  //         createdAt: { gte: previousStartDate, lt: endDate },
  //       },
  //       _count: { id: true },
  //       _min: { createdAt: true },
  //     }),
  //     this.prisma.$queryRaw<
  //       Array<{
  //         year: number;
  //         month: number;
  //         parents_count: bigint;
  //         organizers_count: bigint;
  //       }>
  //     >`
  //     SELECT
  //       EXTRACT(YEAR FROM u."createdAt") AS year,
  //       EXTRACT(MONTH FROM u."createdAt") AS month,
  //       COUNT(CASE WHEN u.role = 'GUARDIAN' AND u."isDeleted" = false THEN 1 END) AS parents_count,
  //       0 AS organizers_count
  //     FROM "user" u
  //     WHERE u."createdAt" >= ${startDate} AND u."createdAt" < ${endDate}
  //     GROUP BY year, month

  //     UNION ALL

  //     SELECT
  //       EXTRACT(YEAR FROM o."createdAt") AS year,
  //       EXTRACT(MONTH FROM o."createdAt") AS month,
  //       0 AS parents_count,
  //       COUNT(CASE WHEN o."isDeleted" = false AND o."isProfileCompleted" = true THEN 1 END) AS organizers_count
  //     FROM "organiser" o
  //     WHERE o."createdAt" >= ${startDate} AND o."createdAt" < ${endDate}
  //     GROUP BY year, month
  //   `,
  //   ]);

  //   const aggregateCount = (
  //     data: typeof userStats,
  //     filterFn: (item: (typeof userStats)[number]) => boolean,
  //   ) => data.filter(filterFn).reduce((sum, item) => sum + item._count.id, 0);

  //   const isCurrent = (date: Date) => date >= startDate && date < endDate;
  //   const isPrevious = (date: Date) =>
  //     date >= previousStartDate && date < previousEndDate;
  //   //const isToday = (date: Date) => date >= todayStart && date <= now;

  //   const currentTotalUsers = aggregateCount(userStats, (s) =>
  //     isCurrent(s._min.createdAt),
  //   );
  //   const previousTotalUsers = aggregateCount(userStats, (s) =>
  //     isPrevious(s._min.createdAt),
  //   );

  //   const currentParents = aggregateCount(
  //     userStats,
  //     (s) => isCurrent(s._min.createdAt) && s.role === 'GUARDIAN',
  //   );
  //   const previousParents = aggregateCount(
  //     userStats,
  //     (s) => isPrevious(s._min.createdAt) && s.role === 'GUARDIAN',
  //   );

  //   const currentInactive = aggregateCount(
  //     userStats,
  //     (s) => isCurrent(s._min.createdAt) && s.isLocked === true,
  //   );
  //   const previousInactive = aggregateCount(
  //     userStats,
  //     (s) => isPrevious(s._min.createdAt) && s.isLocked === true,
  //   );

  //   const currentOrganizers = organizerStats
  //     .filter(
  //       (s) => isCurrent(s._min.createdAt) && s.isProfileCompleted === true,
  //     )
  //     .reduce((sum, s) => sum + s._count.id, 0);
  //   const previousOrganizers = organizerStats
  //     .filter(
  //       (s) => isPrevious(s._min.createdAt) && s.isProfileCompleted === true,
  //     )
  //     .reduce((sum, s) => sum + s._count.id, 0);

  //   // Count organisers created today with completed profiles
  //   // const todayOrganizers = organizerStats
  //   //   .filter((s) => isToday(s._min.createdAt) && s.isProfileCompleted === true)
  //   //   .reduce((sum, s) => sum + s._count.id, 0);

  //   const calculateChange = (current: number, previous: number) => {
  //     if (previous === 0) {
  //       return {
  //         change: current > 0 ? '+100%' : '0%',
  //         isPositive: current >= 0,
  //       };
  //     }
  //     const delta = ((current - previous) / previous) * 100;
  //     return {
  //       change: `${delta >= 0 ? '+' : ''}${delta.toFixed(1)}%`,
  //       isPositive: delta >= 0,
  //     };
  //   };

  //   // const userStatsResponse = [
  //   //   {
  //   //     type: 'total_users',
  //   //     title: 'Total Users',
  //   //     count: currentTotalUsers,
  //   //     ...calculateChange(currentTotalUsers, previousTotalUsers),
  //   //   },
  //   //   {
  //   //     type: 'parents',
  //   //     title: 'Parents',
  //   //     count: currentParents,
  //   //     ...calculateChange(currentParents, previousParents),
  //   //   },
  //   //   {
  //   //     type: 'organisers',
  //   //     title: 'Event Organisers (Completed Profile)',
  //   //     count: currentOrganizers,
  //   //     ...calculateChange(currentOrganizers, previousOrganizers),
  //   //   },
  //   //   {
  //   //     type: 'today_organisers',
  //   //     title: 'Organisers Registered Today (Completed Profile)',
  //   //     count: todayOrganizers,
  //   //     change: 'N/A',
  //   //     isPositive: true,
  //   //   },
  //   //   {
  //   //     type: 'inactive',
  //   //     title: 'Inactive Users',
  //   //     count: currentInactive,
  //   //     ...calculateChange(currentInactive, previousInactive),
  //   //   },
  //   // ];

  //   const userStatsResponse = [
  //     {
  //       type: 'total_users',
  //       title: 'Total Users',
  //       count: currentTotalUsers,
  //       ...calculateChange(currentTotalUsers, previousTotalUsers),
  //     },
  //     {
  //       type: 'parents',
  //       title: 'Parents',
  //       count: currentParents,
  //       ...calculateChange(currentParents, previousParents),
  //     },
  //     {
  //       type: 'organisers',
  //       title: 'Event Organisers',
  //       count: currentOrganizers,
  //       ...calculateChange(currentOrganizers, previousOrganizers),
  //     },
  //     {
  //       type: 'inactive',
  //       title: 'Inactive Users',
  //       count: currentInactive,
  //       ...calculateChange(currentInactive, previousInactive),
  //     },
  //   ];
  //   return {
  //     userStats: userStatsResponse,
  //     monthlyData: this.processMonthlyGrowthData(rawMonthlyData),
  //     hasData: currentTotalUsers > 0 || currentOrganizers > 0,
  //   };
  // }

  async getUserActivity(startDate: Date, endDate: Date) {
    const rangeInMs = endDate.getTime() - startDate.getTime();
    const previousStartDate = new Date(startDate.getTime() - rangeInMs);
    const previousEndDate = startDate;

    const [
      currentUserStats,
      currentOrganizerStats,
      previousUserStats,
      previousOrganizerStats,
      rawMonthlyData,
    ] = await Promise.all([
      // Current period: Users
      this.prisma.user.groupBy({
        by: ['role', 'email_verify'],
        where: {
          isDeleted: false,
          createdAt: { gte: startDate, lt: endDate },
        },
        _count: { id: true },
      }),
      // Current period: Organisers (completed profiles only)
      this.prisma.organiser.groupBy({
        by: ['isDeleted', 'isProfileCompleted'],
        where: {
          isDeleted: false,
          isProfileCompleted: true,
          createdAt: { gte: startDate, lt: endDate },
        },
        _count: { id: true },
      }),
      // Previous period: Users
      this.prisma.user.groupBy({
        by: ['role', 'email_verify'],
        where: {
          isDeleted: false,
          createdAt: { gte: previousStartDate, lt: previousEndDate },
        },
        _count: { id: true },
      }),
      // Previous period: Organisers (completed profiles only)
      this.prisma.organiser.groupBy({
        by: ['isDeleted', 'isProfileCompleted'],
        where: {
          isDeleted: false,
          isProfileCompleted: true,
          createdAt: { gte: previousStartDate, lt: previousEndDate },
        },
        _count: { id: true },
      }),
      // Monthly growth data for the current window
      this.prisma.$queryRaw<
        Array<{
          year: number;
          month: number;
          parents_count: bigint;
          organizers_count: bigint;
        }>
      >`
      SELECT 
        EXTRACT(YEAR FROM u."createdAt") AS year,
        EXTRACT(MONTH FROM u."createdAt") AS month,
        COUNT(CASE WHEN u.role = 'GUARDIAN' AND u."isDeleted" = false THEN 1 END) AS parents_count,
        0 AS organizers_count
      FROM "user" u
      WHERE u."createdAt" >= ${startDate} AND u."createdAt" < ${endDate}
      GROUP BY year, month

      UNION ALL

      SELECT 
        EXTRACT(YEAR FROM o."createdAt") AS year,
        EXTRACT(MONTH FROM o."createdAt") AS month,
        0 AS parents_count,
        COUNT(CASE WHEN o."isDeleted" = false AND o."isProfileCompleted" = true THEN 1 END) AS organizers_count
      FROM "organiser" o
      WHERE o."createdAt" >= ${startDate} AND o."createdAt" < ${endDate}
      GROUP BY year, month
    `,
    ]);

    const aggregateCount = (
      data: { _count: { id: number } }[],
      filterFn: (item: any) => boolean,
    ) => data.filter(filterFn).reduce((sum, item) => sum + item._count.id, 0);

    // Current counts
    const currentParents = aggregateCount(
      currentUserStats,
      (s) => s.role === 'GUARDIAN',
    );
    console.log(currentUserStats);

    const currentInactive = aggregateCount(
      currentUserStats,
      (s) => s.email_verify === false,
    );

    const currentOrganizers = currentOrganizerStats
      .filter((s) => s.isProfileCompleted === true)
      .reduce((sum, s) => sum + s._count.id, 0);

    // Previous counts
    const previousParents = aggregateCount(
      previousUserStats,
      (s) => s.role === 'GUARDIAN',
    );

    const previousInactive = aggregateCount(
      previousUserStats,
      (s) => s.email_verify === false,
    );

    const previousOrganizers = previousOrganizerStats
      .filter((s) => s.isProfileCompleted === true)
      .reduce((sum, s) => sum + s._count.id, 0);

    // ✅ New total users = parents + inactive + organisers
    console.log(currentInactive, currentParents + currentOrganizers);
    const currentTotalUsers = currentParents + currentOrganizers;
    const previousTotalUsers = previousParents + previousOrganizers;

    const calculateChange = (current: number, previous: number) => {
      console.log(previous, 'This is the previous');
      if (previous === 0) {
        return {
          change: current > 0 ? '+100%' : '0%',
          isPositive: current >= 0,
        };
      }
      const delta = ((current - previous) / previous) * 100;
      return {
        change: `${delta >= 0 ? '+' : ''}${delta.toFixed(1)}%`,
        isPositive: delta >= 0,
      };
    };

    const userStatsResponse = [
      {
        type: 'total_users',
        title: 'Total Users',
        count: currentTotalUsers,
        ...calculateChange(currentTotalUsers, previousTotalUsers),
      },
      {
        type: 'parents',
        title: 'Parents',
        count: currentParents,
        ...calculateChange(currentParents, previousParents),
      },
      {
        type: 'organisers',
        title: 'Event Organisers',
        count: currentOrganizers,
        ...calculateChange(currentOrganizers, previousOrganizers),
      },
      {
        type: 'inactive',
        title: 'Inactive Users',
        count: currentInactive,
        ...calculateChange(currentInactive, previousInactive),
      },
    ];

    return {
      userStats: userStatsResponse,
      monthlyData: this.processMonthlyGrowthData(
        rawMonthlyData,
        startDate,
        endDate,
      ),
      hasData: currentTotalUsers > 0 || currentOrganizers > 0,
    };
  }

  async getEventActivity(startDate: Date, endDate: Date) {
    const rangeInMs = endDate.getTime() - startDate.getTime();
    const previousStartDate = new Date(startDate.getTime() - rangeInMs);

    // Single optimized query to get all data at once
    const allData = await this.prisma.$queryRaw<
      Array<{
        // Event data
        event_id: string | null;
        event_name: string | null;
        event_created_at: Date | null;
        event_is_published: boolean | null;
        event_is_deleted: boolean | null;

        // Vendor data
        vendor_name: string | null;

        // Booking data
        booking_id: string | null;
        booking_created_at: Date | null;
        booking_status: string | null;
        booking_quantity: number | null;
      }>
    >`
      SELECT 
        e.id as event_id,
        e.name as event_name,
        e."createdAt" as event_created_at,
        e."isPublished" as event_is_published,
        e."isDeleted" as event_is_deleted,
        COALESCE(o.name, a.first_name || ' ' || a.last_name) as vendor_name,
        b.id as booking_id,
        b."createdAt" as booking_created_at,
        b.status as booking_status,
        b.ticket_quantity as booking_quantity
      FROM "event" e
      LEFT JOIN "organiser" o ON e."organiserId" = o.id
      LEFT JOIN "admin" a ON e."adminId" = a.id
      LEFT JOIN "booking" b ON e.id = b."eventId" 
        AND b."isDeleted" = false 
        AND b.status = 'Confirmed'
        AND b."createdAt" >= ${previousStartDate}
        AND b."createdAt" < ${endDate}
      WHERE e."createdAt" >= ${previousStartDate}
        AND e."createdAt" < ${endDate}
      ORDER BY e."createdAt" DESC
    `;

    // Process all data in memory to avoid multiple database calls
    const eventStatsMap = new Map<
      string,
      { current: number; previous: number }
    >();
    const eventBookingCounts = new Map<string, number>();
    const bookingsByDay = new Map<string, number>();
    let totalBookingsCurrent = 0;
    let totalBookingsPrevious = 0;

    // Process the single result set
    allData.forEach((row) => {
      if (row.event_id) {
        // Process event stats
        const eventCreatedAt = new Date(row.event_created_at!);
        const isCurrentPeriod =
          eventCreatedAt >= startDate && eventCreatedAt < endDate;
        const isPreviousPeriod =
          eventCreatedAt >= previousStartDate && eventCreatedAt < startDate;

        // Determine event status
        const status = row.event_is_deleted
          ? 'CANCELLED'
          : row.event_is_published
            ? 'ACTIVE'
            : 'DRAFT';

        const existing = eventStatsMap.get(status) || {
          current: 0,
          previous: 0,
        };

        if (isCurrentPeriod) {
          existing.current += 1;
        } else if (isPreviousPeriod) {
          existing.previous += 1;
        }

        eventStatsMap.set(status, existing);

        // Process booking data for top events and daily stats
        if (row.booking_id) {
          const bookingCreatedAt = new Date(row.booking_created_at!);
          const bookingQuantity = row.booking_quantity || 1;

          // Count bookings for top events (current period only)
          if (bookingCreatedAt >= startDate && bookingCreatedAt < endDate) {
            const currentCount = eventBookingCounts.get(row.event_id) || 0;
            eventBookingCounts.set(
              row.event_id,
              currentCount + bookingQuantity,
            );

            // Daily booking stats
            const dayKey = bookingCreatedAt.toISOString().split('T')[0];
            const currentDayCount = bookingsByDay.get(dayKey) || 0;
            bookingsByDay.set(dayKey, currentDayCount + bookingQuantity);

            totalBookingsCurrent += bookingQuantity;
          } else if (
            bookingCreatedAt >= previousStartDate &&
            bookingCreatedAt < startDate
          ) {
            totalBookingsPrevious += bookingQuantity;
          }
        }
      }
    });

    // Get top 5 events
    const topEvents = Array.from(eventBookingCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([eventId, attendeeCount], index) => {
        const eventData = allData.find((row) => row.event_id === eventId);
        return {
          id: index + 1,
          event: eventData?.event_name || 'Unknown Event',
          vendor: eventData?.vendor_name || 'Unknown Vendor',
          attendees: attendeeCount,
        };
      });

    // Helper function for calculating changes
    const calculateChange = (current: number, previous: number) => {
      if (previous === 0) {
        return {
          change: current > 0 ? '+100%' : '0%',
          isPositive: current >= 0,
        };
      }
      const delta = ((current - previous) / previous) * 100;
      return {
        change: `${delta >= 0 ? '+' : ''}${delta.toFixed(1)}%`,
        isPositive: delta >= 0,
      };
    };

    // Calculate totals
    const totalEventsCurrent = Array.from(eventStatsMap.values()).reduce(
      (sum, stat) => sum + stat.current,
      0,
    );
    const totalEventsPrevious = Array.from(eventStatsMap.values()).reduce(
      (sum, stat) => sum + stat.previous,
      0,
    );

    const activeEventsCurrent = eventStatsMap.get('ACTIVE')?.current || 0;
    const activeEventsPrevious = eventStatsMap.get('ACTIVE')?.previous || 0;

    const cancelledEventsCurrent = eventStatsMap.get('CANCELLED')?.current || 0;
    const cancelledEventsPrevious =
      eventStatsMap.get('CANCELLED')?.previous || 0;

    const eventStatsResponse = [
      {
        type: 'total_events',
        title: 'Total Events',
        count: totalEventsCurrent,
        ...calculateChange(totalEventsCurrent, totalEventsPrevious),
      },
      {
        type: 'active_events',
        title: 'Active Events',
        count: activeEventsCurrent,
        ...calculateChange(activeEventsCurrent, activeEventsPrevious),
      },
      {
        type: 'cancelled_events',
        title: 'Cancelled Events',
        count: cancelledEventsCurrent,
        ...calculateChange(cancelledEventsCurrent, cancelledEventsPrevious),
      },
      {
        type: 'total_attendees',
        title: 'Total Attendees',
        count: totalBookingsCurrent,
        ...calculateChange(totalBookingsCurrent, totalBookingsPrevious),
      },
    ];

    return {
      eventStats: eventStatsResponse,
      topEvents,
      bookingData: this.processBookingDataFromMap(
        bookingsByDay,
        startDate,
        endDate,
      ),
      hasData: totalEventsCurrent > 0 || totalBookingsCurrent > 0,
    };
  }

  private processBookingDataFromMap(
    bookingsByDay: Map<string, number>,
    startDate: Date,
    endDate: Date,
  ) {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const result = [];

    // Generate data for the last 7 days within the date range
    const currentDate = new Date(
      Math.max(startDate.getTime(), Date.now() - 7 * 24 * 60 * 60 * 1000),
    );
    const maxDate = new Date(Math.min(endDate.getTime(), Date.now()));

    for (let i = 0; i < 7; i++) {
      const date = new Date(currentDate);
      date.setDate(currentDate.getDate() + i);

      if (date > maxDate) break;

      const dateKey = date.toISOString().split('T')[0];
      const dayName = days[date.getDay()];
      const bookings = bookingsByDay.get(dateKey) || 0;

      result.push({
        day: dayName,
        bookings,
      });
    }

    return result;
  }

  async getBookingData(period: '7days' | 'monthly' | 'yearly') {
    const now = new Date();
    let startDate: Date;
    let endDate: Date;

    switch (period) {
      case '7days':
        // Last 7 days from today
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        endDate = new Date(now.getTime() + 24 * 60 * 60 * 1000); // Include today
        break;
      case 'monthly':
        // Last 12 months from current month
        startDate = new Date(now.getFullYear() - 1, now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        break;
      case 'yearly':
        // Last 7 years from current year
        startDate = new Date(now.getFullYear() - 7, 0, 1);
        endDate = new Date(now.getFullYear() + 1, 0, 1);
        break;
      default:
        throw new BadRequestException(
          'Invalid period. Must be 7days, monthly, or yearly',
        );
    }

    // Get booking data for the specified period
    const allData = await this.prisma.$queryRaw<
      Array<{
        booking_id: string | null;
        booking_created_at: Date | null;
        booking_quantity: number | null;
      }>
    >`
      SELECT 
        b.id as booking_id,
        b."createdAt" as booking_created_at,
        b.ticket_quantity as booking_quantity
      FROM "booking" b
      WHERE b."isDeleted" = false 
        AND b.status = 'Confirmed'
        AND b."createdAt" >= ${startDate}
        AND b."createdAt" < ${endDate}
      ORDER BY b."createdAt" ASC
    `;

    const bookingsByDay = new Map<string, number>();

    // Process booking data
    allData.forEach((row) => {
      if (row.booking_id && row.booking_created_at) {
        const bookingCreatedAt = new Date(row.booking_created_at);
        const bookingQuantity = row.booking_quantity || 1;

        // Create appropriate key based on period
        let dateKey: string;
        if (period === '7days') {
          dateKey = bookingCreatedAt.toISOString().split('T')[0];
        } else if (period === 'monthly') {
          dateKey = `${bookingCreatedAt.getFullYear()}-${String(
            bookingCreatedAt.getMonth() + 1,
          ).padStart(2, '0')}`;
        } else {
          // yearly
          dateKey = bookingCreatedAt.getFullYear().toString();
        }

        const currentCount = bookingsByDay.get(dateKey) || 0;
        bookingsByDay.set(dateKey, currentCount + bookingQuantity);
      }
    });

    return this.processBookingDataFromMapByPeriod(
      bookingsByDay,
      startDate,
      endDate,
      period,
    );
  }

  private processBookingDataFromMapByPeriod(
    bookingsByDay: Map<string, number>,
    startDate: Date,
    endDate: Date,
    period: '7days' | 'monthly' | 'yearly',
  ) {
    const result = [];

    if (period === '7days') {
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

      // Generate data for the last 7 days
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);

        const dateKey = date.toISOString().split('T')[0];
        const dayName = days[date.getDay()];
        const bookings = bookingsByDay.get(dateKey) || 0;

        result.push({
          period: dayName,
          bookings,
          date: dateKey,
        });
      }
    } else if (period === 'monthly') {
      const months = [
        'Jan',
        'Feb',
        'Mar',
        'Apr',
        'May',
        'Jun',
        'Jul',
        'Aug',
        'Sep',
        'Oct',
        'Nov',
        'Dec',
      ];

      // Generate data for the last 12 months
      for (let i = 11; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);

        const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        const monthName = months[date.getMonth()];
        const bookings = bookingsByDay.get(dateKey) || 0;

        result.push({
          period: monthName,
          bookings,
          date: dateKey,
        });
      }
    } else {
      // yearly
      // Generate data for the last 7 years
      for (let i = 6; i >= 0; i--) {
        const year = new Date().getFullYear() - i;
        const dateKey = year.toString();
        const bookings = bookingsByDay.get(dateKey) || 0;

        result.push({
          period: year.toString(),
          bookings,
          date: dateKey,
        });
      }
    }

    return result;
  }

  async getEventReports(filters: {
    status?: ReportStatus;
    search?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }) {
    const {
      status,
      search,
      startDate,
      endDate,
      page = 1,
      limit = 10,
    } = filters;

    const where: any = {};

    if (status) {
      where.status = status;
    }

    if (search) {
      const searchQuery = { contains: search, mode: 'insensitive' };
      where.OR = [
        { reason: searchQuery },
        { event: { name: searchQuery } },
        { reporter: { name: searchQuery } },
        { reporter: { email: searchQuery } },
      ];
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    // Get total count first
    const totalCount = await this.prisma.eventReport.count({ where });

    // Fetch paginated results
    const reports = await this.prisma.eventReport.findMany({
      where,
      include: {
        event: {
          select: {
            id: true,
            name: true,
            organiserId: true,
            adminId: true,
            organiser: {
              select: {
                id: true,
                name: true,
                email: true,
                phone_number: true,
                business_name: true,
                business_logo: true,
                address: true,
              },
            },
            admin: {
              select: {
                id: true,
                first_name: true,
                last_name: true,
                email: true,
                avatarUrl: true,
              },
            },
          },
        },
        reporter: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    });

    const totalPages = Math.ceil(totalCount / limit);

    return {
      message: 'Event reports retrieved successfully',
      totalCount,
      totalPages,
      currentPage: page,
      reports,
    };
  }

  async updateEventReport(
    reportId: string,
    adminId: string,
    status: ReportStatus,
  ) {
    const report = await this.prisma.eventReport.findUnique({
      where: { id: reportId },
    });

    if (!report) {
      throw new NotFoundException('Report not found');
    }

    const updatedReport = await this.prisma.eventReport.update({
      where: { id: reportId },
      data: {
        status,
        reviewedBy: adminId,
        reviewedAt: new Date(),
      },
    });

    return {
      message: 'Event report updated successfully',
      report: updatedReport,
    };
  }

  async getEventReportDetail(reportId: string) {
    const report = await this.prisma.eventReport.findUnique({
      where: { id: reportId },
      include: {
        reporter: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        event: {
          include: {
            organiser: {
              select: {
                id: true,
                name: true,
                email: true,
                phone_number: true,
              },
            },
            admin: {
              select: {
                id: true,
                first_name: true,
                last_name: true,
                email: true,
              },
            },
          },
        },
      },
    });

    if (!report) {
      throw new NotFoundException('Report not found');
    }

    return { message: 'Event report retrieved successfully', report };
  }

  async getCrowdSourceReportsByTag(
    tag: 'Event' | 'Place',
    status?: ReportStatus,
  ) {
    const where: any = {
      crowdSource: {
        tag,
      },
    };

    if (status) {
      where.status = status;
    }

    const reports = await this.prisma.crowdSourceReport.findMany({
      where,
      include: {
        crowdSource: {
          include: {
            creator: {
              select: {
                id: true,
                name: true,
                email: true,
                profile_picture: true,
              },
            },
          },
        },
        reporter: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return { message: 'Crowdsource reports retrieved successfully', reports };
  }

  async getCrowdSourceReports(filters: {
    status?: ReportStatus;
    search?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }) {
    const {
      status,
      search,
      startDate,
      endDate,
      page = 1,
      limit = 10,
    } = filters;

    const where: any = {
      crowdSource: {},
    };

    if (status) {
      where.status = status;
    }

    if (search) {
      const searchQuery = { contains: search, mode: 'insensitive' };
      where.OR = [
        { reason: searchQuery },
        { crowdSource: { name: searchQuery } },
        { reporter: { name: searchQuery } },
        { reporter: { email: searchQuery } },
      ];
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    // total count
    const totalCount = await this.prisma.crowdSourceReport.count({ where });

    // paginated results
    const reports = await this.prisma.crowdSourceReport.findMany({
      where,
      include: {
        crowdSource: {
          include: {
            creator: {
              select: {
                id: true,
                name: true,
                email: true,
                profile_picture: true,
              },
            },
          },
        },
        reporter: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      skip: (page - 1) * limit,
      take: limit,
    });

    const totalPages = Math.ceil(totalCount / limit);

    return {
      message: 'Crowdsource reports retrieved successfully',
      totalCount,
      totalPages,
      currentPage: page,
      reports,
    };
  }

  async updateCrowdSourceReport(
    reportId: string,
    adminId: string,
    status: ReportStatus,
    removeContent?: boolean,
  ) {
    const report = await this.prisma.crowdSourceReport.findUnique({
      where: { id: reportId },
      include: { crowdSource: true },
    });

    if (!report) {
      throw new NotFoundException('Report not found');
    }

    // if (removeContent && report.crowdSource.tag !== 'Place') {
    //   throw new BadRequestException(
    //     'Only recommendations can be removed from this view',
    //   );
    // }

    const updatedReport = await this.prisma.crowdSourceReport.update({
      where: { id: reportId },
      data: {
        status,
        reviewedBy: adminId,
        reviewedAt: new Date(),
      },
    });

    if (removeContent) {
      await this.prisma.crowdSource.update({
        where: { id: report.crowdSourceId },
        data: {
          isDeleted: true,
          status: CrowdSourceStatus.REJECTED,
        },
      });
    }

    return { message: 'Report updated successfully', report: updatedReport };
  }

  async getCommentReports(status?: ReportStatus, search?: string) {
    const where: any = {};
    if (status) {
      where.status = status;
    }

    const keyword = search?.trim();
    if (keyword) {
      where.OR = [
        { reason: { contains: keyword, mode: 'insensitive' } },
        { description: { contains: keyword, mode: 'insensitive' } },
        {
          reporter: {
            OR: [
              { name: { contains: keyword, mode: 'insensitive' } },
              { email: { contains: keyword, mode: 'insensitive' } },
            ],
          },
        },
        {
          comment: {
            OR: [
              { content: { contains: keyword, mode: 'insensitive' } },
              {
                user: {
                  OR: [
                    { name: { contains: keyword, mode: 'insensitive' } },
                    { email: { contains: keyword, mode: 'insensitive' } },
                  ],
                },
              },
              {
                crowdSource: {
                  name: { contains: keyword, mode: 'insensitive' },
                },
              },
            ],
          },
        },
      ];
    }

    const reports = await this.prisma.commentReport.findMany({
      where,
      include: {
        comment: {
          include: {
            user: {
              select: { id: true, name: true, email: true },
            },
            crowdSource: {
              select: { id: true, name: true, tag: true },
            },
          },
        },
        reporter: {
          select: { id: true, name: true, email: true },
        },
        // organiser: {
        //   select: { id: true, name: true, email: true },
        // },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return { message: 'Comment reports retrieved successfully', reports };
  }

  async updateCommentReport(
    reportId: string,
    adminId: string,
    status: ReportStatus,
    removeContent?: boolean,
  ) {
    const report = await this.prisma.commentReport.findUnique({
      where: { id: reportId },
    });

    if (!report) {
      throw new NotFoundException('Report not found');
    }

    const updatedReport = await this.prisma.commentReport.update({
      where: { id: reportId },
      data: {
        status,
        reviewedBy: adminId,
        reviewedAt: new Date(),
      },
    });

    if (removeContent) {
      await this.prisma.comment.update({
        where: { id: report.commentId },
        data: {
          status: CommentStatus.INAPPROPRIATE,
        },
      });
    }

    return {
      message: 'Comment report updated successfully',
      report: updatedReport,
    };
  }

  async getReviewReports(status?: ReportStatus, search?: string) {
    const where: any = {};
    if (status) {
      where.status = status;
    }

    const keyword = search?.trim();
    if (keyword) {
      where.OR = [
        { reason: { contains: keyword, mode: 'insensitive' } },
        { description: { contains: keyword, mode: 'insensitive' } },
        {
          reporter: {
            OR: [
              { name: { contains: keyword, mode: 'insensitive' } },
              { email: { contains: keyword, mode: 'insensitive' } },
            ],
          },
        },
        {
          review: {
            OR: [
              { comment: { contains: keyword, mode: 'insensitive' } },
              { event: { name: { contains: keyword, mode: 'insensitive' } } },
            ],
          },
        },
        {
          crowdSourceReview: {
            OR: [
              { comment: { contains: keyword, mode: 'insensitive' } },
              {
                user: {
                  OR: [
                    { name: { contains: keyword, mode: 'insensitive' } },
                    { email: { contains: keyword, mode: 'insensitive' } },
                  ],
                },
              },
              {
                crowdSource: {
                  name: { contains: keyword, mode: 'insensitive' },
                },
              },
            ],
          },
        },
      ];
    }

    const reports = await this.prisma.reviewReport.findMany({
      where,
      include: {
        review: {
          include: {
            event: {
              select: { id: true, name: true },
            },
          },
        },
        crowdSourceReview: {
          include: {
            crowdSource: {
              select: { id: true, name: true, tag: true },
            },
            user: {
              select: { id: true, name: true, email: true },
            },
          },
        },
        reporter: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return { message: 'Review reports retrieved successfully', reports };
  }

  async updateReviewReport(
    reportId: string,
    adminId: string,
    status: ReportStatus,
    removeContent?: boolean,
  ) {
    const report = await this.prisma.reviewReport.findUnique({
      where: { id: reportId },
    });

    if (!report) {
      throw new NotFoundException('Report not found');
    }

    const updatedReport = await this.prisma.reviewReport.update({
      where: { id: reportId },
      data: {
        status,
        reviewedBy: adminId,
        reviewedAt: new Date(),
      },
    });

    if (removeContent) {
      if (report.crowdSourceReviewId) {
        await this.prisma.crowdSourceReview.update({
          where: { id: report.crowdSourceReviewId },
          data: {
            status: CommentStatus.INAPPROPRIATE,
          },
        });
      } else if (report.reviewId) {
        await this.prisma.review.delete({
          where: { id: report.reviewId },
        });
      } else {
        throw new BadRequestException('No review linked to this report');
      }
    }

    return {
      message: 'Review report updated successfully',
      report: updatedReport,
    };
  }
}
