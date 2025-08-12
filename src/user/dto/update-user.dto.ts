import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, Matches } from 'class-validator';
import { UserSignUpDto } from '../../auth/dto';

export class UpdateUserDto extends PartialType(UserSignUpDto) {
  @ApiPropertyOptional({
    description: 'Profile Picture',
    example: 'https://waddles3.jpg',
  })
  @IsOptional()
  @IsString()
  profile_picture: string;

  @ApiPropertyOptional({ description: 'Email', example: 'dad@gmail.com' })
  @IsOptional()
  @IsEmail()
  email: string;

  @ApiPropertyOptional({ description: 'Password', example: 'P@$$w0rd.' })
  @IsOptional()
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*()-_=+[\]{};':",.<>/?\\|])\S{8,}$/,
    {
      message:
        'At least one uppercase, one lowercase, one number, and one special character, and no spaces',
    },
  )
  password: string;

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
}
