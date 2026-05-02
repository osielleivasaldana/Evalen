import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class SmartFillDto {
  @IsString()
  @IsNotEmpty()
  jobTitle: string;

  @IsString()
  @IsOptional()
  additionalContext?: string;

  @IsString()
  @IsOptional()
  language?: string;
}
