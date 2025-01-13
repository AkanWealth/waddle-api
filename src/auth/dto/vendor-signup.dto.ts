import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { SignInDto } from './signin.dto';

export class VendorSignUpDto extends SignInDto {
  @ApiProperty({
    description: 'The name of the Owner',
    required: true,
    example: 'Moly Parker',
  })
  @IsString({ message: 'The name must be a string' })
  @IsNotEmpty({ message: 'The name is required' })
  name: string;

  @ApiProperty({
    description: 'The address of the business',
    required: true,
    example: '12B Cresent Maryland',
  })
  @IsString({ message: 'The address must be a string' })
  @IsNotEmpty({ message: 'The address is required' })
  address: string;

  @ApiProperty({
    description: 'The name of the business ',
    required: true,
    example: 'Mr Bigs',
  })
  @IsString({ message: 'The business name must be a string' })
  @IsNotEmpty({ message: 'The business name is required' })
  business_name: string;

  @ApiProperty({
    description: 'The registration number of the business',
    required: true,
    example: 's#kA6uA1LkTt[5P',
  })
  @IsString({ message: 'The registration number must be a string' })
  @IsNotEmpty({ message: 'The registration number is required' })
  registration_number: string;

  @ApiPropertyOptional({
    description: 'The phone number of the business',
    example: '080123456789',
  })
  @IsString({ message: 'The phone number must be a string' })
  @IsOptional()
  phone_number: string;

  @ApiPropertyOptional({
    description: 'The business link of the business',
    example: 'https://xample.co.uk',
  })
  @IsString({ message: 'The business link must be a string' })
  @IsOptional()
  business_url: string;

  @ApiPropertyOptional({
    description: 'The facebook link of the business',
    example: 'https://facebook.com/xample-co-uk',
  })
  @IsString({ message: 'The facebook link must be a string' })
  @IsOptional()
  facebook_url: string;
}
