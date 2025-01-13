import { PartialType } from '@nestjs/swagger';
import { CreateActivitiesDto } from './create-activities.dto';

export class UpdateActivitiesDto extends PartialType(CreateActivitiesDto) {}
