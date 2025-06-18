import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class PayoutBookingDto {
  @ApiProperty({
    description: 'Amount',
    example: 2000,
    required: true,
  })
  @IsString({ message: 'Amount must be a number' })
  @IsNotEmpty({ message: 'Amount can not be empty' })
  amount: number;

  @ApiProperty({
    description: 'Payment account id',
    example: 'ba_Aabcxyz01aDfoo',
    required: true,
  })
  @IsString({ message: 'Payment account id must be a string' })
  @IsNotEmpty({ message: 'Payment account id can not be empty' })
  paymentAccountId: string;

  @ApiProperty({
    description: 'Description',
    example: 'Pay organiser for booking of Art event',
    required: true,
  })
  @IsString({ message: 'Descriptions must be a string' })
  @IsNotEmpty({ message: 'Descriptions can not be empty' })
  description: string;
}
