import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class SendEmailToWaddleTeamViaContactUsFormDto {
  @ApiProperty({
    description: 'Email',
    example: 'test@example.com',
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    description: 'Name',
    example: 'John Doe',
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: 'Message',
    example: 'This is a test message',
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  message: string;
}
