import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsOptional } from 'class-validator';
import { OrganiserSignUpDto } from '../../auth/dto';

export class UpdateOrganiserDto extends PartialType(OrganiserSignUpDto) {
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
  isVerified: boolean;

  @ApiPropertyOptional({
    description: 'Business attachment link',
    example: 'https://waddle.aws.link',
  })
  @IsOptional()
  attachment: string;

  @ApiPropertyOptional({
    description: 'Business description',
    example: 'A random description of your business',
  })
  @IsOptional()
  description: string;
}
