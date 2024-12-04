import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsOptional } from 'class-validator';
import { CreateActivitiesDto } from './create-activities.dto';

export class UpdateActivitiesDto extends PartialType(CreateActivitiesDto) {}
