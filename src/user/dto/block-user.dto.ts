import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class BlockUserDto {
  @ApiProperty({
    description: 'Identifier of the user to block',
    example: 'usr_123',
  })
  @IsString()
  @IsNotEmpty()
  blockedUserId: string;
}
