import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UpdatePasswordDto, UpdateUserDto } from './dto';
import { PrismaService } from '../prisma/prisma.service';
import * as argon from 'argon2';
import {
  DeleteObjectCommand,
  // PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { ConfigService } from '@nestjs/config';
import { Mailer } from 'src/helper';
import { JwtService } from '@nestjs/jwt';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

@Injectable()
export class UserService {
  private readonly s3Client = new S3Client({
    region: 'eu-north-1',
    credentials: {
      accessKeyId: this.config.getOrThrow('AWS_ACCESS_KEY'),
      secretAccessKey: this.config.getOrThrow('AWS_SECRET_KEY'),
    },
  });

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
    private mailer: Mailer,
    private jwt: JwtService,
  ) {}

  // save fcm token to the database
  async saveUserFcmToken(userId: string, token: string) {
    try {
      const existingUser = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      if (!existingUser) {
        throw new NotFoundException(
          'User with the provided ID does not exist.',
        );
      }

      await this.prisma.user.update({
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

  // toogle the status of push notification
  async togglePushNotififcation(userId: string) {
    try {
      const existingUser = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      if (!existingUser) {
        throw new NotFoundException(
          'User with the provided ID does not exist.',
        );
      }

      if (existingUser.fcmIsOn) {
        await this.prisma.user.update({
          where: { id: userId },
          data: {
            fcmIsOn: false,
          },
        });
      } else {
        await this.prisma.user.update({
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

  async blockUser(blockerId: string, blockedUserId: string) {
    if (blockerId === blockedUserId) {
      throw new BadRequestException('You cannot block yourself');
    }

    const targetUser = await this.prisma.user.findUnique({
      where: { id: blockedUserId },
    });

    if (!targetUser) {
      throw new NotFoundException('User not found');
    }

    try {
      await this.prisma.userBlock.create({
        data: {
          blockerId,
          blockedId: blockedUserId,
        },
      });
    } catch (error) {
      if (
        error instanceof PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new BadRequestException('User already blocked');
      }
      throw error;
    }

    return { message: 'User blocked successfully' };
  }

  async unblockUser(blockerId: string, blockedUserId: string) {
    try {
      await this.prisma.userBlock.delete({
        where: {
          blockerId_blockedId: {
            blockerId,
            blockedId: blockedUserId,
          },
        },
      });
    } catch (error) {
      if (
        error instanceof PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException('Block entry not found');
      }
      throw error;
    }

    return { message: 'User unblocked successfully' };
  }

  async getBlockedUsers(blockerId: string) {
    const blockedUsers = await this.prisma.userBlock.findMany({
      where: { blockerId },
      include: {
        blocked: {
          select: {
            id: true,
            name: true,
            email: true,
            profile_picture: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return {
      message: 'Blocked users retrieved successfully',
      blocked: blockedUsers.map((entry) => ({
        blockedAt: entry.createdAt,
        user: entry.blocked,
      })),
    };
  }

  // function to find all the user
  async findAll() {
    try {
      const user = await this.prisma.user.findMany({
        where: {
          isDeleted: false,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      return user;
    } catch (error) {
      throw error;
    }
  }

  async findAllDeletedUsers() {
    try {
      const user = await this.prisma.user.findMany({
        where: {
          isDeleted: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      const usersWithImage = user.map((list) => {
        const profile_picture = `${process.env.S3_PUBLIC_URL}/${this.config.getOrThrow('S3_USER_FOLDER')}/${list.profile_picture}`;
        return {
          ...list,
          profile_picture,
        };
      });

      return usersWithImage;
    } catch (error) {
      throw error;
    }
  }

  // function to find the loggedin user
  async findMe(authUser: string) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: authUser },
      });
      delete user.password;

      // const profile_picture = `${process.env.S3_PUBLIC_URL}/${this.config.getOrThrow('S3_USER_FOLDER')}/${user.profile_picture}`;

      return { ...user };
    } catch (error) {
      throw error;
    }
  }

  // function to update the loggedin user
  // async update(id: string, dto: UpdateUserDto) {
  //   try {
  //     const existingUser = await this.prisma.user.findUnique({
  //       where: { id },
  //     });

  //     if (!existingUser) {
  //       throw new NotFoundException(
  //         'User with the provided ID does not exist.',
  //       );
  //     }

  //     // Prepare the update data object
  //     const updateData: any = {};

  //     if (dto.profile_picture !== undefined) {
  //       updateData.profile_picture = dto.profile_picture;
  //     }

  //     if (dto.email !== undefined) {
  //       updateData.email = dto.email;
  //     }

  //     if (dto.password !== undefined) {
  //       updateData.password = await argon.hash(dto.password);
  //     }

  //     if (dto.name !== undefined) {
  //       updateData.name = dto.name;
  //     }

  //     const updatedUser = await this.prisma.user.update({
  //       where: { id },
  //       data: updateData,
  //     });

  //     delete updatedUser.password;
  //     return updatedUser;
  //   } catch (error) {
  //     throw error;
  //   }
  // }

  async update(id: string, dto: UpdateUserDto) {
    try {
      const existingUser = await this.prisma.user.findUnique({
        where: { id },
      });

      if (!existingUser) {
        throw new NotFoundException(
          'User with the provided ID does not exist.',
        );
      }

      // Filter only defined fields
      const updateData: any = Object.fromEntries(
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        Object.entries(dto).filter(([_, value]) => value !== undefined),
      );

      // If password is being updated, hash it
      if (updateData.password) {
        updateData.password = await argon.hash(updateData.password);
      }

      const updatedUser = await this.prisma.user.update({
        where: { id },
        data: updateData,
      });

      delete updatedUser.password;
      return updatedUser;
    } catch (error) {
      throw error;
    }
  }

  // function to update the loggedin user password
  async updatePassword(id: string, dto: UpdatePasswordDto) {
    try {
      const existingUser = await this.prisma.user.findUnique({
        where: { id },
      });
      if (!existingUser) {
        throw new NotFoundException(
          'User with the provided ID does not exist.',
        );
      }

      const isMatch = await argon.verify(
        existingUser.password,
        dto.old_password,
      );
      if (!isMatch) throw new BadRequestException('Old password is incorrect');

      const hashed = await argon.hash(dto.new_password);

      const user = await this.prisma.user.update({
        where: { id: existingUser.id },
        data: {
          password: hashed,
        },
      });

      delete user.password;
      return { message: 'Password updated successful', user };
    } catch (error) {
      throw error;
    }
  }

  // function to delete a user temporarily by ID
  async deleteUserTemp(id: string) {
    try {
      const existingUser = await this.prisma.user.findUnique({ where: { id } });
      if (!existingUser) throw new NotFoundException('User not found');

      await this.prisma.user.update({
        where: { id: existingUser.id },
        data: { isDeleted: true },
      });

      return { message: 'User deleted' };
    } catch (error) {
      throw error;
    }
  }

  // function to restore a user
  async restoreUser(id: string) {
    try {
      const existingUser = await this.prisma.user.findUnique({ where: { id } });
      if (!existingUser) throw new NotFoundException('User not found');

      await this.prisma.user.update({
        where: { id: existingUser.id },
        data: { isDeleted: false },
      });

      return { message: 'User restored' };
    } catch (error) {
      throw error;
    }
  }

  // function to delete a user permanently by ID
  async deleteUser(id: string) {
    try {
      const existingUser = await this.prisma.user.findUnique({ where: { id } });
      if (!existingUser) throw new NotFoundException('User not found');

      const user = await this.prisma.user.delete({
        where: { id: existingUser.id },
      });

      if (user?.profile_picture) {
        await this.s3Client.send(
          new DeleteObjectCommand({
            Bucket: this.config.getOrThrow('AWS_BUCKET_NAME'),
            Key: `${this.config.getOrThrow('S3_USER_FOLDER')}/${user.profile_picture}`,
          }),
        );
      }

      return { message: 'User deleted' };
    } catch (error) {
      throw error;
    }
  }

  // function to delete my account (user or organiser)
  async deleteMyAccount(id: string, type: 'user' | 'organiser') {
    const userId = id;
    console.log('Deleting account for ID:', userId, 'Type:', type);
    try {
      if (type === 'user') {
        // Delete user account
        const existingUser = await this.prisma.user.findUnique({
          where: { id: userId },
        });

        if (!existingUser) {
          throw new NotFoundException('User not found');
        }

        // Delete user and all related data (cascade will handle relations)
        await this.prisma.user.delete({
          where: { id: existingUser.id },
        });

        // Delete profile picture from S3 if exists

        return { message: 'User account deleted successfully' };
      } else if (type === 'organiser') {
        // Delete organiser account
        const existingOrganiser = await this.prisma.organiser.findUnique({
          where: { id: userId },
        });

        if (!existingOrganiser) {
          throw new NotFoundException('Organiser not found');
        }

        // Delete organiser and all related data (cascade will handle relations)
        await this.prisma.organiser.delete({
          where: { id: existingOrganiser.id },
        });

        // Delete business logo from S3 if exists

        // Delete attachment from S3 if exists

        return { message: 'Organiser account deleted successfully' };
      }
    } catch (error) {
      throw error;
    }
  }

  async requestAccountDeletion(userId: string, role: string) {
    let user;
    if (role === 'user') {
      user = await this.prisma.user.findUnique({ where: { id: userId } });
    } else if (role === 'organiser') {
      user = await this.prisma.organiser.findUnique({ where: { id: userId } });
    } else {
      throw new BadRequestException('Invalid role specified');
    }

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const payload = { sub: user.id, email: user.email, role };
    const token = await this.jwt.signAsync(payload, {
      expiresIn: this.config.get<string>('JWT_EXPIRATION_TIME'),
      secret: this.config.get<string>('JWT_SECRET_KEY'),
    });

    // Deletion link with query parameters
    const deletionLink = `https://www.waddleapp.io/delete-account?role=${encodeURIComponent(
      role,
    )}&token=${encodeURIComponent(token)}`;

    // Email content
    const subject = 'Confirm Your Waddle Account Deletion Request 🧾';
    const message = `
    <p>Hello ${user.name || 'there'},</p>

    <p>We received a request to delete your Waddle ${role} account. 
    If you made this request, please confirm your deletion by clicking the button below:</p>

    <p style="margin: 20px 0;">
      <a href="${deletionLink}" style="
        background-color: #ff4b4b;
        color: #ffffff;
        padding: 12px 20px;
        text-decoration: none;
        border-radius: 8px;
        font-weight: bold;
      ">Confirm Account Deletion</a>
    </p>

    <p>If you did not request this, please ignore this email — your account will remain active.</p>

    <p>This link will expire in ${
      this.config.get<string>('JWT_EXPIRATION_TIME') || '1 hour'
    } for your security.</p>

    <p>Best regards,<br>The Waddle Team</p>
  `;

    try {
      await this.mailer.sendMail(user.email, subject, message);
    } catch (emailError) {
      console.error('Failed to send deletion email:', emailError);
      throw new BadRequestException('Failed to send deletion email');
    }

    return { message: 'Account deletion confirmation email sent successfully' };
  }
}
