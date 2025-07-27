import { IsEnum, IsNotEmpty } from 'class-validator';
import { DisputeStatus } from '@prisma/client';

export class UpdateDisputeStatusDto {
  @IsEnum(DisputeStatus)
  @IsNotEmpty()
  status: DisputeStatus;
}
