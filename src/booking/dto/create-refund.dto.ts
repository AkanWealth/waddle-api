import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CreateRefundDto {
  @ApiProperty({
    description: 'Booking ID',
    example: 'cm7539b180003u0qavzlq72p4',
    required: true,
  })
  @IsString({ message: 'Booking ID must be a string' })
  @IsNotEmpty({ message: 'Booking ID can not be empty' })
  id: string;

  @ApiProperty({
    description: 'Payment intent',
    example: 'pi_Aabcxyz01aDfoo',
    required: true,
  })
  @IsString({ message: 'Payment intent must be a string' })
  @IsNotEmpty({ message: 'Payment intent can not be empty' })
  payment_intent: string;
}
