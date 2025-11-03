import { IsString, IsOptional, IsDateString, IsBoolean } from 'class-validator';

export class StartProcessDto {
  @IsString()
  campaignId: string;

  @IsString()
  candidateId: string;

  @IsString()
  @IsOptional()
  responsibleId?: string;

  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsBoolean()
  @IsOptional()
  notifyCandidate?: boolean;
}
