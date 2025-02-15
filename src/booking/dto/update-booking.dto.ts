import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { CreateBookingDto } from './create-booking.dto';
import { IsOptional, IsString } from 'class-validator';

export class UpdateBookingDto extends PartialType(CreateBookingDto) {
  @ApiPropertyOptional({
    description: 'The status of the booked event',
    example: 'Confirmed',
  })
  @IsString({ message: 'Status of the booked event must be a string' })
  @IsOptional()
  status: string;
}
