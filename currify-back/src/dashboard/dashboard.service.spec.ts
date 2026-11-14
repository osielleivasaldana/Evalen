import { Test, TestingModule } from '@nestjs/testing';
import { DashboardService } from './dashboard.service';
import { PrismaService } from '../prisma/prisma.service';

describe('DashboardService', () => {
  let service: DashboardService;
  let prisma: any;

  const mockCampaigns = [
    {
      id: 'camp-1',
      title: 'Campaign Alpha',
      description: 'First campaign',
      status: 'ACTIVE',
      modality: 'REMOTE',
      location: 'Santiago',
      createdAt: new Date('2026-07-20'),
      _count: { candidates: 5 },
      candidates: [
        { id: 'c1', candidateStatus: 'NEW' },
        { id: 'c2', candidateStatus: 'IN_PROCESS' },
        { id: 'c3', candidateStatus: 'SELECTED' },
        { id: 'c4', candidateStatus: 'NOT_SELECTED' },
      ],
    },
    {
      id: 'camp-2',
      title: 'Campaign Beta',
      description: 'Second campaign',
      status: 'DRAFT',
      modality: 'HYBRID',
      location: 'Ñuñoa',
      createdAt: new Date('2026-07-18'),
      _count: { candidates: 2 },
      candidates: [
        { id: 'c5', candidateStatus: 'NEW' },
        { id: 'c6', candidateStatus: 'NEW' },
      ],
    },
  ];

  const mockDecisionCandidates = [
    {
      id: 'dec-1',
      name: 'María García',
      candidateStatus: 'NEW',
      campaign: { id: 'camp-1', title: 'Campaign Alpha' },
      scoring: { overallScore: 92, recommendation: 'FUERTE', summary: 'Excelente perfil técnico' },
    },
    {
      id: 'dec-2',
      name: 'Carlos López',
      candidateStatus: 'NEW',
      campaign: { id: 'camp-1', title: 'Campaign Alpha' },
      scoring: { overallScore: 78, recommendation: 'RECOMENDADO', summary: 'Buen ajuste cultural' },
    },
  ];

  const mockTopCandidates = [
    {
      id: 'top-1',
      name: 'Ana Martínez',
      candidateStatus: 'IN_PROCESS',
      campaign: { id: 'camp-1', title: 'Campaign Alpha' },
      scoring: {
        overallScore: 88,
        breakdown: { skills: 9, experience: 8.5, education: 7 },
        summary: 'Candidato destacado',
        recommendation: 'RECOMENDADO',
      },
      structuredData: {
        datos_cv: {
          titular_profesional: { titular: 'Ingeniera Civil' },
          experiencia_laboral: [{ cargo: 'Tech Lead', empresa: 'TechCorp' }],
        },
      },
    },
    {
      id: 'top-2',
      name: 'Pedro Ramírez',
      candidateStatus: 'NEW',
      campaign: { id: 'camp-2', title: 'Campaign Beta' },
      scoring: {
        overallScore: 95,
        breakdown: { skills: 9.5, experience: 9, culturalFit: 8 },
        summary: 'Perfil sobresaliente',
        recommendation: 'FUERTE',
      },
      structuredData: {
        datos_cv: {
          experiencia_laboral: [{ cargo: 'Senior Developer', empresa: 'CodeCorp' }],
        },
      },
    },
  ];

  const mockPrisma = {
    campaign: {
      count: jest.fn().mockResolvedValue(3).mockResolvedValueOnce(3) // total
        .mockResolvedValueOnce(1) // active
        .mockResolvedValueOnce(1) // draft
        .mockResolvedValueOnce(1), // closed
      findMany: jest.fn().mockResolvedValue(mockCampaigns),
    },
    candidate: {
      count: jest.fn()
        .mockResolvedValueOnce(5)  // weeklyNewCVs
        .mockResolvedValueOnce(3)  // prevWeekCVs
        .mockResolvedValueOnce(10) // evaluatedCVs
        .mockResolvedValueOnce(4), // inInterview
      findMany: jest.fn()
        .mockResolvedValueOnce(mockDecisionCandidates)
        .mockResolvedValueOnce(mockTopCandidates),
    },
  };

  beforeEach(async () => {
    // Reset all mocks
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DashboardService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<DashboardService>(DashboardService);
    prisma = module.get(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getSummary', () => {
    it('should return the full dashboard summary structure', async () => {
      const result = await service.getSummary('user-1', 'evalen');

      // — Stats —
      expect(result.stats).toBeDefined();
      expect(result.stats.activeCampaigns).toBe(1);
      expect(result.stats.draftCampaigns).toBe(1);
      expect(result.stats.closedCampaigns).toBe(1);
      expect(result.stats.evaluatedCVs).toBe(10);
      expect(result.stats.inInterview).toBe(4);
      expect(result.stats.timeSavedHours).toBe(5); // Math.round(10 * 0.5 * 10) / 10 = 5
      expect(result.stats.weeklyNewCVs).toBe(5);
      expect(result.stats.weeklyIncrease).toBe(67); // Math.round(((5-3)/3)*100) = 67

      // — Campaigns —
      expect(result.campaigns).toHaveLength(2);
      expect(result.campaigns[0].id).toBe('camp-1');
      expect(result.campaigns[0].candidateCount).toBe(5);
      expect(result.campaigns[0].funnel).toEqual({
        review: 1,    // NEW
        interview: 1, // IN_PROCESS
        offer: 1,     // NOT_SELECTED → offer
        hired: 1,     // SELECTED → hired
      });
      expect(result.campaigns[0].createdAt).toBe('2026-07-20T00:00:00.000Z');
      expect(result.campaigns[1].funnel).toEqual({
        review: 2,
        interview: 0,
        offer: 0,
        hired: 0,
      });

      // — Decision Queue —
      expect(result.decisionQueue).toHaveLength(2);
      expect(result.decisionQueue[0].name).toBe('María García');
      expect(result.decisionQueue[0].initials).toBe('MG');
      expect(result.decisionQueue[0].matchScore).toBe(92);
      expect(result.decisionQueue[0].recommendation).toBe('FUERTE');

      // — Top Candidates —
      expect(result.topCandidates).toHaveLength(2);
      expect(result.topCandidates[0].role).toBe('Ingeniera Civil');
      expect(result.topCandidates[0].matchScore).toBe(88);
      expect(result.topCandidates[0].dimensions).toEqual([
        { label: 'Stack', score: 9, maxScore: 10 },
        { label: 'Experiencia', score: 8.5, maxScore: 10 },
        { label: 'Educación', score: 7, maxScore: 10 },
      ]);
      expect(result.topCandidates[1].initials).toBe('PR');
    });

    it('should handle empty data gracefully', async () => {
      // Override mocks to return empty
      mockPrisma.campaign.count.mockResolvedValue(0);
      mockPrisma.campaign.findMany.mockResolvedValue([]);
      mockPrisma.candidate.count
        .mockResolvedValueOnce(0)  // weeklyNewCVs
        .mockResolvedValueOnce(0)  // prevWeekCVs
        .mockResolvedValueOnce(0)  // evaluatedCVs
        .mockResolvedValueOnce(0); // inInterview
      mockPrisma.candidate.findMany.mockResolvedValue([]);

      const result = await service.getSummary('user-1', 'evalen');

      expect(result.stats.activeCampaigns).toBe(0);
      expect(result.stats.weeklyIncrease).toBe(0);
      expect(result.campaigns).toEqual([]);
      expect(result.decisionQueue).toEqual([]);
      expect(result.topCandidates).toEqual([]);
    });

    it('should handle weeklyIncrease when only current week has data', async () => {
      mockPrisma.campaign.count.mockResolvedValue(0);
      mockPrisma.campaign.findMany.mockResolvedValue([]);
      mockPrisma.candidate.count
        .mockResolvedValueOnce(5)  // weeklyNewCVs
        .mockResolvedValueOnce(0)  // prevWeekCVs
        .mockResolvedValueOnce(0)  // evaluatedCVs
        .mockResolvedValueOnce(0); // inInterview
      mockPrisma.candidate.findMany.mockResolvedValue([]);

      const result = await service.getSummary('user-1', 'evalen');

      expect(result.stats.weeklyNewCVs).toBe(5);
      expect(result.stats.weeklyIncrease).toBe(100);
    });
  });

  describe('getInitials', () => {
    it('should return first two letters for single name', () => {
      expect((service as any).getInitials('María')).toBe('MA');
    });

    it('should return first letter of first two names', () => {
      expect((service as any).getInitials('María García López')).toBe('MG');
    });

    it('should uppercase initials', () => {
      expect((service as any).getInitials('ana maría')).toBe('AM');
    });
  });

  describe('getStageLabel', () => {
    it('should map statuses to Spanish labels', () => {
      expect((service as any).getStageLabel('NEW')).toBe('En revisión');
      expect((service as any).getStageLabel('IN_PROCESS')).toBe('En entrevista');
      expect((service as any).getStageLabel('NOT_SELECTED')).toBe('Descartado');
      expect((service as any).getStageLabel('SELECTED')).toBe('Contratado');
    });

    it('should return the status itself if not in map', () => {
      expect((service as any).getStageLabel('UNKNOWN')).toBe('UNKNOWN');
    });
  });

  describe('extractDimensions', () => {
    it('should extract up to 3 dimensions from breakdown', () => {
      const scores = { skills: 9, experience: 8.5, education: 7, languages: 6 };
      const result = (service as any).extractDimensions(scores);
      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({ label: 'Stack', score: 9, maxScore: 10 });
      expect(result[1]).toEqual({ label: 'Experiencia', score: 8.5, maxScore: 10 });
    });

    it('should return empty array for null/undefined', () => {
      expect((service as any).extractDimensions(null)).toEqual([]);
      expect((service as any).extractDimensions(undefined)).toEqual([]);
    });
  });

  describe('buildFunnel', () => {
    it('should correctly group candidates by status', () => {
      const candidates = [
        { candidateStatus: 'NEW' },
        { candidateStatus: 'IN_PROCESS' },
        { candidateStatus: 'SELECTED' },
        { candidateStatus: 'NOT_SELECTED' },
        { candidateStatus: 'NEW' },
      ];
      const result = (service as any).buildFunnel(candidates);
      expect(result).toEqual({ review: 2, interview: 1, offer: 1, hired: 1 });
    });
  });

  describe('extractRole', () => {
    it('should extract from titular profesional first', () => {
      const candidate = {
        structuredData: {
          datos_cv: {
            titular_profesional: { titular: 'Ingeniera' },
            experiencia_labral: [{ cargo: 'Dev' }],
          },
        },
      };
      expect((service as any).extractRole(candidate)).toBe('Ingeniera');
    });

    it('should fallback to Candidato', () => {
      expect((service as any).extractRole({ structuredData: null })).toBe('Candidato');
    });
  });
});
