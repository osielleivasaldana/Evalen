import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { CampaignsModule } from './campaigns/campaigns.module';
import { DocumentsModule } from './documents/documents.module';
import { CandidatesModule } from './candidates/candidates.module';
import { ScoringModule } from './scoring/scoring.module';
import { AuditModule } from './audit/audit.module';
import { NotificationsModule } from './notifications/notifications.module';
import { ProcessesModule } from './processes/processes.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 10,
      },
    ]),
    PrismaModule,
    AuthModule,
    CampaignsModule,
    DocumentsModule,
    CandidatesModule,
    ScoringModule,
    AuditModule,
    NotificationsModule,
    ProcessesModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}