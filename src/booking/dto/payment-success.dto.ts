import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class PaymentSuccessDto {
  @ApiProperty({
    description: 'Payment Intent ID from Stripe',
    example: 'pi_3OqX8X2eZvKYlo2C1gFJqX8X',
    required: true,
  })
  @IsString({ message: 'Payment Intent ID must be a string' })
  @IsNotEmpty({ message: 'Payment Intent ID cannot be empty' })
  payment_intent_id: string;

  @ApiProperty({
    description: 'Event ID',
    example: 'cm7539b180003u0qavzlq72p4',
    required: true,
  })
  @IsString({ message: 'Event ID must be a string' })
  @IsNotEmpty({ message: 'Event ID cannot be empty' })
  eventId: string;

  @ApiProperty({
    description: 'Ticket quantity',
    example: 3,
    required: true,
  })
  @IsNotEmpty({ message: 'Ticket quantity cannot be empty' })
  ticket_quantity: number;
}
