import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class CreateCrowdSourceReviewDto {
  @IsOptional()
  @IsString()
  comment?: string;

  @IsBoolean()
  would_recommend: boolean;
}
