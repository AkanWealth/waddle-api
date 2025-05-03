import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';

export class CreateOrganiserStaffDto {
  @ApiProperty({
    description: 'Organiser staff name',
    type: String,
    example: 'Barrack Trump',
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: 'Organiser staff email',
    type: String,
    example: 'bt@gmail.com',
    required: true,
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiPropertyOptional({
    description: 'Phone number',
    type: String,
    example: '+2348834388368',
  })
  @IsString()
  @IsOptional()
  phone_number: string;

  @ApiProperty({
    description: 'Password',
    type: String,
    example: 'P@$$w0rd',
    required: true,
  })
  @IsString()
  @MinLength(8, { message: 'Password must be minimum of 8 characters' })
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*()-_=+[\]{};':",.<>/?\\|])\S{8,}$/,
    {
      message:
        'At least one uppercase, one lowercase, one number, and one special character, and no spaces',
    },
  )
  password: string;

  @ApiProperty({
    description: 'Staff role',
    type: String,
    example: 'MANAGER',
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  role: string;
}
