import { IsEmail, IsString, MinLength, IsOptional, IsEnum } from 'class-validator';

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

  @IsEnum(['ADMIN', 'RECRUITER', 'INTERVIEWER'])
  @IsOptional()
  role?: string;
}
