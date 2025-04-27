import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateTicketDto {
  @ApiProperty({
    description: 'The email of the sender',
    example: 'example@mail.com',
    required: true,
  })
  @IsString({ message: 'The email value must be a string' })
  @IsNotEmpty({ message: 'The email value can not be empty' })
  email: string;

  @ApiPropertyOptional({
    description: 'The email address to be copied in the mail',
    example: 'cc-example@mail.com',
  })
  @IsString({ message: 'The cc_mail must be a string' })
  @IsOptional()
  cc_emails: string;

  @ApiProperty({
    description: 'The subject of the mail',
    example: 'Payment issue',
    required: true,
  })
  @IsString({ message: 'The subject value must be a string' })
  @IsNotEmpty({ message: 'The subject value can not be empty' })
  subject: string;

  @ApiProperty({
    description: 'The description of the mail',
    example: 'Some content of the mail here...',
    required: true,
  })
  @IsString({ message: 'The description value must be a string' })
  @IsNotEmpty({ message: 'The description value can not be empty' })
  description: string;

  @ApiProperty({
    description: 'The status of the mail',
    example: 2,
    required: true,
  })
  @IsNumber(
    {},
    { message: 'The status value must be a interger of (2,3,4,5,6,7)' },
  )
  @IsNotEmpty({ message: 'The status value can not be empty' })
  status: number;

  @ApiProperty({
    description: 'The priority of the mail',
    example: 1,
    required: true,
  })
  @IsNumber(
    {},
    { message: 'The priority value must be an integer of (1,2,3,4)' },
  )
  @IsNotEmpty({ message: 'The priority value can not be empty' })
  priority: number;
}
