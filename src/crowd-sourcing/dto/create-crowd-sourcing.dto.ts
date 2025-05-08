import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateCrowdSourcingDto {
  @ApiPropertyOptional({
    description: 'Images',
    type: 'array',
    example: 'xample.png, example.png, ample.png',
  })
  @IsArray()
  @IsOptional()
  images: [string];

  @ApiProperty({
    description: 'Name',
    type: String,
    example: 'Isaac John Park',
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: 'Description',
    type: String,
    example: 'Isaac John Park',
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({
    description: 'Address',
    type: String,
    example: '156 Landrole Coventry',
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  address: string;
}
