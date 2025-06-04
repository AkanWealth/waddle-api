import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class SsoSignInDto {
  @ApiProperty({
    description: 'Email',
    required: true,
    example: 'jd@gmail.com',
  })
  @IsNotEmpty({ message: 'The email can not be blank' })
  @IsEmail({}, { message: 'This must ba a valid email address' })
  email: string;

  @ApiPropertyOptional({
    description: 'Name',
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
