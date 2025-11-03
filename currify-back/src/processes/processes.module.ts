import { Module } from '@nestjs/common';
import { ProcessesService } from './processes.service';
import { ProcessesController } from './processes.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [PrismaModule, AuditModule, NotificationsModule],
  controllers: [ProcessesController],
  providers: [ProcessesService],
  exports: [ProcessesService],
})
export class ProcessesModule {}
