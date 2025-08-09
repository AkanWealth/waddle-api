import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';
import { SignInDto } from './signin.dto';

export class OrganiserSignUpDto extends SignInDto {
  @ApiProperty({
    description: 'Founder name',
    type: String,
    example: 'Moly Parker',
    required: true,
  })
  @IsString({ message: 'Founder name must be a string' })
  @IsNotEmpty({ message: 'Founder name is required' })
  name: string;
}
