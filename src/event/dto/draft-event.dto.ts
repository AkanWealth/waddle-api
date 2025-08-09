import { PartialType } from '@nestjs/swagger';
import { CreateEventDto } from './create-event.dto';

export class DraftEventDto extends PartialType(CreateEventDto) {}
