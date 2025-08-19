import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CommentCrowdSourcingDto {
  @ApiProperty({
    description: 'Crowd Source ID',
    example: 'hdiyir6ehef8y3883y',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Crowd Source ID must be a type of string' })
  crowdSourceId?: string;

  @ApiProperty({
    description: 'Parent comment ID for replies',
    example: 'hdiyir6ehef8y3883y',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Parent ID must be a type of string' })
  parentId?: string;

  @ApiProperty({
    description: 'Comment content',
    example: 'This is a great place!',
    required: true,
  })
  @IsString({ message: 'Content must be a type of string' })
  @IsNotEmpty({ message: 'Content must not be empty' })
  content: string;
}
