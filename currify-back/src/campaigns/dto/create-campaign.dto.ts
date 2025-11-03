import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsBoolean,
  IsNumber,
  Min,
  IsArray,
  ValidateNested
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { WorkType, Modality, Duration, Currency } from '../../common/enums';
import { IsEnumValue } from '../../common/validators/is-enum-value.validator';

export class StageTemplateDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  @IsNotEmpty()
  responsibleId: string;

  @IsNumber()
  @Min(1)
  order: number;
}

export class CreateCampaignDto {
  @IsNotEmpty()
  @IsString()
  title: string;

  @IsNotEmpty()
  @IsString()
  description: string;

  @IsOptional()
  @IsString()
  requirements?: string;

  @IsOptional()
  @IsString()
  conditions?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => value === '' ? undefined : value)
  location?: string;

  @IsOptional()
  @IsEnumValue(WorkType)
  @Transform(({ value }) => value === '' || value === null ? undefined : value)
  workType?: WorkType;

  @IsOptional()
  @IsEnumValue(Modality)
  @Transform(({ value }) => value === '' || value === null ? undefined : value)
  modality?: Modality;

  @IsOptional()
  @IsEnumValue(Duration)
  @Transform(({ value }) => value === '' || value === null ? undefined : value)
  duration?: Duration;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => {
    if (value === '' || value === null || value === undefined) return undefined;
    return value === 'true' || value === true;
  })
  inclusionPosition?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Transform(({ value }) => {
    if (value === '' || value === null || value === undefined) return undefined;
    const parsed = parseFloat(value);
    return isNaN(parsed) ? undefined : parsed;
  })
  salary?: number;

  @IsOptional()
  @IsEnumValue(Currency)
  @Transform(({ value }) => value === '' || value === null ? undefined : value)
  currency?: Currency;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => {
    if (value === '' || value === null || value === undefined) return undefined;
    return value === 'true' || value === true;
  })
  showSalary?: boolean;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StageTemplateDto)
  stageTemplates: StageTemplateDto[];
}