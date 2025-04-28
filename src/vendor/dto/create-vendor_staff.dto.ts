import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateVendorStaffDto {
  @ApiPropertyOptional({
    description: 'Vendor staff name',
    example: 'Barrack Trump',
  })
  @IsOptional()
  name: string;

  @ApiPropertyOptional({
    description: 'Vendor staff email',
    example: 'bt@gmail.com',
  })
  @IsOptional()
  email: string;

  @ApiPropertyOptional({
    description: 'Phone number',
    example: '+2348834388368',
  })
  @IsOptional()
  phone_number: string;

  @ApiPropertyOptional({ description: 'Password' })
  @IsOptional()
  password: string;

  @ApiPropertyOptional({
    description: 'Staff role',
    example: 'Support',
  })
  @IsString()
  @IsNotEmpty()
  role: string;
}
