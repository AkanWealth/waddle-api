import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CreateWebhookDto {
  @ApiProperty({ description: 'Name' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({ description: 'URL' })
  @IsNotEmpty()
  @IsString()
  url: string;
}
