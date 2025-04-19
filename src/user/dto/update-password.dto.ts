import { IsString, Matches, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdatePasswordDto {
  @ApiProperty({
    description: 'The old password of the user',
    required: true,
    example: 'Jd@1234.',
  })
  @IsString({ message: 'The old password must be a string' })
  @MinLength(8, { message: 'The old password must be minimum of 8 characters' })
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*()-_=+[\]{};':",.<>/?\\|])\S{8,}$/,
    {
      message:
        'Minimum 8 characters, at least one uppercase, one lowercase, one number, and one special character, and no spaces',
    },
  )
  old_password: string;

  @ApiProperty({
    description: 'The new password of the user',
    required: true,
    example: '.4321@dJ',
  })
  @IsString({ message: 'The new password must be a string' })
  @MinLength(8, { message: 'The new password must be minimum of 8 characters' })
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*()-_=+[\]{};':",.<>/?\\|])\S{8,}$/,
    {
      message:
        'Minimum 8 characters, at least one uppercase, one lowercase, one number, and one special character, and no spaces',
    },
  )
  new_password: string;
}
