import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { ProcessesService } from './processes.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { EmailService } from '../email/email.service';

describe('ProcessesService — getProcessByCandidate scoping', () => {
  let service: ProcessesService;
  let prisma: PrismaService;

  const mockPrisma = {
    campaign: { findUnique: jest.fn() },
    user: { findUnique: jest.fn() },
    stageTemplate: { findFirst: jest.fn() },
    processInstance: { findUnique: jest.fn(), findFirst: jest.fn(), update: jest.fn() },
    candidate: { update: jest.fn() },
    stageInstance: { update: jest.fn(), updateMany: jest.fn() },
    notifications: { create: jest.fn() },
    auditLog: { create: jest.fn() },
  };

  const fullProcess = {
    id: 'proc-1',
    startDate: new Date().toISOString(),
    endDate: null,
    currentStageOrder: 2,
    candidate: { id: 'cand-1', name: 'Marta', expectedSalary: '$1.8M CLP' },
    campaign: { id: 'camp-1', title: 'Campaña', userId: 'owner-1', modality: 'HYBRID' },
    auditLogs: [{ id: 'log-1' }],
    stageInstances: [
      { id: 's1', status: 'ACCEPTED', stageTemplate: { name: 'Contactar' }, responsible: { id: 'owner-1', name: 'O', email: '' } },
      { id: 's2', status: 'ACTIVE', stageTemplate: { name: 'Técnica' }, responsible: { id: 'resp-1', name: 'R', email: '' } },
      { id: 's3', status: 'PENDING', stageTemplate: { name: 'Final' }, responsible: { id: 'resp-2', name: 'R2', email: '' } },
    ],
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockPrisma.campaign.findUnique.mockResolvedValue({ id: 'camp-1', userId: 'owner-1' });
    mockPrisma.processInstance.findUnique.mockResolvedValue(fullProcess);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProcessesService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AuditService, useValue: { log: jest.fn() } },
        { provide: NotificationsService, useValue: { create: jest.fn() } },
        { provide: EmailService, useValue: { sendCandidateRejectedEmail: jest.fn() } },
      ],
    }).compile();
    service = module.get(ProcessesService);
    prisma = module.get(PrismaService);
  });

  it('debe devolver payload completo + viewer OWNER + sensitive para el dueño', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ id: 'owner-1', role: 'RECRUITER' });
    const res: any = await service.getProcessByCandidate('camp-1', 'cand-1', 'owner-1');
    expect(res.viewer).toBe('OWNER');
    expect(res.sensitive).toEqual({ salary: '$1.8M CLP', modality: 'HYBRID' });
    expect(res.stageInstances).toHaveLength(3);
    expect(res.auditLogs).toHaveLength(1);
  });

  it('debe devolver payload completo + viewer OWNER para ADMIN', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ id: 'admin-1', role: 'ADMIN' });
    const res: any = await service.getProcessByCandidate('camp-1', 'cand-1', 'admin-1');
    expect(res.viewer).toBe('OWNER');
    expect(res.stageInstances).toHaveLength(3);
  });

  it('debe devolver SOLO su etapa para un responsable (sandbox)', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ id: 'resp-1', role: 'TECHNICAL_REVIEWER' });
    mockPrisma.stageTemplate.findFirst.mockResolvedValue({ id: 'st2', responsibleId: 'resp-1' });
    const res: any = await service.getProcessByCandidate('camp-1', 'cand-1', 'resp-1');
    expect(res.viewer).toBe('STAGE_RESPONSIBLE');
    expect(res.stageInstances.map((s: any) => s.id)).toEqual(['s2']);
    expect(res.auditLogs).toBeUndefined();
    expect(res.sensitive).toBeUndefined();
    expect(res.candidate).toEqual({ id: 'cand-1', name: 'Marta' });
    expect(res.campaign).toEqual({ id: 'camp-1', title: 'Campaña' });
  });

  it('debe lanzar 403 para un usuario sin relación con la campaña', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ id: 'stranger-1', role: 'RECRUITER' });
    mockPrisma.stageTemplate.findFirst.mockResolvedValue(null);
    await expect(service.getProcessByCandidate('camp-1', 'cand-1', 'stranger-1')).rejects
      .toBeInstanceOf(ForbiddenException);
  });

  it('debe lanzar 404 si el proceso no existe', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ id: 'owner-1', role: 'RECRUITER' });
    mockPrisma.processInstance.findUnique.mockResolvedValue(null);
    await expect(service.getProcessByCandidate('camp-1', 'cand-1', 'owner-1')).rejects
      .toBeInstanceOf(NotFoundException);
  });

  describe('handleStageRejected — OMITTED', () => {
    it('debe marcar las etapas PENDING posteriores como OMITTED', async () => {
      const stageInstance = {
        processInstanceId: 'proc-1',
        processInstance: {
          campaignId: 'camp-1',
          candidateId: 'cand-1',
          campaign: { userId: 'owner-1', title: 'Campaña' },
          candidate: { email: 'm@x.cl', name: 'Marta' },
        },
        stageTemplate: { name: 'Contactar' },
      };
      mockPrisma.stageInstance.updateMany.mockResolvedValue({ count: 2 });
      mockPrisma.candidate.update.mockResolvedValue({});
      mockPrisma.processInstance.update.mockResolvedValue({});

      await (service as any).handleStageRejected(stageInstance, 'owner-1');

      expect(mockPrisma.stageInstance.updateMany).toHaveBeenCalledWith({
        where: { processInstanceId: 'proc-1', status: 'PENDING' },
        data: { status: 'OMITTED' },
      });
    });
  });
});