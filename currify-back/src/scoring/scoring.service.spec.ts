import { Test, TestingModule } from '@nestjs/testing';
import { HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ScoringService } from './scoring.service';
import { PrismaService } from '../prisma/prisma.service';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('ScoringService', () => {
  let service: ScoringService;
  let prisma: PrismaService;

  const mockPrisma = {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    candidate: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    candidateScoring: {
      findUnique: jest.fn(),
      create: jest.fn(),
      deleteMany: jest.fn(),
    },
    campaign: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    llmUsageLog: {
      create: jest.fn(),
    },
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      const config: Record<string, string> = {
        SCORING_SERVICE_URL: 'http://test-core:8000',
        SCORING_SERVICE_USERNAME: 'test-user',
        SCORING_SERVICE_PASSWORD: 'test-pass',
        SCORING_SERVICE_API_KEY: '',
      };
      return config[key] || null;
    }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ScoringService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<ScoringService>(ScoringService);

    // Mock axios for auth token
    mockedAxios.post.mockResolvedValue({
      data: { access_token: 'mock-token' },
      headers: {},
    });
  });

  describe('reevaluateCandidate', () => {
    const candidateId = 'candidate-1';
    const userId = 'user-1';

    it('should throw 404 if user is not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.reevaluateCandidate(candidateId, userId),
      ).rejects.toThrow(HttpException);

      await expect(
        service.reevaluateCandidate(candidateId, userId),
      ).rejects.toMatchObject({
        status: HttpStatus.NOT_FOUND,
      });

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: userId },
        select: { cvCredits: true },
      });
    });

    it('should throw 402 if user has 0 or fewer credits', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ cvCredits: 0 });

      await expect(
        service.reevaluateCandidate(candidateId, userId),
      ).rejects.toThrow(HttpException);

      await expect(
        service.reevaluateCandidate(candidateId, userId),
      ).rejects.toMatchObject({
        status: HttpStatus.PAYMENT_REQUIRED,
        message: 'Créditos insuficientes para reevaluar candidato. Adquiere más créditos para continuar.',
      });

      // verify no update was attempted
      expect(mockPrisma.user.update).not.toHaveBeenCalled();
    });

    it('should throw 402 if user has negative credits', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ cvCredits: -1 });

      await expect(
        service.reevaluateCandidate(candidateId, userId),
      ).rejects.toMatchObject({
        status: HttpStatus.PAYMENT_REQUIRED,
      });

      expect(mockPrisma.user.update).not.toHaveBeenCalled();
    });

    it('should consume 1 credit only after successful rescore', async () => {
      // Mock user with credits
      mockPrisma.user.findUnique
        .mockResolvedValueOnce({ cvCredits: 5 }) // credit check
        .mockResolvedValueOnce({ cvCredits: 5 }); // for campaign.userId inside evaluateCandidate

      // Mock campaign for evaluateCandidate
      mockPrisma.candidate.findUnique.mockResolvedValue({
        id: candidateId,
        campaignId: 'campaign-1',
        structuredData: { test: 'data' },
        scoringStatus: 'OUTDATED',
        scoring: null,
        campaign: {
          userId: 'user-1',
          user: { company: 'TestCorp' },
        },
      });

      // Mock parsedJobData in campaign
      mockPrisma.campaign.findUnique.mockResolvedValue({
        id: 'campaign-1',
        parsedJobData: { requisitos: {} },
        parsedJobDataAt: new Date(),
        updatedAt: new Date('2020-01-01'),
        description: 'Test job',
        requirements: '',
        conditions: '',
        userId: 'user-1',
        user: { company: 'TestCorp' },
      });

      // Mock scoring service response
      mockedAxios.post
        .mockResolvedValueOnce({
          // auth login
          data: { access_token: 'mock-token' },
          headers: {},
        })
        .mockResolvedValueOnce({
          // scoring evaluate
          data: {
            overall_score: 85,
            recommendation: 'RECOMMENDED',
            breakdown: {},
            strengths: ['Leadership'],
            gaps: ['Experience'],
            summary: 'Good candidate',
          },
          headers: {},
        });

      mockPrisma.candidateScoring.deleteMany.mockResolvedValue({ count: 0 });
      mockPrisma.candidateScoring.create.mockResolvedValue({
        id: 'score-1',
        overallScore: 85,
        recommendation: 'RECOMMENDED',
        breakdown: {},
        strengths: ['Leadership'],
        gaps: ['Experience'],
        summary: 'Good candidate',
      });
      mockPrisma.candidate.update.mockResolvedValue({});
      mockPrisma.llmUsageLog.create.mockResolvedValue({});
      mockPrisma.user.update.mockResolvedValue({ cvCredits: 4 });

      await service.reevaluateCandidate(candidateId, userId);

      // Verify credit was decremented after successful rescore
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: { cvCredits: { decrement: 1 } },
      });
    });

    it('should NOT consume credit if rescore fails', async () => {
      // Mock user with credits
      mockPrisma.user.findUnique.mockResolvedValue({ cvCredits: 5 });

      // Mock candidate that passes findUnique but then evaluateCandidate throws
      mockPrisma.candidate.findUnique.mockResolvedValue({
        id: candidateId,
        campaignId: 'campaign-1',
        structuredData: { test: 'data' },
        scoringStatus: 'CURRENT',
        scoring: null,
        campaign: {
          userId: 'user-1',
          user: { company: 'TestCorp' },
        },
      });

      // Make evaluateCandidate throw (simulating scoring service failure)
      mockPrisma.candidate.findUnique.mockRejectedValueOnce(
        new Error('Database error'),
      );

      try {
        await service.reevaluateCandidate(candidateId, userId);
      } catch (e) {
        // Expected error
      }

      // Verify credit was NOT decremented
      expect(mockPrisma.user.update).not.toHaveBeenCalled();
    });
  });

  describe('rescoreCampaign', () => {
    const campaignId = 'campaign-1';
    const userId = 'user-1';

    it('should return limited=false when no candidates need rescoring', async () => {
      mockPrisma.candidate.findMany.mockResolvedValue([]);

      const result = await service.rescoreCampaign(campaignId, userId);

      expect(result).toEqual({ total: 0, started: 0, limited: false });
    });

    it('should limit to 100 candidates when there are more', async () => {
      const manyCandidates = Array.from({ length: 150 }, (_, i) => ({
        id: `candidate-${i}`,
      }));

      mockPrisma.candidate.findMany.mockResolvedValue(manyCandidates);
      mockPrisma.user.findUnique.mockResolvedValue({ cvCredits: 999 });

      // Make rescore succeed for each candidate
      mockPrisma.candidate.findUnique.mockResolvedValue({
        id: 'any',
        campaignId: 'campaign-1',
        structuredData: { test: 'data' },
        scoringStatus: 'OUTDATED',
        scoring: null,
        campaign: {
          userId: 'user-1',
          user: { company: 'TestCorp' },
        },
      });

      mockPrisma.campaign.findUnique.mockResolvedValue({
        id: 'campaign-1',
        parsedJobData: { requisitos: {} },
        parsedJobDataAt: new Date(),
        updatedAt: new Date('2020-01-01'),
        description: 'Test job',
        requirements: '',
        conditions: '',
        userId: 'user-1',
        user: { company: 'TestCorp' },
      });

      mockedAxios.post.mockResolvedValue({
        data: {
          overall_score: 80,
          recommendation: 'RECOMMENDED',
          breakdown: {},
          strengths: [],
          gaps: [],
          summary: null,
        },
        headers: {},
      });

      mockPrisma.candidateScoring.deleteMany.mockResolvedValue({ count: 0 });
      mockPrisma.candidateScoring.create.mockResolvedValue({
        id: 'score-1',
        overallScore: 80,
        recommendation: 'RECOMMENDED',
        breakdown: {},
        strengths: [],
        gaps: [],
        summary: null,
      });
      mockPrisma.candidate.update.mockResolvedValue({});

      const result = await service.rescoreCampaign(campaignId, userId);

      expect(result.limited).toBe(true);
      expect(result.started).toBe(100);
      expect(result.total).toBe(150);
    });

    it('should continue processing other candidates if one fails', async () => {
      const mockCandidates = [
        { id: 'candidate-1' },
        { id: 'candidate-2' },
      ];

      mockPrisma.candidate.findMany.mockResolvedValue(mockCandidates);
      mockPrisma.user.findUnique
        .mockResolvedValueOnce({ cvCredits: 1 })
        .mockResolvedValueOnce({ cvCredits: 1 });

      mockPrisma.candidateScoring.deleteMany.mockResolvedValue({ count: 0 });

      // Make first candidate succeed
      mockPrisma.candidate.findUnique.mockResolvedValueOnce({
        id: 'candidate-1',
        campaignId: campaignId,
        structuredData: { test: 'data' },
        scoringStatus: 'OUTDATED',
        scoring: null,
        campaign: {
          userId: userId,
          user: { company: 'TestCorp' },
        },
      });

      // Make second candidate fail
      mockPrisma.candidate.findUnique.mockRejectedValueOnce(
        new Error('Scoring service error'),
      );

      mockPrisma.campaign.findUnique.mockResolvedValue({
        id: campaignId,
        parsedJobData: { requisitos: {} },
        parsedJobDataAt: new Date(),
        updatedAt: new Date('2020-01-01'),
        description: 'Test job',
        requirements: '',
        conditions: '',
        userId: userId,
        user: { company: 'TestCorp' },
      });

      mockedAxios.post.mockResolvedValue({
        data: {
          overall_score: 90,
          recommendation: 'RECOMMENDED',
          breakdown: {},
          strengths: [],
          gaps: [],
          summary: null,
        },
        headers: {},
      });

      mockPrisma.candidateScoring.create.mockResolvedValue({
        id: 'score-1',
        overallScore: 90,
        recommendation: 'RECOMMENDED',
        breakdown: {},
        strengths: [],
        gaps: [],
        summary: null,
      });

      const result = await service.rescoreCampaign(campaignId, userId);

      expect(result.started).toBe(2);
      expect(result.total).toBe(2);
      expect(result.limited).toBe(false);
    });
  });
});
