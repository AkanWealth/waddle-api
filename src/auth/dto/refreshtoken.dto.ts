import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class RefreshTokenDto {
  @ApiProperty({
    description: 'Token',
    required: true,
    example:
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjbTV2OWV4dXgwMDAwMmhrd2Zham4zeHoxIiwiZW1haWwiOiJqZEBnbWFpbC5jb20iLCJpYXQiOjE3MzY3ODU4MDQsImV4cCI6MTczNjc4OTQwNH0.fv5CKYZ1VsyqGdSv3jWPXH8tcOHgjQ0ZesEjMGBH6-0',
  })
  @IsString({ message: 'Invalid token format' })
  @IsNotEmpty({ message: 'Token can not be empty' })
  token: string;
}
