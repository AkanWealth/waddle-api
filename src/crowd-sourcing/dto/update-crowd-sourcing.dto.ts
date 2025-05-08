import { PartialType } from '@nestjs/swagger';
import { CreateCrowdSourcingDto } from './create-crowd-sourcing.dto';

export class UpdateCrowdSourcingDto extends PartialType(
  CreateCrowdSourcingDto,
) {}
