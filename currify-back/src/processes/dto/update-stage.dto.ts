import { IsString, IsNotEmpty } from 'class-validator';
import { IsEnumValue } from '../../common/validators/is-enum-value.validator';

const DECISION_VALUES = ['ACCEPTED', 'REJECTED'] as const;

export class UpdateStageDto {
  @IsEnumValue(DECISION_VALUES)
  decision: 'ACCEPTED' | 'REJECTED';

  @IsString()
  @IsNotEmpty()
  feedback: string;
}
