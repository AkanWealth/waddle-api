import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { SignInDto } from './signin.dto';

export class UserSignUpDto extends SignInDto {
  @ApiPropertyOptional({
    description: 'Parent name',
    type: String,
    example: 'John Doe',
  })
  @IsString({ message: 'Parent name must be a string' })
  @IsOptional()
  name: string;

  @ApiPropertyOptional({
    description: 'Phone number',
    type: String,
    example: '080123456789',
  })
  @IsString({ message: 'Phone number must be a string' })
  @IsOptional()
  phone_number: string;

  @ApiPropertyOptional({
    description: 'Address',
    type: String,
    example: '12B Cresent Maryland',
  })
  @IsString({ message: 'Address must be a string' })
  @IsOptional()
  address: string;
}
