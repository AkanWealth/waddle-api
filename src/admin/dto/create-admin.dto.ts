import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { SignInDto } from '../../auth/dto';

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
}
