import { IsNotEmpty, IsString, IsOptional } from 'class-validator';

export class UploadDocumentDto {
  @IsNotEmpty()
  @IsString()
  campaignPublicId: string;

  @IsOptional()
  @IsString()
  candidateName?: string;

  @IsOptional()
  @IsString()
  candidateEmail?: string;

  @IsOptional()
  @IsString()
  candidatePhone?: string;
}