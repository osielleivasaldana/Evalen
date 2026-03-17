import { IsEmail, IsString, MinLength, IsOptional, IsEnum } from 'class-validator';
import { UserRole } from '@prisma/client';

export class UpdateUserDto {
  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @MinLength(6)
  @IsOptional()
  password?: string;

  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  company?: string;

  @IsEnum(UserRole)
  @IsOptional()
  role?: UserRole;

  @IsString()
  @IsOptional()
  companySize?: string;

  @IsString()
  @IsOptional()
  hiringVolume?: string;

  @IsString()
  @IsOptional()
  atsSystem?: string;

  @IsOptional()
  onboardingCompleted?: boolean;
}
