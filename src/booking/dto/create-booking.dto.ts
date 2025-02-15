import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CreateBookingDto {
  @ApiProperty({
    description: 'The event ID booked',
    example: 'cm7539b180003u0qavzlq72p4',
    required: true,
  })
  @IsString({ message: 'Event ID must be a string' })
  @IsNotEmpty({ message: 'Event ID can not be empty' })
  eventId: string;
}
