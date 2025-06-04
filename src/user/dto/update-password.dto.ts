import { IsString, Matches, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdatePasswordDto {
  @ApiProperty({
    description: 'Old password',
    required: true,
    example: 'Jd@1234.',
  })
  @IsString({ message: 'Old password must be a string' })
  @MinLength(8, { message: 'Old password must be minimum of 8 characters' })
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*()-_=+[\]{};':",.<>/?\\|])\S{8,}$/,
    {
      message:
        'At least one uppercase, one lowercase, one number, and one special character, and no spaces',
    },
  )
  old_password: string;

  @ApiProperty({
    description: 'New password',
    required: true,
    example: '.4321@dJ',
  })
  @IsString({ message: 'New password must be a string' })
  @MinLength(8, { message: 'New password must be minimum of 8 characters' })
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*()-_=+[\]{};':",.<>/?\\|])\S{8,}$/,
    {
      message:
        'At least one uppercase, one lowercase, one number, and one special character, and no spaces',
    },
  )
  new_password: string;
}
