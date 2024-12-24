import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class ResetPasswordDto {
  @ApiProperty({
    description: 'The new password of the user',
    required: true,
    example: 'Jd@1234',
  })
  @IsString({ message: 'Invalid password format' })
  @IsNotEmpty({ message: 'Password can not be empty' })
  password: string;
}
