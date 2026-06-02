import { Module } from '@nestjs/common';
import { CandidatesService } from './candidates.service';
import { CandidatesController } from './candidates.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { ScoringModule } from '../scoring/scoring.module';

@Module({
  imports: [PrismaModule, ScoringModule],
  controllers: [CandidatesController],
  providers: [CandidatesService],
  exports: [CandidatesService],
})
export class CandidatesModule {}