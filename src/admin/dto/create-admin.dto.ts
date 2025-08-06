import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsObject, IsOptional, IsString } from 'class-validator';
import { SignInDto } from '../../auth/dto';
import { Role } from '@prisma/client';

export class CreateAdminDto extends SignInDto {
  @ApiPropertyOptional({
    description: 'First name',
    type: String,
    example: 'Malcom',
  })
  @IsString({ message: 'First name must be a string' })
  @IsOptional()
  first_name: string;

  @ApiPropertyOptional({
    description: 'Last name',
    type: String,
    example: 'Stone',
  })
  @IsString({ message: 'Last name must be a string' })
  @IsOptional()
  last_name: string;

  @ApiPropertyOptional({
    description: 'Role',
    type: String,
    example: 'Admin',
  })
  @IsString({ message: 'Last name must be a string' })
  @IsOptional()
  role: Role;

  @IsOptional()
  @IsObject()
  permissions?: Record<
    string, // e.g., 'analytics', 'userManagement', etc.
    {
      create: boolean;
      view: boolean;
      manage: boolean;
      delete: boolean;
    }
  >;

  @ApiPropertyOptional({
    description: 'Avatar URL',
    type: String,
    example: 'https://s3.amazonaws.com/mybucket/avatar.png',
  })
  @IsString({ message: 'Avatar URL must be a string' })
  @IsOptional()
  avatarUrl?: string;
}
