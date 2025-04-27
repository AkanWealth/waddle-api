import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class VerifyDto {
  @ApiProperty({
    description: 'The token',
    required: true,
    example: '8rs4syl53gd',
  })
  @IsString({ message: 'Invalid token format' })
  @IsNotEmpty({ message: 'Token can not be empty' })
  token: string;
}
