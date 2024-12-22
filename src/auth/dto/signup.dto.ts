import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { SignInDto } from './signin.dto';

export class SignUpDto extends SignInDto {
  @ApiPropertyOptional({
    description: 'The name of the user',
    example: 'John Doe',
  })
  @IsString({ message: 'The name must be a string' })
  @IsOptional()
  name: string;

  @ApiPropertyOptional({
    description: 'The phone number of the user',
    example: '080123456789',
  })
  @IsString({ message: 'The phone number must be a string' })
  @IsOptional()
  phone_number: string;

  @ApiPropertyOptional({
    description: 'The address of the user',
    example: '12B Cresent Maryland',
  })
  @IsString({ message: 'The address must be a string' })
  @IsOptional()
  address: string;
}
