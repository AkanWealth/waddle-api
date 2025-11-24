import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ReportStatus } from '@prisma/client';
import { IsBoolean, IsEnum, IsOptional } from 'class-validator';

export class UpdateReportStatusDto {
  @ApiProperty({ enum: ReportStatus, enumName: 'ReportStatus' })
  @IsEnum(ReportStatus)
  status: ReportStatus;

  @ApiPropertyOptional({
    description: 'When true, removes or hides the offending content.',
  })
  @IsOptional()
  @IsBoolean()
  removeContent?: boolean;
}
