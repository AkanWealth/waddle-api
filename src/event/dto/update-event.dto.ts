import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { CreateEventDto } from './create-event.dto';
import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateEventDto extends PartialType(CreateEventDto) {
  @ApiPropertyOptional({
    description: 'The published state of the event',
    example: true,
  })
  @IsBoolean({ message: 'The published value must be a boolean' })
  @IsOptional()
  isPublished: true;
}
