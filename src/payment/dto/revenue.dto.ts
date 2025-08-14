import { IsOptional, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentStatus } from '@prisma/client';

export enum RevenuePeriod {
  THREE_MONTHS = '3months',
  SIX_MONTHS = '6months',
  NINE_MONTHS = '9months',
  TWELVE_MONTHS = '12months',
}

export class RevenueQueryDto {
  @ApiPropertyOptional({
    enum: RevenuePeriod,
    default: RevenuePeriod.SIX_MONTHS,
    description: 'Time period for revenue calculation',
  })
  @IsOptional()
  @IsEnum(RevenuePeriod)
  period?: RevenuePeriod = RevenuePeriod.SIX_MONTHS;

  @ApiPropertyOptional({
    enum: PaymentStatus,
    default: PaymentStatus.SUCCESSFUL,
    description: 'Status of the payment',
  })
  @IsOptional()
  // @IsEnum(PaymentStatus)
  status?: PaymentStatus = PaymentStatus.SUCCESSFUL;
}

export interface RevenueData {
  date: string;
  amount: number;
}
