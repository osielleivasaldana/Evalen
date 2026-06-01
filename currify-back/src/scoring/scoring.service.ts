import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import axios from 'axios';

@Injectable()
export class ScoringService {
  private readonly logger = new Logger(ScoringService.name);
  private readonly scoringServiceUrl: string;
  private readonly username: string;
  private readonly password: string;
  private readonly apiKey: string;
  private tokenCache: { token: string; expiresAt: number } | null = null;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    this.scoringServiceUrl = this.configService.get<string>('SCORING_SERVICE_URL') || 'http://localhost:8000';
    this.username = this.configService.get<string>('SCORING_SERVICE_USERNAME') || '';
    this.password = this.configService.get<string>('SCORING_SERVICE_PASSWORD') || '';
    this.apiKey = this.configService.get<string>('SCORING_SERVICE_API_KEY') || '';
  }

  /**
   * Obtiene un token JWT del servicio de scoring
   * Usa caché para evitar múltiples llamadas de autenticación
   */
  private async getToken(): Promise<string> {
    // Si hay API key configurada, usarla directamente
    if (this.apiKey) {
      return this.apiKey;
    }

    // Verificar si hay token en caché y no ha expirado
    if (this.tokenCache && this.tokenCache.expiresAt > Date.now()) {
      return this.tokenCache.token;
    }

    // Autenticar con username/password
    try {
      this.logger.log(`Attempting to authenticate with scoring service at ${this.scoringServiceUrl}/auth/login`);

      const response = await axios.post(`${this.scoringServiceUrl}/auth/login`, {
        username: this.username,
        password: this.password,
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      });

      this.logger.log('Authentication successful');

      // Cachear token (asumiendo 1 hora de expiración, ajustar según el servicio)
      this.tokenCache = {
        token: response.data.access_token || response.data.token,
        expiresAt: Date.now() + 3600000, // 1 hora
      };

      return this.tokenCache.token;
    } catch (error) {
      this.logger.error('Error authenticating with scoring service', error.response?.data || error.message);
      throw new HttpException(
        `Failed to authenticate with scoring service: ${error.response?.data?.detail || error.message}`,
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  /**
   * Parsea la descripción del trabajo usando LLM
   * Cachea el resultado en la campaña para evitar reprocesamiento
   */
  async parseJobDescription(campaignId: string): Promise<any> {
    try {
      // Verificar si ya existe parsed data en la campaña
      const campaign = await this.prisma.campaign.findUnique({
        where: { id: campaignId },
        select: {
          id: true,
          parsedJobData: true,
          parsedJobDataAt: true,
          description: true,
          requirements: true,
          conditions: true,
          updatedAt: true,
          userId: true,
          user: {
            select: {
              company: true,
            },
          },
        },
      });

      if (!campaign) {
        throw new HttpException('Campaign not found', HttpStatus.NOT_FOUND);
      }

      // Si existe parsedJobData y fue generado después de la última actualización de la campaña, retornarlo
      if (
        campaign.parsedJobData &&
        campaign.parsedJobDataAt &&
        campaign.parsedJobDataAt >= campaign.updatedAt
      ) {
        this.logger.log(`Using cached parsed job data for campaign ${campaignId}`);
        return campaign.parsedJobData;
      }

      // Parsear descripción con el servicio LLM
      const token = await this.getToken();

      const response = await axios.post(`${this.scoringServiceUrl}/scoring/parse-job`, {
        description: campaign.description || '',
        requirements: `${campaign.requirements || ''}\n${campaign.conditions || ''}`.trim(),
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      const parsedData = response.data;

      const promptTokens = parseInt(response.headers['x-llm-prompt-tokens'] || response.headers['X-LLM-Prompt-Tokens'] || '0', 10);
      const completionTokens = parseInt(response.headers['x-llm-completion-tokens'] || response.headers['X-LLM-Completion-Tokens'] || '0', 10);
      const model = response.headers['x-llm-model'] || response.headers['X-LLM-Model'] || 'unknown';

      if (promptTokens > 0 || completionTokens > 0) {
        await this.prisma.llmUsageLog.create({
          data: {
            userId: campaign.userId,
            company: campaign.user?.company || null,
            action: 'JOB_PARSING',
            model: model,
            promptTokens: promptTokens,
            completionTokens: completionTokens,
            totalTokens: promptTokens + completionTokens,
            costUsd: (promptTokens + completionTokens) * 0.00001,
          },
        }).catch((err: any) => this.logger.error('Error logging LLM usage for job parsing', err));
      }

      // Guardar parsed data en la campaña
      await this.prisma.campaign.update({
        where: { id: campaignId },
        data: {
          parsedJobData: parsedData,
          parsedJobDataAt: new Date(),
        },
      });

      this.logger.log(`Parsed job data for campaign ${campaignId}`);
      return parsedData;
    } catch (error) {
      this.logger.error(`Error parsing job description for campaign ${campaignId}`, error.response?.data || error.message);
      throw new HttpException(
        'Failed to parse job description',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  /**
   * Combina datos parseados con metadata de la campaña
   */
  private async combineJobData(campaignId: string, parsedJobData: any): Promise<any> {
    const campaign = await this.prisma.campaign.findUnique({
      where: { id: campaignId },
      include: {
        user: {
          select: {
            company: true,
          },
        },
      },
    });

    if (!campaign) {
      throw new HttpException('Campaign not found', HttpStatus.NOT_FOUND);
    }

    // Mapear los campos de la campaña al formato esperado por el scoring service
    const workTypeMap = {
      FULL_TIME: 'Tiempo Completo',
      PART_TIME: 'Medio Tiempo',
      INTERNSHIP: 'Práctica',
    };

    const modalityMap = {
      REMOTE: 'Remoto',
      HYBRID: 'Híbrido',
      ON_SITE: 'Presencial',
    };

    const durationMap = {
      INDEFINITE: 'Indefinido',
      FIXED_TERM: 'Plazo Fijo',
      PROJECT: 'Por Proyecto',
    };

    // Mapear datos parseados de FastAPI al formato esperado por el scoring
    return {
      titulo: campaign.title,
      empresa: campaign.user?.company || 'No especificada',
      ubicacion: campaign.location || null,
      tipo: campaign.workType ? workTypeMap[campaign.workType] : 'Tiempo completo',
      descripcion: campaign.description || '',
      requisitos: parsedJobData.requisitos || {
        experiencia_años: 'No especificado',
        habilidades_requeridas: [],
        habilidades_blandas: [],
        educacion: 'No especificado',
        idiomas: []
      },
      habilidades_deseables: parsedJobData.habilidades_deseables || [],
      salario: parsedJobData.salario || (campaign.showSalary && campaign.salary
        ? `${campaign.salary} ${campaign.currency}`
        : 'No especificado'),
      beneficios: parsedJobData.beneficios || []
    };
  }

  /**
   * Evalúa un candidato contra una campaña y guarda el score
   */
  async evaluateCandidate(candidateId: string): Promise<any> {
    try {
      // Obtener candidato con su CV estructurado y detalles del usuario/compañía
      const candidate = await this.prisma.candidate.findUnique({
        where: { id: candidateId },
        include: {
          campaign: {
            include: {
              user: {
                select: {
                  company: true,
                },
              },
            },
          },
          scoring: true,
        },
      });

      if (!candidate) {
        throw new HttpException('Candidate not found', HttpStatus.NOT_FOUND);
      }

      if (!candidate.structuredData) {
        throw new HttpException(
          'Candidate data not extracted yet',
          HttpStatus.BAD_REQUEST,
        );
      }

      // Si ya existe scoring y está CURRENT, retornarlo (no recalcular)
      if (candidate.scoring && candidate.scoringStatus === 'CURRENT') {
        this.logger.log(`Returning existing score for candidate ${candidateId}`);
        return candidate.scoring;
      }

      // Si está OUTDATED, limpiar scoring anterior y continuar con rescore
      if (candidate.scoringStatus === 'OUTDATED') {
        this.logger.log(`Candidate ${candidateId} is OUTDATED, rescoring...`);
        await this.prisma.candidateScoring.deleteMany({
          where: { candidateId },
        });
        await this.prisma.candidate.update({
          where: { id: candidateId },
          data: { scoringStatus: 'PENDING' },
        });
      }

      // Parsear job description (con caché)
      const parsedJobData = await this.parseJobDescription(candidate.campaignId);

      // Combinar con metadata de campaña
      const completeJobData = await this.combineJobData(candidate.campaignId, parsedJobData);

      // Llamar al servicio de scoring
      const token = await this.getToken();

      this.logger.debug(`Calling scoring service for candidate ${candidateId}`);
      this.logger.debug(`Payload size: ${JSON.stringify({ candidate: candidate.structuredData, job: completeJobData }).length} bytes`);

      const response = await axios.post(`${this.scoringServiceUrl}/scoring/evaluate`, {
        candidate: candidate.structuredData,
        job: completeJobData,
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        timeout: 120000, // 2 minutes timeout
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
      });

      this.logger.debug(`Scoring service responded for candidate ${candidateId}`);
      const scoringResult = response.data;

      const promptTokens = parseInt(response.headers['x-llm-prompt-tokens'] || response.headers['X-LLM-Prompt-Tokens'] || '0', 10);
      const completionTokens = parseInt(response.headers['x-llm-completion-tokens'] || response.headers['X-LLM-Completion-Tokens'] || '0', 10);
      const model = response.headers['x-llm-model'] || response.headers['X-LLM-Model'] || 'unknown';

      if (promptTokens > 0 || completionTokens > 0) {
        await this.prisma.llmUsageLog.create({
          data: {
            userId: candidate.campaign.userId,
            company: candidate.campaign.user?.company || null,
            action: 'CANDIDATE_EVALUATION',
            model: model,
            promptTokens: promptTokens,
            completionTokens: completionTokens,
            totalTokens: promptTokens + completionTokens,
            costUsd: (promptTokens + completionTokens) * 0.00001,
          },
        }).catch((err: any) => this.logger.error('Error logging LLM usage for candidate evaluation', err));
      }

      // Guardar scoring en la base de datos
      const savedScoring = await this.prisma.candidateScoring.create({
        data: {
          candidateId: candidateId,
          overallScore: scoringResult.overall_score,
          recommendation: scoringResult.recommendation,
          breakdown: scoringResult.breakdown || {},
          strengths: scoringResult.strengths || [],
          gaps: scoringResult.gaps || [],
          summary: scoringResult.summary || null,
        },
      });

      // Marcar scoring como CURRENT después de evaluación exitosa
      await this.prisma.candidate.update({
        where: { id: candidateId },
        data: { scoringStatus: 'CURRENT' },
      });

      this.logger.log(`Scoring saved for candidate ${candidateId}: ${scoringResult.overall_score}`);
      return savedScoring;
    } catch (error) {
      // Manejar errores específicos
      if (error.code === 'ECONNRESET') {
        this.logger.error(`Connection reset by scoring service for candidate ${candidateId}. The service may be overloaded or the request too large.`);
        throw new HttpException(
          'Scoring service connection error. The service may be processing too many requests or the data is too large.',
          HttpStatus.SERVICE_UNAVAILABLE,
        );
      }

      if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
        this.logger.error(`Timeout calling scoring service for candidate ${candidateId}`);
        throw new HttpException(
          'Scoring service timeout. The evaluation is taking too long.',
          HttpStatus.REQUEST_TIMEOUT,
        );
      }

      if (error.response) {
        this.logger.error(`Scoring service error for candidate ${candidateId}:`, error.response.data);
        throw new HttpException(
          `Scoring service error: ${error.response.data?.detail || error.message}`,
          error.response.status || HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      this.logger.error(`Unexpected error evaluating candidate ${candidateId}`, error);
      throw error;
    }
  }

  /**
   * Re-evalúa un candidato (usado cuando se reprocesa un CV)
   * Consume 1 crédito CV si el rescore es exitoso
   */
  async reevaluateCandidate(candidateId: string, userId: string): Promise<any> {
    // Verificar créditos del usuario ANTES de rescorear
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { cvCredits: true },
    });

    if (!user) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }

    if (user.cvCredits <= 0) {
      throw new HttpException(
        'Créditos insuficientes para reevaluar candidato. Adquiere más créditos para continuar.',
        HttpStatus.PAYMENT_REQUIRED,
      );
    }

    try {
      // Eliminar scoring existente si existe
      await this.prisma.candidateScoring.deleteMany({
        where: { candidateId },
      });

      // Evaluar de nuevo
      const result = await this.evaluateCandidate(candidateId);

      // Solo descontar crédito si el rescore fue EXITOSO
      await this.prisma.user.update({
        where: { id: userId },
        data: { cvCredits: { decrement: 1 } },
      });

      this.logger.log(`Consumed 1 CV credit for user ${userId} rescoring candidate ${candidateId}`);

      return result;
    } catch (error) {
      // Si falla, NO descontar crédito
      this.logger.error(`Error re-evaluating candidate ${candidateId}`, error);
      throw error;
    }
  }

  /**
   * Re-evalúa todos los candidatos OUTDATED de una campaña
   * Máximo 100 candidatos por operación. Consume 1 crédito CV por cada rescore exitoso.
   */
  async rescoreCampaign(campaignId: string, userId: string) {
    const MAX_RESCORE = 100;

    const candidates = await this.prisma.candidate.findMany({
      where: {
        campaignId,
        scoringStatus: 'OUTDATED',
        processingStatus: 'COMPLETED',
      },
      select: { id: true },
    });

    if (candidates.length === 0) {
      this.logger.log(`No outdated candidates to rescore for campaign ${campaignId}`);
      return { total: 0, started: 0, limited: false };
    }

    // Limitar a MAX_RESCORE candidatos
    let limited = false;
    let candidatesToProcess = candidates;
    if (candidates.length > MAX_RESCORE) {
      candidatesToProcess = candidates.slice(0, MAX_RESCORE);
      limited = true;
      this.logger.log(
        `Rescore limitado a 100 candidatos para campaign ${campaignId}. ${candidates.length - MAX_RESCORE} candidatos quedaron sin reevaluar.`,
      );
    }

    this.logger.log(`Rescoring ${candidatesToProcess.length} candidates for campaign ${campaignId}`);

    // Rescore asíncrono con semáforo (máx 3 concurrentes)
    let active = 0;
    let index = 0;
    const results: PromiseSettledResult<any>[] = [];

    return new Promise<{ total: number; started: number; limited: boolean }>((resolve) => {
      const startNext = async () => {
        if (index >= candidatesToProcess.length && active === 0) {
          resolve({ total: candidates.length, started: candidatesToProcess.length, limited });
          return;
        }

        while (active < 3 && index < candidatesToProcess.length) {
          const candidate = candidatesToProcess[index++];
          active++;
          this.reevaluateCandidate(candidate.id, userId)
            .then((r) => { results.push({ status: 'fulfilled', value: r }); })
            .catch((e) => {
              // Si un rescore individual falla (ej. créditos insuficientes), continuar con los demás
              results.push({ status: 'rejected', reason: e });
            })
            .finally(() => {
              active--;
              startNext();
            });
        }
      };

      startNext();
    });
  }
}
