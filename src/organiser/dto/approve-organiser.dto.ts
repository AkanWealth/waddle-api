import { IsBoolean, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ApproveOrganiserDto {
  @ApiProperty({
    example: true,
    description: 'Set to true to approve, false to reject the organiser',
  })
  @IsBoolean()
  isApproved: boolean;

  @ApiPropertyOptional({
    example: 'Violation of policies',
    description: 'Rejection reason',
  })
  @IsOptional()
  @IsString()
  rejectionReason: string;
}
