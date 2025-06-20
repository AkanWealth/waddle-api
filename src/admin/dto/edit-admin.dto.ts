import { Role } from '@prisma/client';
import { IsEmail, IsEnum, IsObject, IsString } from 'class-validator';

export class EditAdminDto {
  @IsString()
  firstName: string;

  @IsString()
  lastName: string;

  @IsEmail()
  emailAddress: string;

  @IsEnum(Role)
  role: Role;

  @IsObject()
  permissions: Record<
    string, // e.g., 'analytics', 'userManagement', etc.
    {
      create: boolean;
      view: boolean;
      manage: boolean;
      delete: boolean;
    }
  >;
}
