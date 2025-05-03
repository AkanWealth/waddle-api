import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class BlacklistTokenDto {
  @ApiProperty({
    description: 'Access token',
    required: true,
    example:
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjbTV2OWV4dXgwMDAwMmhrd2Zham4zeHoxIiwiZW1haWwiOiJqZEBnbWFpbC5jb20iLCJpYXQiOjE3MzY3ODU4MDQsImV4cCI6MTczNjc4OTQwNH0.fv5CKYZ1VsyqGdSv3jWPXH8tcOHgjQ0ZesEjMGBH6-0',
  })
  @IsString({ message: 'Invalid access token format' })
  @IsNotEmpty({ message: 'Access token can not be empty' })
  access_token: string;

  @ApiProperty({
    description: 'Refresh token',
    required: true,
    example:
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjbTV2OWV4dXgwMDAwMmhrd2Zham4zeHoxIiwiZW1haWwiOiJqZEBnbWFpbC5jb20iLCJpYXQiOjE3MzY3ODU4MDQsImV4cCI6MTczNjc4OTQwNH0.fv5CKYZ1VsyqGdSv3jWPXH8tcOHgjQ0ZesEjMGBH6-0',
  })
  @IsString({ message: 'Invalid refresh token format' })
  @IsNotEmpty({ message: 'Refresh token can not be empty' })
  refresh_token: string;
}
