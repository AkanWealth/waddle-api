import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class ReportEventDto {
  @ApiProperty({
    description: 'Reason the event is being reported',
    example: 'Contains misleading information',
  })
  @IsString()
  @IsNotEmpty()
  reason: string;

  @ApiPropertyOptional({
    description: 'Additional details about the report',
    example: 'The event advertises free entry but charges at the door',
  })
  @IsOptional()
  @IsString()
  description?: string;
}
