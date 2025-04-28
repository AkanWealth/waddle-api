import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { SignInDto } from './signin.dto';

export class AdminSignUpDto extends SignInDto {
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

  @ApiProperty({
    description: 'Admin role',
    type: String,
    example: 'Editor',
    required: true,
  })
  @IsNotEmpty()
  @IsString({ message: 'Admin role must be a string' })
  role: string;
}
