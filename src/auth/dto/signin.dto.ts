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
    description: 'The email of the user',
    required: true,
    example: 'jd@gmail.com',
  })
  @IsNotEmpty({ message: 'The email can not be blank' })
  @IsEmail({}, { message: 'This must ba avlid email address' })
  email: string;

  @ApiProperty({
    description: 'The password of the user',
    required: true,
    example: 'Jd@1234.',
  })
  @IsString({ message: 'The password must be a string' })
  @MinLength(8, { message: 'The password must be minimum of 8 characters' })
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*()-_=+[\]{};':",.<>/?\\|])\S{8,}$/,
    {
      message:
        'Minimum 8 characters, at least one uppercase, one lowercase, one number, and one special character, and no spaces',
    },
  )
  password: string;
}
