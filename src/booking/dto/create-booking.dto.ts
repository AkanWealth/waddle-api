import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class CreateBookingDto {
  @ApiProperty({
    description: 'Event ID',
    example: 'cm7539b180003u0qavzlq72p4',
    required: true,
  })
  @IsString({ message: 'Event ID must be a string' })
  @IsNotEmpty({ message: 'Event ID can not be empty' })
  eventId: string;

  @ApiProperty({
    description: 'Ticket quantity',
    example: 3,
    required: true,
  })
  @IsNumber({}, { message: 'Ticket quantity must be a number' })
  @IsNotEmpty({ message: 'Ticket quantity can not be empty' })
  ticket_quantity: number;
}
