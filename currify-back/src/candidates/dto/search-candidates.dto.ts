import { IsOptional, IsString, IsArray } from 'class-validator';
import { ProcessingStatus } from '@prisma/client';
import { PROCESSING_STATUS_VALUES } from '../../common/enums';
import { IsEnumValue } from '../../common/validators/is-enum-value.validator';

export class SearchCandidatesDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  skills?: string[];

  @IsOptional()
  @IsString()
  experience?: string;

  @IsOptional()
  @IsEnumValue(PROCESSING_STATUS_VALUES)
  status?: ProcessingStatus;

  @IsOptional()
  @IsString()
  sortBy?: 'createdAt' | 'name' | 'email';

  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc';
}