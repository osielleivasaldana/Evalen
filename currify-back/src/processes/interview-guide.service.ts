import { Injectable, ForbiddenException, NotFoundException, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { PrismaService } from '../prisma/prisma.service';

export interface GuideQuestion {
  question: string;
  source: 'rubrica' | 'perfil' | 'brecha' | 'estandar';
}

@Injectable()
export class InterviewGuideService {
  private readonly logger = new Logger(InterviewGuideService.name);
  private readonly coreUrl: string;
  private readonly username: string;
  private readonly password: string;
  private tokenCache: { token: string; expiresAt: number } | null = null;

  constructor(
    private readonly prisma: PrismaService,
    config: ConfigService,
  ) {
    this.coreUrl = config.get<string>('SCORING_SERVICE_URL') || 'http://localhost:8000';
    this.username = config.get<string>('SCORING_SERVICE_USERNAME') || 'recruiter';
    this.password = config.get<string>('SCORING_SERVICE_PASSWORD') || 'recruiter123';
  }

  private async getToken(): Promise<string> {
    // Verificar si hay token en caché y no ha expirado
    if (this.tokenCache && this.tokenCache.expiresAt > Date.now()) {
      return this.tokenCache.token;
    }

    // Autenticar con username/password
    try {
      const response = await axios.post(`${this.coreUrl}/auth/login`, {
        username: this.username,
        password: this.password,
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        timeout: 120000,
      });

      // Cachear token (asumiendo 1 hora de expiración, ajustar según el servicio)
      this.tokenCache = {
        token: response.data.access_token || response.data.token,
        expiresAt: Date.now() + 3600000, // 1 hora
      };

      return this.tokenCache.token;
    } catch (error) {
      this.logger.error('Error authenticating with interview guide service', (error as any).response?.data || (error as any).message);
      throw new HttpException(
        'No se pudo autenticar con el servicio de análisis',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
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
    const isOwner = campaign.userId === userId || user.role === 'ADMIN';
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

    try {
      const token = await this.getToken();
      const response = await axios.post(`${this.coreUrl}/interview/questions`, payload, {
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        timeout: 120000,
      });

      const guide = response.data as { questions: GuideQuestion[] };
      await this.prisma.stageInstance.update({
        where: { id: stageInstanceId },
        data: { guideJson: guide as any },
      });

      return guide;
    } catch (error) {
      // Manejar errores específicos
      if ((error as any).code === 'ECONNRESET') {
        this.logger.error(`Connection reset by scoring service for process ${processInstanceId} stage ${stageInstanceId}`);
        throw new HttpException(
          'El servicio de análisis no está disponible. Inténtelo de nuevo en unos minutos.',
          HttpStatus.SERVICE_UNAVAILABLE,
        );
      }

      if ((error as any).code === 'ETIMEDOUT' || (error as any).code === 'ECONNABORTED') {
        this.logger.error(`Timeout calling scoring service for process ${processInstanceId} stage ${stageInstanceId}`);
        throw new HttpException(
          'La generación de la guía está tardando demasiado. Inténtelo de nuevo.',
          HttpStatus.REQUEST_TIMEOUT,
        );
      }

      if ((error as any).response) {
        this.logger.error(`Interview guide service error for process ${processInstanceId} stage ${stageInstanceId}:`, (error as any).response.data);
        throw new HttpException(
          (error as any).response.data?.detail || 'Error del servicio de análisis',
          (error as any).response.status || HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      this.logger.error(`Unexpected error generating interview guide for process ${processInstanceId} stage ${stageInstanceId}`, error);
      throw new HttpException(
        'No se pudo generar la guía de entrevista',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
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