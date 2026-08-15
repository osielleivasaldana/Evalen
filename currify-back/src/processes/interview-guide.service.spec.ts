import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InterviewGuideService } from './interview-guide.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { EmailService } from '../email/email.service';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('InterviewGuideService', () => {
  let service: InterviewGuideService;

  const mockPrisma = {
    user: { findUnique: jest.fn() },
    campaign: { findUnique: jest.fn() },
    processInstance: { findUnique: jest.fn() },
    stageInstance: { findUnique: jest.fn(), update: jest.fn() },
    candidate: { findUnique: jest.fn() },
  };

  const guide = { questions: [{ question: 'P1', source: 'rubrica' }] };

  const stageInstanceMock = (responsibleId: string) => ({
    id: 'stage-1',
    processInstanceId: 'proc-1',
    responsibleId,
    status: 'ACTIVE',
    processInstance: { campaignId: 'camp-1', candidateId: 'cand-1' },
    stageTemplate: { name: 'Entrevista Técnica', description: 'Deep dive' },
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    mockedAxios.post
      .mockResolvedValueOnce({ data: { access_token: 'mock-token' } })
      .mockResolvedValueOnce({ data: guide, headers: {} });

    mockPrisma.user.findUnique.mockResolvedValue({ id: 'user-1', role: 'RECRUITER' });
    mockPrisma.campaign.findUnique.mockResolvedValue({
      id: 'camp-1', title: 'Campaña', description: 'd', requirements: 'r',
      modality: 'REMOTE', userId: 'owner-1',
      parsedJobData: { requisitos: { habilidades_requeridas: ['React'] } },
    });
    mockPrisma.processInstance.findUnique.mockResolvedValue({
      id: 'proc-1', campaignId: 'camp-1', candidateId: 'cand-1',
    });
    mockPrisma.candidate.findUnique.mockResolvedValue({
      id: 'cand-1', name: 'Marta',
      structuredData: {
        datos_cv: {
          resumen_profesional: { resumen: 'QA 6 años' },
          habilidades: { habilidades_tecnicas: [{ skill: 'QA' }] },
        },
      },
      scoring: { gaps: ['Sin React'] },
    });
    mockPrisma.stageInstance.update.mockResolvedValue({});

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InterviewGuideService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ConfigService, useValue: { get: jest.fn((k: string) => ({ SCORING_SERVICE_URL: 'http://core:8000', SCORING_SERVICE_USERNAME: 'u', SCORING_SERVICE_PASSWORD: 'p' }[k])) } },
        { provide: AuditService, useValue: { log: jest.fn() } },
        { provide: NotificationsService, useValue: { create: jest.fn() } },
        { provide: EmailService, useValue: {} },
      ],
    }).compile();

    service = module.get(InterviewGuideService);
  });

  it('debe generar y persistir la guía para el responsable de la etapa', async () => {
    mockPrisma.stageInstance.findUnique.mockResolvedValue(stageInstanceMock('user-1'));
    const result = await service.generateGuide('proc-1', 'stage-1', 'user-1');
    expect(result).toEqual(guide);
    expect(mockPrisma.stageInstance.update).toHaveBeenCalledWith({
      where: { id: 'stage-1' },
      data: { guideJson: guide },
    });
    // el payload enviado a core NUNCA incluye feedback/sensitive
    const sentPayload = mockedAxios.post.mock.calls[1][1];
    const raw = JSON.stringify(sentPayload).toLowerCase();
    expect(raw).not.toContain('feedback');
    expect(raw).not.toContain('sensitive');
  });

  it('debe rechazar a un usuario sin relación con la etapa', async () => {
    mockPrisma.stageInstance.findUnique.mockResolvedValue(stageInstanceMock('other-1'));
    await expect(service.generateGuide('proc-1', 'stage-1', 'user-1')).rejects
      .toBeInstanceOf(ForbiddenException);
  });

  it('debe guardar notas solo para dueño o responsable', async () => {
    mockPrisma.stageInstance.findUnique.mockResolvedValue(stageInstanceMock('user-1'));
    mockPrisma.stageInstance.update.mockResolvedValue({ notesJson: { 0: 'Bien' } });
    const result = await service.updateNotes('proc-1', 'stage-1', 'user-1', { 0: 'Bien' });
    expect(result.notesJson).toEqual({ 0: 'Bien' });
    expect(mockPrisma.stageInstance.update).toHaveBeenCalledWith({
      where: { id: 'stage-1' },
      data: { notesJson: { 0: 'Bien' } },
    });
  });
});