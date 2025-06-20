import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CreateCommentLikeDto {
  @ApiProperty({
    description: 'Comment ID to like',
    example: 'hdiyir6ehef8y3883y',
    required: true,
  })
  @IsString({ message: 'Comment ID must be a type of string' })
  @IsNotEmpty({ message: 'Comment ID must not be empty' })
  commentId: string;
}
