import { IsString, MinLength, IsNotEmpty } from 'class-validator';

export class SetPasswordDto {
  @IsString()
  @IsNotEmpty()
  token: string;

  @IsString()
  @MinLength(6)
  @IsNotEmpty()
  password: string;
}
