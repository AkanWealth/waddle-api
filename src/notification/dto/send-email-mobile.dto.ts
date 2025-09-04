import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class sendEmailMobile {
  @ApiProperty({
    description: 'Message',
    example: 'This is a test message',
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  message: string;
}
