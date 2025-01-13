import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsOptional } from 'class-validator';
import { VendorSignUpDto } from '../../auth/dto';

export class UpdateVendorDto extends PartialType(VendorSignUpDto) {
  @ApiPropertyOptional({ description: 'The name of the vendor' })
  @IsOptional()
  name: string;

  @ApiPropertyOptional({ description: 'The email of the vendor' })
  @IsOptional()
  email: string;

  @ApiPropertyOptional({ description: 'The password of the vendor' })
  @IsOptional()
  password: string;

  @ApiPropertyOptional({
    description: 'The email verification of the vendor',
    example: true,
  })
  @IsOptional()
  email_verify: boolean;

  @ApiPropertyOptional({
    description: 'The password of the vendor',
    example: true,
  })
  @IsOptional()
  business_verify: boolean;
}
