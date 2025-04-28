import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsOptional } from 'class-validator';
import { VendorSignUpDto } from '../../auth/dto';

export class UpdateVendorDto extends PartialType(VendorSignUpDto) {
  @ApiPropertyOptional({ description: 'Name' })
  @IsOptional()
  name: string;

  @ApiPropertyOptional({ description: 'Email' })
  @IsOptional()
  email: string;

  @ApiPropertyOptional({ description: 'Password' })
  @IsOptional()
  password: string;

  @ApiPropertyOptional({
    description: 'Email verification',
    example: true,
  })
  @IsOptional()
  email_verify: boolean;

  @ApiPropertyOptional({
    description: 'Busness verification',
    example: true,
  })
  @IsOptional()
  business_verify: boolean;
}
