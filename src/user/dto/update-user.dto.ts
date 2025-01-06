import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsOptional } from 'class-validator';
import { UserSignUpDto } from '../../auth/dto';

export class UpdateUserDto extends PartialType(UserSignUpDto) {
  @ApiPropertyOptional({ description: 'The name of the user' })
  @IsOptional()
  name: string;

  @ApiPropertyOptional({ description: 'The email of the user' })
  @IsOptional()
  email: string;

  @ApiPropertyOptional({ description: 'The password of the user' })
  @IsOptional()
  password: string;
}
