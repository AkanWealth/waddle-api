import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CreateLikeDto {
  @ApiProperty({
    description: 'The event id to like',
    example: 'hdiyir6ehef8y3883y',
    required: true,
  })
  @IsString({ message: 'The event id must be a type of string' })
  @IsNotEmpty({ message: 'The event id must not be empty' })
  eventId: string;
}
