import { SetMetadata } from '@nestjs/common';

export const RequireCredits = (credits: number) => SetMetadata('requiredCredits', credits);
