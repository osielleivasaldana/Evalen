import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { UpdateCampaignDto } from './dto/update-campaign.dto';
import { CampaignStatus } from '@prisma/client';

@Injectable()
export class CampaignsService {
  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
  ) {}

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

  async findAll(userId: string) {
    return this.prisma.campaign.findMany({
      where: {
        OR: [
          { userId }, // Campaigns created by the user
          { stageTemplates: { some: { responsibleId: userId } } } // Campaigns where user is assigned as responsible
        ]
      },
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
      }
    });

    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    if (campaign.status !== CampaignStatus.ACTIVE) {
      throw new ForbiddenException('Campaign is not active');
    }

    return campaign;
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

    // Prevent editing campaigns that already have candidates (scoring integrity)
    if (campaign._count.candidates > 0) {
      throw new ForbiddenException(
        'Cannot edit campaign that already has candidates. This would invalidate existing scores.'
      );
    }

    return this.prisma.campaign.update({
      where: { id },
      data: updateCampaignDto,
      include: {
        _count: {
          select: { candidates: true }
        }
      }
    });
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

  async getStats(userId: string) {
    // Get campaigns where user is creator OR assigned as responsible
    const campaignsWhereClause = {
      OR: [
        { userId }, // Campaigns created by user
        { stageTemplates: { some: { responsibleId: userId } } } // Campaigns where user is assigned
      ]
    };

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
}