import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty } from 'class-validator';

export enum CommentFlagStatus {
  APPROPRIATE = 'APPROPRIATE',
  INAPPROPRIATE = 'INAPPROPRIATE',
}

export class FlagCommentDto {
  @ApiProperty({
    description: 'Comment status flag',
    enum: CommentFlagStatus,
    example: CommentFlagStatus.APPROPRIATE,
  })
  @IsEnum(CommentFlagStatus, {
    message: 'Status must be APPROPRIATE or INAPPROPRIATE',
  })
  @IsNotEmpty({ message: 'Status is required' })
  status: CommentFlagStatus;
}
