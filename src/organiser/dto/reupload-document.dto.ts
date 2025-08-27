import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional } from 'class-validator';

export class ReuploadDocumentDto {
  @ApiPropertyOptional({ description: 'Business name' })
  @IsOptional()
  attachment: string;
}
