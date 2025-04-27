import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CreateFavoriteDto {
  @ApiProperty({
    description: 'The Id of the event',
    example: 'jyiy29723877de339y98yr8e',
    required: true,
  })
  @IsString({ message: 'Event ID must be a string' })
  @IsNotEmpty({ message: 'Event ID cannot be empty' })
  eventId: string;
}
