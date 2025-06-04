import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CreateLikeDto {
  @ApiProperty({
    description: 'Event ID to like',
    example: 'hdiyir6ehef8y3883y',
    required: true,
  })
  @IsString({ message: 'Event ID must be a type of string' })
  @IsNotEmpty({ message: 'Event ID must not be empty' })
  eventId: string;
}
