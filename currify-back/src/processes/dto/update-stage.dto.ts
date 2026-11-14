import { IsString, IsNotEmpty, ValidateIf } from 'class-validator';
import { IsEnumValue } from '../../common/validators/is-enum-value.validator';

const DECISION_VALUES = ['ACCEPTED', 'REJECTED'] as const;

export class UpdateStageDto {
  @IsEnumValue(DECISION_VALUES)
  decision: 'ACCEPTED' | 'REJECTED';

  @ValidateIf(o => o.decision === 'REJECTED')
  @IsString()
  @IsNotEmpty()
  feedback?: string;
}
