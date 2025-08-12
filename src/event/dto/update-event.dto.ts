import { PartialType } from '@nestjs/swagger';
import { DraftEventDto } from './draft-event.dto';

export class UpdateEventDto extends PartialType(DraftEventDto) {}
