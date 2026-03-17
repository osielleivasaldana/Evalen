import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { EmailService } from '../email/email.service';
import { StartProcessDto } from './dto/start-process.dto';
import { UpdateStageDto } from './dto/update-stage.dto';

@Injectable()
export class ProcessesService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
    private notificationsService: NotificationsService,
    private emailService: EmailService,
  ) { }

  async startProcess(userId: string, dto: StartProcessDto) {
    const { campaignId, candidateId, responsibleId, startDate, notifyCandidate } = dto;

    // 1. Validar que la campaña tenga stage templates
    const campaign = await this.prisma.campaign.findUnique({
      where: { id: campaignId },
      include: {
        stageTemplates: {
          orderBy: { order: 'asc' }
        }
      }
    });

    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    if (campaign.userId !== userId) {
      throw new ForbiddenException('You can only start processes in your own campaigns');
    }

    if (!campaign.stageTemplates || campaign.stageTemplates.length === 0) {
      throw new BadRequestException('Campaign has no stage templates. Please configure stages first.');
    }

    // 2. Validar que el candidato exista y pertenezca a la campaña
    const candidate = await this.prisma.candidate.findUnique({
      where: { id: candidateId }
    });

    if (!candidate) {
      throw new NotFoundException('Candidate not found');
    }

    if (candidate.campaignId !== campaignId) {
      throw new BadRequestException('Candidate does not belong to this campaign');
    }

    // 3. Validar que el candidato no tenga proceso activo
    const existingProcess = await this.prisma.processInstance.findUnique({
      where: {
        campaignId_candidateId: { campaignId, candidateId }
      }
    });

    if (existingProcess) {
      throw new BadRequestException('Candidate already has a process in this campaign');
    }

    // 4. Crear ProcessInstance con todas sus StageInstances
    const processInstance = await this.prisma.processInstance.create({
      data: {
        campaignId,
        candidateId,
        startDate: startDate ? new Date(startDate) : new Date(),
        currentStageOrder: 1,
        stageInstances: {
          create: campaign.stageTemplates.map((template, index) => ({
            stageTemplateId: template.id,
            responsibleId: responsibleId || template.responsibleId,
            status: index === 0 ? 'ACTIVE' : 'PENDING', // Primera etapa activa
          }))
        }
      },
      include: {
        campaign: true,
        candidate: true,
        stageInstances: {
          include: {
            stageTemplate: true,
            responsible: {
              select: { id: true, name: true, email: true }
            }
          },
          orderBy: {
            stageTemplate: { order: 'asc' }
          }
        }
      }
    });

    // 5. Actualizar candidateStatus a IN_PROCESS
    await this.prisma.candidate.update({
      where: { id: candidateId },
      data: { candidateStatus: 'IN_PROCESS' }
    });

    // 6. Crear audit log
    await this.auditService.log({
      userId,
      action: 'PROCESS_STARTED',
      entityType: 'ProcessInstance',
      entityId: processInstance.id,
      processInstanceId: processInstance.id,
      metadata: { campaignId, candidateId, candidateName: candidate.name }
    });

    // 7. Notificar responsable de primera etapa
    const firstStage = processInstance.stageInstances[0];
    await this.notificationsService.create({
      userId: firstStage.responsibleId,
      type: 'STAGE_ASSIGNED',
      title: 'Nueva etapa asignada',
      message: `Se te ha asignado la etapa "${firstStage.stageTemplate.name}" para el candidato ${candidate.name}`,
      metadata: {
        processInstanceId: processInstance.id,
        stageInstanceId: firstStage.id,
        campaignId,
        candidateId
      }
    });

    // 8. Notificar candidato
    if (notifyCandidate && candidate.email) {
      this.emailService.sendProcessStartedEmail(
        candidate.email,
        candidate.name || 'Candidato',
        campaign.title,
        firstStage.stageTemplate.name
      );
    }

    return processInstance;
  }

  async updateStageDecision(stageInstanceId: string, userId: string, dto: UpdateStageDto) {
    const { decision, feedback } = dto;

    // 1. Obtener la stage instance con toda la información necesaria
    const stageInstance = await this.prisma.stageInstance.findUnique({
      where: { id: stageInstanceId },
      include: {
        processInstance: {
          include: {
            campaign: {
              include: {
                stageTemplates: { orderBy: { order: 'asc' } }
              }
            },
            candidate: true,
            stageInstances: {
              include: { stageTemplate: true },
              orderBy: { stageTemplate: { order: 'asc' } }
            }
          }
        },
        stageTemplate: true,
        responsible: true
      }
    });

    if (!stageInstance) {
      throw new NotFoundException('Stage instance not found');
    }

    // 2. Validar permisos: solo el responsable o admin
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (stageInstance.responsibleId !== userId && user.role !== 'ADMIN') {
      throw new ForbiddenException('Only assigned responsible or admin can update this stage');
    }

    // 3. Validar que la etapa esté ACTIVE
    if (stageInstance.status !== 'ACTIVE') {
      throw new BadRequestException('Can only update ACTIVE stages');
    }

    // 4. Validar feedback obligatorio en REJECTED
    if (decision === 'REJECTED' && !feedback?.trim()) {
      throw new BadRequestException('Feedback is required when rejecting a stage');
    }

    // 5. Actualizar la stage instance
    const updatedStage = await this.prisma.stageInstance.update({
      where: { id: stageInstanceId },
      data: {
        status: decision === 'ACCEPTED' ? 'ACCEPTED' : 'REJECTED',
        decision: decision,
        feedback: feedback,
        decidedAt: new Date()
      }
    });

    // 6. Crear audit log
    await this.auditService.log({
      userId,
      action: decision === 'ACCEPTED' ? 'STAGE_ACCEPTED' : 'STAGE_REJECTED',
      entityType: 'StageInstance',
      entityId: stageInstanceId,
      stageInstanceId,
      processInstanceId: stageInstance.processInstanceId,
      metadata: {
        feedback,
        stageName: stageInstance.stageTemplate.name,
        candidateName: stageInstance.processInstance.candidate.name
      }
    });

    // 7. Lógica según decisión
    if (decision === 'ACCEPTED') {
      await this.handleStageAccepted(stageInstance, userId);
    } else {
      await this.handleStageRejected(stageInstance, userId);
    }

    return updatedStage;
  }

  private async handleStageAccepted(stageInstance: any, userId: string) {
    const allStages = stageInstance.processInstance.stageInstances;
    const currentIndex = allStages.findIndex((s: any) => s.id === stageInstance.id);
    const nextStage = allStages[currentIndex + 1];

    if (nextStage) {
      // Activar siguiente etapa
      await this.prisma.stageInstance.update({
        where: { id: nextStage.id },
        data: { status: 'ACTIVE' }
      });

      // Actualizar currentStageOrder en ProcessInstance
      await this.prisma.processInstance.update({
        where: { id: stageInstance.processInstanceId },
        data: {
          currentStageOrder: nextStage.stageTemplate.order
        }
      });

      // Notificar responsable de siguiente etapa
      await this.notificationsService.create({
        userId: nextStage.responsibleId,
        type: 'STAGE_ASSIGNED',
        title: 'Nueva etapa asignada',
        message: `Se te ha asignado la etapa "${nextStage.stageTemplate.name}" para el candidato ${stageInstance.processInstance.candidate.name}`,
        metadata: {
          processInstanceId: stageInstance.processInstanceId,
          stageInstanceId: nextStage.id,
          campaignId: stageInstance.processInstance.campaignId,
          candidateId: stageInstance.processInstance.candidateId
        }
      });

      // Notificar candidato de avance
      if (stageInstance.processInstance.candidate.email) {
        this.emailService.sendStageAdvancedEmail(
          stageInstance.processInstance.candidate.email,
          stageInstance.processInstance.candidate.name || 'Candidato',
          stageInstance.processInstance.campaign.title,
          nextStage.stageTemplate.name
        );
      }
    } else {
      // Es la última etapa -> CANDIDATO SELECCIONADO
      await this.handleCandidateSelected(stageInstance, userId);
    }
  }

  private async handleStageRejected(stageInstance: any, userId: string) {
    // 1. Marcar candidato como NOT_SELECTED
    await this.prisma.candidate.update({
      where: { id: stageInstance.processInstance.candidateId },
      data: { candidateStatus: 'NOT_SELECTED' }
    });

    // 2. Marcar proceso como finalizado
    await this.prisma.processInstance.update({
      where: { id: stageInstance.processInstanceId },
      data: { endDate: new Date() }
    });

    // 3. Notificar al reclutador (dueño de la campaña)
    await this.notificationsService.create({
      userId: stageInstance.processInstance.campaign.userId,
      type: 'CANDIDATE_NOT_SELECTED',
      title: 'Candidato no seleccionado',
      message: `El candidato ${stageInstance.processInstance.candidate.name} fue rechazado en la etapa "${stageInstance.stageTemplate.name}"`,
      metadata: {
        processInstanceId: stageInstance.processInstanceId,
        candidateId: stageInstance.processInstance.candidateId,
        campaignId: stageInstance.processInstance.campaignId,
        stageName: stageInstance.stageTemplate.name
      }
    });

    // Notificar candidato de rechazo
    if (stageInstance.processInstance.candidate.email) {
      this.emailService.sendCandidateRejectedEmail(
        stageInstance.processInstance.candidate.email,
        stageInstance.processInstance.candidate.name || 'Candidato',
        stageInstance.processInstance.campaign.title
      );
    }
  }

  private async handleCandidateSelected(stageInstance: any, userId: string) {
    const candidateId = stageInstance.processInstance.candidateId;

    // 1. Validar que no esté seleccionado en otra campaña
    const existingSelection = await this.prisma.candidate.findFirst({
      where: {
        id: candidateId,
        candidateStatus: 'SELECTED',
        NOT: {
          campaignId: stageInstance.processInstance.campaignId
        }
      },
      include: { campaign: true }
    });

    if (existingSelection) {
      // Requiere override de admin
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      if (user && user.role !== 'ADMIN') {
        throw new BadRequestException(
          `Candidate is already selected in campaign "${existingSelection.campaign.title}". Only admin can override.`
        );
      }
    }

    // 2. Marcar candidato como SELECTED
    await this.prisma.candidate.update({
      where: { id: candidateId },
      data: { candidateStatus: 'SELECTED' }
    });

    // 3. Marcar proceso como finalizado
    await this.prisma.processInstance.update({
      where: { id: stageInstance.processInstanceId },
      data: { endDate: new Date() }
    });

    // 4. Crear audit log
    await this.auditService.log({
      userId,
      action: 'CANDIDATE_SELECTED',
      entityType: 'Candidate',
      entityId: candidateId,
      processInstanceId: stageInstance.processInstanceId,
      metadata: {
        campaignId: stageInstance.processInstance.campaignId,
        candidateName: stageInstance.processInstance.candidate.name,
        campaignTitle: stageInstance.processInstance.campaign.title
      }
    });

    // 5. Notificar reclutador
    await this.notificationsService.create({
      userId: stageInstance.processInstance.campaign.userId,
      type: 'CANDIDATE_SELECTED',
      title: '¡Candidato seleccionado!',
      message: `El candidato ${stageInstance.processInstance.candidate.name} ha completado exitosamente el proceso de selección`,
      metadata: {
        processInstanceId: stageInstance.processInstanceId,
        candidateId,
        campaignId: stageInstance.processInstance.campaignId
      }
    });

    // Notificar candidato de selección
    if (stageInstance.processInstance.candidate.email) {
      this.emailService.sendCandidateSelectedEmail(
        stageInstance.processInstance.candidate.email,
        stageInstance.processInstance.candidate.name || 'Candidato',
        stageInstance.processInstance.campaign.title
      );
    }
  }

  async getProcessByCandidate(campaignId: string, candidateId: string, userId: string) {
    // Validar acceso
    const campaign = await this.prisma.campaign.findUnique({
      where: { id: campaignId }
    });

    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    if (campaign.userId !== userId) {
      const user = await this.prisma.user.findUnique({ where: { id: userId } });

      // Check if user is responsible for any stage in this campaign
      const isResponsible = await this.prisma.stageTemplate.findFirst({
        where: {
          campaignId: campaignId,
          responsibleId: userId
        }
      });

      if (user && user.role !== 'ADMIN' && !isResponsible) {
        throw new ForbiddenException('Access denied');
      }
    }

    const processInstance = await this.prisma.processInstance.findUnique({
      where: {
        campaignId_candidateId: { campaignId, candidateId }
      },
      include: {
        candidate: true,
        campaign: true,
        stageInstances: {
          include: {
            stageTemplate: true,
            responsible: {
              select: { id: true, name: true, email: true }
            },
            attachments: true
          },
          orderBy: {
            stageTemplate: { order: 'asc' }
          }
        },
        auditLogs: {
          include: {
            user: {
              select: { id: true, name: true, email: true }
            }
          },
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!processInstance) {
      throw new NotFoundException('Process not found for this candidate');
    }

    return processInstance;
  }
}
