import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class CreateActivitiesDto {
  @ApiProperty({
    description: 'The name of the activity',
    example: 'Art Workshop',
  })
  @IsNotEmpty({ message: 'The name can not be blank' })
  @IsString({ message: 'The name must be a string' })
  name: string;

  @ApiProperty({
    description: 'The description of the activity',
    example:
      'Unleash your creativity in our art workshop, suitable for all skill levels.',
  })
  @IsString({ message: 'The description must be a string' })
  @IsNotEmpty({ message: 'The description cannot be empty' })
  description: string;

  @ApiProperty({
    description: 'The address of the activity',
    example: '321 Art Ave, Creative City, CC 98765',
  })
  @IsString({ message: 'The address must be a string' })
  @IsNotEmpty({ message: 'The address can not be blanck' })
  address: string;

  @ApiProperty({
    description: 'The capacity of the activity',
    example: 50,
  })
  @IsNumber({}, { message: 'The capacity must be a number' })
  @IsNotEmpty({ message: 'The capacity can not be blanck' })
  capacity: number;

  @ApiProperty({
    description: 'The amenities of the activity',
    example: ['Art Supplies', 'Expert Guidance', 'Refreshments'],
  })
  @IsArray({ message: 'The amenities must be a string' })
  @IsNotEmpty({ message: 'The amenities can not be blank' })
  amenities: [string];

  @ApiProperty({
    description: 'The images of the activity',
    example: [
      'https://example.com/images/art_workshop_1.jpg',
      'https://example.com/images/art_workshop_2.jpg',
    ],
  })
  @IsArray({ message: 'The images must be an array' })
  @IsNotEmpty({ message: 'The images can not be blank' })
  images: [string];
}
