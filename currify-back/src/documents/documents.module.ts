import { Module } from '@nestjs/common';
import { DocumentsService } from './documents.service';
import { DocumentsController } from './documents.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { ScoringModule } from '../scoring/scoring.module';

@Module({
  imports: [PrismaModule, ScoringModule],
  controllers: [DocumentsController],
  providers: [DocumentsService],
  exports: [DocumentsService],
})
export class DocumentsModule {}