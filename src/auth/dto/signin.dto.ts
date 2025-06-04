import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';

export class SignInDto {
  @ApiProperty({
    description: 'Email',
    required: true,
    example: 'jd@gmail.com',
  })
  @IsNotEmpty({ message: 'The email can not be blank' })
  @IsEmail({}, { message: 'This must ba a valid email address' })
  email: string;

  @ApiProperty({
    description: 'Password',
    required: true,
    example: 'Jd@1234.',
  })
  @IsString({ message: 'Password must be a string' })
  @MinLength(8, { message: 'Password must be minimum of 8 characters' })
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*()-_=+[\]{};':",.<>/?\\|])\S{8,}$/,
    {
      message:
        'At least one uppercase, one lowercase, one number, and one special character, and no spaces',
    },
  )
  password: string;
}
