import { IsBoolean, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ApproveOrganiserDto {
  @ApiProperty({
    example: true,
    description: 'Set to true to approve, false to reject the organiser',
  })
  @IsBoolean()
  isApproved: boolean;

  @ApiProperty({
    example: 'Violation of policies',
    description: 'Rejection reason',
  })
  @IsString()
  rejectionReason: string;
}
