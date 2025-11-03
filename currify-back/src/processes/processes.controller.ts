import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ProcessesService } from './processes.service';
import { StartProcessDto } from './dto/start-process.dto';
import { UpdateStageDto } from './dto/update-stage.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuditService } from '../audit/audit.service';

@Controller('processes')
@UseGuards(JwtAuthGuard)
export class ProcessesController {
  constructor(
    private processesService: ProcessesService,
    private auditService: AuditService,
  ) {}

  @Post('start')
  async startProcess(@Body() dto: StartProcessDto, @Request() req: any) {
    return this.processesService.startProcess(req.user.id, dto);
  }

  @Get('campaign/:campaignId/candidate/:candidateId')
  async getProcess(
    @Param('campaignId') campaignId: string,
    @Param('candidateId') candidateId: string,
    @Request() req: any,
  ) {
    return this.processesService.getProcessByCandidate(
      campaignId,
      candidateId,
      req.user.id,
    );
  }

  @Patch('stages/:stageInstanceId')
  async updateStage(
    @Param('stageInstanceId') stageInstanceId: string,
    @Body() dto: UpdateStageDto,
    @Request() req: any,
  ) {
    return this.processesService.updateStageDecision(
      stageInstanceId,
      req.user.id,
      dto,
    );
  }

  @Get(':processInstanceId/audit')
  async getAuditLog(@Param('processInstanceId') processInstanceId: string) {
    return this.auditService.getByProcess(processInstanceId);
  }
}
