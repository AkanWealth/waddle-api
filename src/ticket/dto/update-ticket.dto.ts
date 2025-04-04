import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UpdateTicketDto {
  @ApiProperty({
    description: 'The email of the sender',
    example: 'example@mail.com',
    required: true,
  })
  @IsString({ message: 'The email value must be a string' })
  @IsNotEmpty({ message: 'The email value can not be empty' })
  email: string;

  @ApiProperty({
    description: 'The description of the mail',
    example: 'Some content of the mail here...',
    required: true,
  })
  @IsString({ message: 'The description value must be a string' })
  @IsNotEmpty({ message: 'The description value can not be empty' })
  description: string;
}
