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
import { InterviewGuideService } from './interview-guide.service';
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
    private interviewGuideService: InterviewGuideService,
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

  @Post(':processInstanceId/reopen')
  async reopenProcess(
    @Param('processInstanceId') processInstanceId: string,
    @Request() req: any,
  ) {
    return this.processesService.reopenProcess(processInstanceId, req.user.id);
  }

  @Post(':processInstanceId/stages/:stageInstanceId/guide')
  async generateGuide(
    @Param('processInstanceId') processInstanceId: string,
    @Param('stageInstanceId') stageInstanceId: string,
    @Request() req: any,
  ) {
    return this.interviewGuideService.generateGuide(processInstanceId, stageInstanceId, req.user.id);
  }

  @Patch(':processInstanceId/stages/:stageInstanceId/notes')
  async updateNotes(
    @Param('processInstanceId') processInstanceId: string,
    @Param('stageInstanceId') stageInstanceId: string,
    @Body() body: { notes: Record<string, string> },
    @Request() req: any,
  ) {
    return this.interviewGuideService.updateNotes(processInstanceId, stageInstanceId, req.user.id, body.notes || {});
  }
}
