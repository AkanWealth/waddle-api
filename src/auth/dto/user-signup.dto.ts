import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { SignInDto } from './signin.dto';

export class UserSignUpDto extends SignInDto {
  @ApiPropertyOptional({
    description: 'Name',
    type: String,
    example: 'John Doe',
  })
  @IsString({ message: 'Parent name must be a string' })
  @IsOptional()
  name: string;
}
