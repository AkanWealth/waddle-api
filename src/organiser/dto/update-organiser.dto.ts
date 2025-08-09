import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { OrganiserSignUpDto } from '../../auth/dto';

export class UpdateOrganiserDto extends PartialType(OrganiserSignUpDto) {
  @ApiPropertyOptional({ description: 'Business name' })
  @IsOptional()
  business_name: string;

  @ApiPropertyOptional({
    description: 'Business address',
    example: '12B Cresent Maryland',
  })
  @IsOptional()
  @IsString({ message: 'Business address must be a string' })
  address: string;

  @ApiPropertyOptional({
    description: 'Business phone number',
    example: '123-456-7890',
  })
  @IsOptional()
  phone_number: string;

  @ApiPropertyOptional({
    description: 'Business description',
    example: 'A random description of your business',
  })
  @IsOptional()
  description: string;

  @ApiPropertyOptional({
    description: 'Business URL link',
    example: 'https://waddle.aws',
  })
  @IsOptional()
  @IsString({ message: 'Business url must be a string' })
  business_url: string;

  @ApiPropertyOptional({
    description: 'Business attachment link',
    example: 'https://waddle.aws.link',
  })
  @IsOptional()
  attachment: string;
}
