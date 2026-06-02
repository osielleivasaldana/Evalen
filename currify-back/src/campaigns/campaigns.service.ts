import { Injectable, NotFoundException, ForbiddenException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { ConfigService } from '@nestjs/config';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { UpdateCampaignDto } from './dto/update-campaign.dto';
import { SmartFillDto } from './dto/smart-fill.dto';
import { CampaignStatus, Prisma } from '@prisma/client';
import { ScoringService } from '../scoring/scoring.service';
import axios from 'axios';

@Injectable()
export class CampaignsService {
  private readonly logger = new Logger(CampaignsService.name);
  private readonly coreServiceUrl: string;
  private tokenCache: string | null = null;
  private tokenExpiry: number = 0;

  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
    private configService: ConfigService,
    private scoringService: ScoringService,
  ) { 
    this.coreServiceUrl = this.configService.get<string>('SCORING_SERVICE_URL') || 'http://currify-core:8000';
  }

  async create(userId: string, createCampaignDto: CreateCampaignDto) {
    const { stageTemplates, ...campaignData } = createCampaignDto;

    // Validar que haya al menos una etapa
    if (!stageTemplates || stageTemplates.length === 0) {
      throw new BadRequestException('At least one stage template is required');
    }

    // Validar que exista etapa "Contactar" o agregarla automáticamente
    const hasContactStage = stageTemplates.some(
      stage => stage.name.toLowerCase() === 'contactar'
    );

    let finalStages = [...stageTemplates];
    if (!hasContactStage) {
      // Agregar etapa "Contactar" al inicio
      finalStages.unshift({
        name: 'Contactar',
        description: 'Contacto inicial con candidato para coordinar y validar interés',
        responsibleId: userId,
        order: 1
      });

      // Reordenar las demás etapas
      finalStages = finalStages.map((stage, index) => ({
        ...stage,
        order: index + 1
      }));
    }

    // Check user's campaign limit
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        campaignLimit: true,
        plan: true
      }
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const activeCampaigns = await this.prisma.campaign.count({
      where: {
        userId,
        status: CampaignStatus.ACTIVE
      }
    });

    if (activeCampaigns >= user.campaignLimit) {
      throw new ForbiddenException(
        `Has alcanzado el límite de campañas activas para tu plan ${user.plan}. Mejora a PRO para crear campañas ilimitadas.`
      );
    }

    const campaign = await this.prisma.campaign.create({
      data: {
        ...campaignData,
        userId,
        stageTemplates: {
          create: finalStages.map(({ responsibleId, ...stageData }) => ({
            ...stageData,
            responsibleId
          }))
        }
      },
      include: {
        stageTemplates: {
          include: {
            responsible: {
              select: { id: true, name: true, email: true }
            }
          },
          orderBy: { order: 'asc' }
        },
        _count: {
          select: { candidates: true }
        }
      }
    });

    // Enviar emails de notificación a los usuarios asignados
    const uniqueResponsibles = new Map<string, { name: string; email: string }>();

    campaign.stageTemplates.forEach(stage => {
      if (stage.responsible && stage.responsible.id !== userId) {
        uniqueResponsibles.set(stage.responsible.id, {
          name: stage.responsible.name,
          email: stage.responsible.email
        });
      }
    });

    // Enviar emails en paralelo sin bloquear la respuesta
    Promise.all(
      Array.from(uniqueResponsibles.values()).map(async (responsible) => {
        try {
          await this.emailService.sendCampaignAssignmentEmail(
            responsible.email,
            responsible.name,
            campaign.title,
            campaign.id
          );
          console.log(`[CAMPAIGNS] Assignment email sent to ${responsible.email} for campaign ${campaign.title}`);
        } catch (error) {
          console.error(`[CAMPAIGNS] Failed to send assignment email to ${responsible.email}:`, error);
        }
      })
    ).catch(err => console.error('[CAMPAIGNS] Error sending assignment emails:', err));

    return campaign;
  }

  async findAll(userId: string, userCompany?: string) {
    const whereClause: any = {
      OR: [
        { userId }, // Campaigns created by the user
        { stageTemplates: { some: { responsibleId: userId } } } // Campaigns where user is assigned as responsible
      ]
    };

    // If user belongs to a company, allow seeing all campaigns from that company
    if (userCompany) {
      whereClause.OR.push({
        user: {
          company: userCompany
        }
      });
    }

    return this.prisma.campaign.findMany({
      where: whereClause,
      include: {
        _count: {
          select: { candidates: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async findOne(id: string, userId: string) {
    const campaign = await this.prisma.campaign.findUnique({
      where: { id },
      include: {
        _count: {
          select: { candidates: true }
        },
        candidates: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            expectedSalary: true,
            processingStatus: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' }
        },
        stageTemplates: {
          include: {
            responsible: {
              select: { id: true, name: true, email: true }
            }
          },
          orderBy: { order: 'asc' }
        }
      }
    });

    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    // Allow access if user is the creator OR assigned as responsible in any stage
    const isCreator = campaign.userId === userId;
    const isResponsible = campaign.stageTemplates.some(
      stage => stage.responsibleId === userId
    );

    if (!isCreator && !isResponsible) {
      throw new ForbiddenException('You do not have access to this campaign');
    }

    return campaign;
  }

  async findByPublicId(publicId: string) {
    const campaign = await this.prisma.campaign.findUnique({
      where: { publicId },
      select: {
        id: true,
        title: true,
        description: true,
        requirements: true,
        conditions: true,
        location: true,
        workType: true,
        modality: true,
        duration: true,
        inclusionPosition: true,
        salary: true,
        currency: true,
        showSalary: true,
        status: true,
        createdAt: true,
        user: {
          select: {
            plan: true,
            cvCredits: true,
          }
        }
      }
    });

    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    if (campaign.status !== CampaignStatus.ACTIVE) {
      throw new ForbiddenException('Campaign is not active');
    }

    // Check if limit is reached (Only for non-PRO users with 0 credits)
    const isLimitReached = campaign.user.plan !== 'PRO' && campaign.user.cvCredits <= 0;

    return {
      ...campaign,
      isLimitReached
    };
  }

  async update(id: string, userId: string, updateCampaignDto: UpdateCampaignDto) {
    const campaign = await this.prisma.campaign.findUnique({
      where: { id },
      include: {
        _count: {
          select: { candidates: true }
        }
      }
    });

    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    if (campaign.userId !== userId) {
      throw new ForbiddenException('You can only update your own campaigns');
    }

    const { stageTemplates, ...campaignData } = updateCampaignDto;
    const hasCandidates = campaign._count.candidates > 0;

    // Si se intentan actualizar las etapas
    if (stageTemplates) {
      // 1. Verificar que no haya procesos de selección activos
      if (hasCandidates) {
        const activeProcesses = await this.prisma.processInstance.count({
          where: { campaignId: id }
        });
        if (activeProcesses > 0) {
          throw new ForbiddenException(
            'Cannot edit campaign stages because candidates are already in a selection process.'
          );
        }
      }

      // 2. Validar que haya al menos una etapa
      if (stageTemplates.length === 0) {
        throw new BadRequestException('At least one stage template is required');
      }

      // 3. Validar/Agregar etapa Contactar (misisma lógica que create)
      const hasContactStage = stageTemplates.some(
        stage => stage.name.toLowerCase() === 'contactar'
      );

      let finalStages = [...stageTemplates];
      if (!hasContactStage) {
        finalStages.unshift({
          name: 'Contactar',
          description: 'Contacto inicial con candidato para coordinar y validar interés',
          responsibleId: userId,
          order: 1
        });

        // Reordenar
        finalStages = finalStages.map((stage, index) => ({
          ...stage,
          order: index + 1
        }));
      }

      // 4. Ejecutar transacción: Borrar etapas viejas -> Crear nuevas -> Actualizar campaña
      const result = await this.prisma.$transaction(async (tx) => {
        // Borrar etapas existentes
        await tx.stageTemplate.deleteMany({
          where: { campaignId: id }
        });

        // Actualizar campaña y crear nuevas etapas
        return tx.campaign.update({
          where: { id },
          data: {
            ...campaignData,
            stageTemplates: {
              create: finalStages.map(({ responsibleId, ...stageData }) => ({
                ...stageData,
                responsibleId
              }))
            }
          },
          include: {
            stageTemplates: {
              include: {
                responsible: {
                  select: { id: true, name: true, email: true }
                }
              },
              orderBy: { order: 'asc' }
            },
            _count: {
              select: { candidates: true }
            }
          }
        });
      });

      // Invalidar scores si había candidatos
      if (hasCandidates) {
        await this.invalidateCandidateScores(id);
      }

      return { ...result, scoringInvalidated: hasCandidates };
    }

    // Si no hay cambios en etapas, actualización normal
    const result = await this.prisma.campaign.update({
      where: { id },
      data: campaignData,
      include: {
        stageTemplates: {
          include: {
            responsible: {
              select: { id: true, name: true, email: true }
            }
          },
          orderBy: { order: 'asc' }
        },
        _count: {
          select: { candidates: true }
        }
      }
    });

    // Invalidar scores si había candidatos
    if (hasCandidates) {
      await this.invalidateCandidateScores(id);
    }

    return { ...result, scoringInvalidated: hasCandidates };
  }

  /**
   * Invalida los scores de todos los candidatos de una campaña
   */
  private async invalidateCandidateScores(campaignId: string) {
    await this.prisma.candidateScoring.deleteMany({
      where: { candidate: { campaignId } },
    });
    await this.prisma.candidate.updateMany({
      where: { campaignId },
      data: { scoringStatus: 'OUTDATED' },
    });

    // Invalidar parsedJobData para que se regenere en el próximo rescore
    await this.prisma.campaign.update({
      where: { id: campaignId },
      data: {
        parsedJobData: Prisma.DbNull,
        parsedJobDataAt: null,
      },
    });

    this.logger.log(`Invalidated scores for all candidates in campaign ${campaignId}`);
  }

  /**
   * Dispara rescore asíncrono de todos los candidatos OUTDATED de una campaña
   */
  async rescoreAll(id: string, userId: string) {
    const campaign = await this.prisma.campaign.findUnique({
      where: { id },
      select: { userId: true },
    });

    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    if (campaign.userId !== userId) {
      throw new ForbiddenException('You can only rescore your own campaigns');
    }

    // Disparar rescore asíncrono en background (pasa userId para control de créditos)
    this.scoringService.rescoreCampaign(id, userId).catch(err =>
      this.logger.error(`rescoreAll failed for campaign ${id}:`, err)
    );

    return { message: 'Rescore iniciado', campaignId: id };
  }

  async remove(id: string, userId: string) {
    const campaign = await this.prisma.campaign.findUnique({
      where: { id },
    });

    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    if (campaign.userId !== userId) {
      throw new ForbiddenException('You can only delete your own campaigns');
    }

    return this.prisma.campaign.delete({
      where: { id },
    });
  }

  /**
   * Obtiene el estado del rescore de una campaña (conteo por scoringStatus)
   */
  async getRescoreStatus(id: string, userId: string) {
    const campaign = await this.prisma.campaign.findUnique({
      where: { id },
      select: { userId: true },
    });

    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    if (campaign.userId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    const counts = await this.prisma.candidate.groupBy({
      by: ['scoringStatus'],
      where: { campaignId: id },
      _count: { id: true },
    });

    const result: {
      total: number;
      current: number;
      outdated: number;
      pending: number;
    } = {
      total: 0,
      current: 0,
      outdated: 0,
      pending: 0,
    };

    for (const c of counts) {
      const key = c.scoringStatus.toLowerCase() as keyof typeof result;
      if (key in result) {
        result[key] = c._count.id;
        result.total += c._count.id;
      }
    }

    return result;
  }

  // Helper function to check if user has access to a campaign (creator or assigned as responsible)
  private async checkCampaignAccess(campaignId: string, userId: string): Promise<boolean> {
    const campaign = await this.prisma.campaign.findUnique({
      where: { id: campaignId },
      include: {
        stageTemplates: {
          select: { responsibleId: true }
        }
      }
    });

    if (!campaign) {
      return false;
    }

    const isCreator = campaign.userId === userId;
    const isResponsible = campaign.stageTemplates.some(
      stage => stage.responsibleId === userId
    );

    return isCreator || isResponsible;
  }

  async getStats(userId: string, userCompany?: string) {
    // Get campaigns where user is creator OR assigned as responsible OR belongs to same company
    const campaignsWhereClause: any = {
      OR: [
        { userId }, // Campaigns created by user
        { stageTemplates: { some: { responsibleId: userId } } } // Campaigns where user is assigned
      ]
    };

    if (userCompany) {
      campaignsWhereClause.OR.push({
        user: {
          company: userCompany
        }
      });
    }

    const [totalCampaigns, activeCampaigns, totalCandidates] = await Promise.all([
      this.prisma.campaign.count({ where: campaignsWhereClause }),
      this.prisma.campaign.count({
        where: {
          ...campaignsWhereClause,
          status: CampaignStatus.ACTIVE
        }
      }),
      this.prisma.candidate.count({
        where: {
          campaign: campaignsWhereClause
        }
      })
    ]);

    return {
      totalCampaigns,
      activeCampaigns,
      totalCandidates,
    };
  }

  async getStageTemplates(campaignId: string, userId: string) {
    const campaign = await this.prisma.campaign.findUnique({
      where: { id: campaignId },
      include: {
        stageTemplates: {
          include: {
            responsible: {
              select: { id: true, name: true, email: true }
            }
          },
          orderBy: { order: 'asc' }
        }
      }
    });

    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    // Check if user is creator or assigned as responsible
    const hasAccess = await this.checkCampaignAccess(campaignId, userId);
    if (!hasAccess) {
      throw new ForbiddenException('You do not have access to this campaign');
    }

    return campaign.stageTemplates;
  }

  private async getCoreServiceToken(): Promise<string> {
    const now = Date.now();
    if (this.tokenCache && now < this.tokenExpiry) {
      return this.tokenCache;
    }

    try {
      const response = await axios.post(`${this.coreServiceUrl}/auth/login`, {
        username: this.configService.get<string>('SCORING_SERVICE_USERNAME') || 'kinich',
        password: this.configService.get<string>('SCORING_SERVICE_PASSWORD') || 'kinich!'
      }, {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });

      const token = response.data.access_token as string;
      this.tokenCache = token;
      this.tokenExpiry = now + (50 * 60 * 1000); // 50 mins
      return token;
    } catch (error) {
      console.error('Error getting token from core service:', error);
      throw new Error('Failed to authenticate with core service');
    }
  }

  async generateDraft(userId: string, smartFillDto: SmartFillDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { smartFillCredits: true, plan: true }
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.smartFillCredits <= 0 && user.plan !== 'PRO') {
      throw new ForbiddenException('Has usado todos tus créditos de Smart Fill. Mejora a PRO para uso ilimitado o recarga tu saldo.');
    }

    try {
      const token = await this.getCoreServiceToken();

      const response = await axios.post(
        `${this.coreServiceUrl}/api/smart-fill`,
        smartFillDto,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          timeout: 60000 // 60s
        }
      );

      // Decrement credit if not PRO
      if (user.plan !== 'PRO') {
        await this.prisma.user.update({
          where: { id: userId },
          data: { smartFillCredits: { decrement: 1 } }
        });
      }

      return response.data;
    } catch (error) {
      console.error('[SMART_FILL] Error connecting to core service:', error?.response?.data || error.message);
      throw new BadRequestException('Failed to generate draft via AI');
    }
  }
}