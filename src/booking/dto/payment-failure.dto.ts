import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class PaymentFailureDto {
  @ApiProperty({
    description: 'Payment Intent ID from Stripe',
    example: 'pi_3OqX8X2eZvKYlo2C1gFJqX8X',
    required: true,
  })
  @IsString({ message: 'Payment Intent ID must be a string' })
  @IsNotEmpty({ message: 'Payment Intent ID cannot be empty' })
  payment_intent_id: string;

  @ApiProperty({
    description: 'Error message or reason for failure',
    example: 'Card declined',
    required: false,
  })
  error_message?: string;
}
