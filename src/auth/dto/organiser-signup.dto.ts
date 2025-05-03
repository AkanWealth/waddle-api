import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { SignInDto } from './signin.dto';

export class OrganiserSignUpDto extends SignInDto {
  @ApiProperty({
    description: 'Founder name',
    type: String,
    example: 'Moly Parker',
    required: true,
  })
  @IsString({ message: 'Founder name must be a string' })
  @IsNotEmpty({ message: 'Founder name is required' })
  name: string;

  @ApiProperty({
    description: 'Business Address',
    type: String,
    example: '12B Cresent Maryland',
    required: true,
  })
  @IsString({ message: 'Business address must be a string' })
  @IsNotEmpty({ message: 'Business address is required' })
  address: string;

  @ApiProperty({
    description: 'Business name',
    type: String,
    example: 'Mr Bigs',
    required: true,
  })
  @IsString({ message: 'Business name must be a string' })
  @IsNotEmpty({ message: 'Business name is required' })
  business_name: string;

  @ApiProperty({
    description: 'Category',
    type: String,
    example: 'Hospitality',
    required: true,
  })
  @IsString({ message: 'Category must be a string' })
  @IsNotEmpty({ message: 'Category is required' })
  business_category: string;

  @ApiProperty({
    description: 'Registration number',
    type: String,
    example: 's#kA6uA1LkTt[5P',
    required: true,
  })
  @IsString({ message: 'Registration number must be a string' })
  @IsNotEmpty({ message: 'Registration number is required' })
  registration_number: string;

  @ApiPropertyOptional({
    description: 'Phone number',
    type: String,
    example: '080123456789',
  })
  @IsString({ message: 'Phone number must be a string' })
  @IsOptional()
  phone_number: string;

  @ApiPropertyOptional({
    description: 'Website link',
    type: String,
    example: 'https://xample.co.uk',
  })
  @IsString({ message: 'Website link must be a string' })
  @IsOptional()
  website_url: string;

  @ApiPropertyOptional({
    description: 'Facebook link',
    type: String,
    example: 'https://facebook.com/xample-co-uk',
  })
  @IsString({ message: 'Facebook link must be a string' })
  @IsOptional()
  facebook_url: string;
}
