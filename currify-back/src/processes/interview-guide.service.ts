import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { PrismaService } from '../prisma/prisma.service';

export interface GuideQuestion {
  question: string;
  source: 'rubrica' | 'perfil' | 'brecha' | 'estandar';
}

@Injectable()
export class InterviewGuideService {
  private readonly coreUrl: string;
  private readonly username: string;
  private readonly password: string;

  constructor(
    private readonly prisma: PrismaService,
    config: ConfigService,
  ) {
    this.coreUrl = config.get<string>('SCORING_SERVICE_URL') || 'http://localhost:8000';
    this.username = config.get<string>('SCORING_SERVICE_USERNAME') || 'recruiter';
    this.password = config.get<string>('SCORING_SERVICE_PASSWORD') || 'recruiter123';
  }

  private async getToken(): Promise<string> {
    const response = await axios.post(`${this.coreUrl}/auth/login`, {
      username: this.username,
      password: this.password,
    });
    return response.data.access_token;
  }

  private async loadAuthorizedStage(processInstanceId: string, stageInstanceId: string, userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const stage = await this.prisma.stageInstance.findUnique({
      where: { id: stageInstanceId },
      include: { stageTemplate: true, processInstance: { select: { campaignId: true, candidateId: true } } },
    });
    if (!stage) throw new NotFoundException('Stage not found');
    if (stage.processInstanceId !== processInstanceId) throw new ForbiddenException('Stage does not belong to process');

    const campaign = await this.prisma.campaign.findUnique({ where: { id: stage.processInstance.campaignId } });
    if (!campaign) throw new NotFoundException('Campaign not found');
    const isOwner = campaign && (campaign.userId === userId || user.role === 'ADMIN');
    const isStageResponsible = stage.responsibleId === userId;

    if (!isOwner && !isStageResponsible) {
      throw new ForbiddenException('Only the campaign owner or the stage responsible can manage this stage');
    }

    return { user, stage, campaign, isOwner };
  }

  async generateGuide(processInstanceId: string, stageInstanceId: string, userId: string) {
    const { stage, campaign } = await this.loadAuthorizedStage(processInstanceId, stageInstanceId, userId);
    const candidate = await this.prisma.candidate.findUnique({
      where: { id: stage.processInstance.candidateId },
      include: { scoring: true },
    });
    if (!candidate) throw new NotFoundException('Candidate not found');

    const sd = (candidate.structuredData as any)?.datos_cv || {};
    const gaps = (candidate.scoring as any)?.gaps || [];

    // PRIVACIDAD: candidate + campaign + stage + rúbrica. NUNCA feedback/notas
    // de otras etapas. Esto se garantiza por construcción del payload.
    const payload = {
      campaign: {
        title: campaign.title,
        description: campaign.description || '',
        requirements: [campaign.requirements, campaign.conditions].filter(Boolean).join('\n'),
      },
      stage: {
        name: stage.stageTemplate.name,
        description: stage.stageTemplate.description || '',
      },
      candidate: {
        resumen: sd.resumen_profesional?.resumen || '',
        habilidades: (sd.habilidades?.habilidades_tecnicas || []).map((h: any) => h.skill).filter(Boolean),
        brechas: gaps,
      },
      rubric_criteria: ((campaign.parsedJobData as any)?.requisitos?.habilidades_requeridas || []),
    };

    const token = await this.getToken();
    const response = await axios.post(`${this.coreUrl}/interview/questions`, payload, {
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    });

    const guide = response.data as { questions: GuideQuestion[] };
    await this.prisma.stageInstance.update({
      where: { id: stageInstanceId },
      data: { guideJson: guide as any },
    });

    return guide;
  }

  async updateNotes(processInstanceId: string, stageInstanceId: string, userId: string, notes: Record<string, string>) {
    await this.loadAuthorizedStage(processInstanceId, stageInstanceId, userId);
    const updated = await this.prisma.stageInstance.update({
      where: { id: stageInstanceId },
      data: { notesJson: notes },
    });
    return { notesJson: updated.notesJson };
  }
}