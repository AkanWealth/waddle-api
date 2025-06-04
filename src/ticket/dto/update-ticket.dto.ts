import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class UpdateTicketDto {
  @ApiProperty({
    description: 'Email',
    example: 'example@mail.com',
    required: true,
  })
  @IsEmail({}, { message: 'Email value must be a string' })
  @IsNotEmpty({ message: 'Email value can not be empty' })
  email: string;

  @ApiProperty({
    description: 'Description',
    example: 'Some content of the mail here...',
    required: true,
  })
  @IsString({ message: 'Description value must be a string' })
  @IsNotEmpty({ message: 'Description value can not be empty' })
  description: string;
}
