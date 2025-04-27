import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { SignInDto } from './signin.dto';

export class AdminSignUpDto extends SignInDto {
  @ApiPropertyOptional({
    description: 'The first name of the admin',
    example: 'Malcom',
  })
  @IsString({ message: 'The first name must be a string' })
  @IsOptional()
  first_name: string;

  @ApiPropertyOptional({
    description: 'The last name of the admin',
    example: 'Stone',
  })
  @IsString({ message: 'The last name must be a string' })
  @IsOptional()
  last_name: string;
}
