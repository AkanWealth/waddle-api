import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateTicketDto {
  @ApiProperty({
    description: 'Email',
    example: 'example@mail.com',
    required: true,
  })
  @IsEmail({}, { message: 'Email value must be a valid email address' })
  @IsNotEmpty({ message: 'Email value can not be empty' })
  email: string;

  @ApiPropertyOptional({
    description: 'CC Email',
    example: 'cc-example@mail.com',
  })
  @IsString({ message: 'The cc_mail must be a string' })
  @IsOptional()
  cc_emails: string;

  @ApiProperty({
    description: 'Subject',
    example: 'Payment issue',
    required: true,
  })
  @IsString({ message: 'Subject value must be a string' })
  @IsNotEmpty({ message: 'Subject value can not be empty' })
  subject: string;

  @ApiProperty({
    description: 'Description',
    example: 'Some content of the mail here...',
    required: true,
  })
  @IsString({ message: 'Description value must be a string' })
  @IsNotEmpty({ message: 'Description value can not be empty' })
  description: string;

  @ApiProperty({
    description: 'Status',
    example: 2,
    required: true,
  })
  @IsNumber({}, { message: 'Status value must be a interger of (2,3,4,5,6,7)' })
  @IsNotEmpty({ message: 'Status value can not be empty' })
  status: number;

  @ApiProperty({
    description: 'Priority',
    example: 1,
    required: true,
  })
  @IsNumber({}, { message: 'Priority value must be an integer of (1,2,3,4)' })
  @IsNotEmpty({ message: 'Priority value can not be empty' })
  priority: number;
}
