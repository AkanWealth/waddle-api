import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, Matches } from 'class-validator';
import { UserSignUpDto } from '../../auth/dto';

export class UpdateUserDto extends PartialType(UserSignUpDto) {
  @ApiPropertyOptional({ description: 'Name', example: 'David Adeoti' })
  @IsOptional()
  @IsString()
  name: string;

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
}
