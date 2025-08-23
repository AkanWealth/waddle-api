import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class ConfirmEventCancellation {
  @ApiPropertyOptional({
    description: 'Custom message',
    example: 'Refunds will be processed',
  })
  @IsOptional()
  @IsString({ message: 'Custom message must be a string' })
  customMessage?: string;
}
