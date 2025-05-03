import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @ApiProperty({
    description: 'Password',
    required: true,
    example: 'Jd@1234.',
  })
  @IsString({ message: 'Invalid password format' })
  @IsNotEmpty({ message: 'Password can not be empty' })
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
