import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SearchCandidatesDto } from './dto/search-candidates.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class CandidatesService {
  constructor(private prisma: PrismaService) {}

  async findAll(campaignId: string, userId: string, searchDto?: SearchCandidatesDto) {
    const campaign = await this.prisma.campaign.findUnique({
      where: { id: campaignId },
    });

    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    if (campaign.userId !== userId) {
      throw new ForbiddenException('You can only access candidates from your own campaigns');
    }

    const where: Prisma.CandidateWhereInput = {
      campaignId,
    };

    if (searchDto) {
      if (searchDto.search) {
        where.OR = [
          { name: { contains: searchDto.search, mode: 'insensitive' } },
          { email: { contains: searchDto.search, mode: 'insensitive' } },
        ];
      }

      if (searchDto.status) {
        where.processingStatus = searchDto.status;
      }

      if (searchDto.skills && searchDto.skills.length > 0) {
        where.structuredData = {
          path: ['datos_cv', 'habilidades', 'habilidades_tecnicas'],
          array_contains: searchDto.skills,
        } as any;
      }
    }

    const orderBy: Prisma.CandidateOrderByWithRelationInput = {};
    if (searchDto?.sortBy) {
      orderBy[searchDto.sortBy] = searchDto.sortOrder || 'desc';
    } else {
      orderBy.createdAt = 'desc';
    }

    return this.prisma.candidate.findMany({
      where,
      orderBy,
      include: {
        documents: {
          select: {
            id: true,
            originalName: true,
            processingStatus: true,
            createdAt: true,
          },
        },
        scoring: {
          select: {
            overallScore: true,
            recommendation: true,
          },
        },
      },
    });
  }

  async findOne(id: string, userId: string) {
    const candidate = await this.prisma.candidate.findUnique({
      where: { id },
      include: {
        campaign: true,
        documents: {
          select: {
            id: true,
            originalName: true,
            fileName: true,
            mimeType: true,
            fileSize: true,
            processingStatus: true,
            extractedText: true,
            createdAt: true,
          },
        },
        scoring: true,
      },
    });

    if (!candidate) {
      throw new NotFoundException('Candidate not found');
    }

    if (candidate.campaign.userId !== userId) {
      throw new ForbiddenException('You can only access candidates from your own campaigns');
    }

    return candidate;
  }

  async getStructuredData(candidateId: string, userId: string) {
    const candidate = await this.findOne(candidateId, userId);
    return {
      id: candidate.id,
      structuredData: candidate.structuredData,
      processingStatus: candidate.processingStatus,
    };
  }

  async getCandidateStats(campaignId: string, userId: string) {
    const campaign = await this.prisma.campaign.findUnique({
      where: { id: campaignId },
    });

    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    if (campaign.userId !== userId) {
      throw new ForbiddenException('You can only access stats from your own campaigns');
    }

    const [total, processed, failed, pending] = await Promise.all([
      this.prisma.candidate.count({ where: { campaignId } }),
      this.prisma.candidate.count({
        where: { campaignId, processingStatus: 'COMPLETED' }
      }),
      this.prisma.candidate.count({
        where: { campaignId, processingStatus: 'FAILED' }
      }),
      this.prisma.candidate.count({
        where: { campaignId, processingStatus: { in: ['PENDING', 'PROCESSING'] } }
      }),
    ]);

    return {
      total,
      processed,
      failed,
      pending,
    };
  }

  async remove(id: string, userId: string) {
    const candidate = await this.prisma.candidate.findUnique({
      where: { id },
      include: { campaign: true },
    });

    if (!candidate) {
      throw new NotFoundException('Candidate not found');
    }

    if (candidate.campaign.userId !== userId) {
      throw new ForbiddenException('You can only delete candidates from your own campaigns');
    }

    return this.prisma.candidate.delete({
      where: { id },
    });
  }

  async searchBySkills(campaignId: string, userId: string, skills: string[]) {
    const campaign = await this.prisma.campaign.findUnique({
      where: { id: campaignId },
    });

    if (!campaign || campaign.userId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    return this.prisma.candidate.findMany({
      where: {
        campaignId,
        processingStatus: 'COMPLETED',
        structuredData: {
          path: ['datos_cv', 'habilidades', 'habilidades_tecnicas'],
          array_contains: skills,
        } as any,
      },
      include: {
        documents: {
          select: {
            id: true,
            originalName: true,
            processingStatus: true,
          },
        },
      },
    });
  }

  async exportCandidates(campaignId: string, userId: string) {
    const candidates = await this.findAll(campaignId, userId);

    return candidates.map(candidate => ({
      id: candidate.id,
      name: candidate.name,
      email: candidate.email,
      phone: candidate.phone,
      processingStatus: candidate.processingStatus,
      createdAt: candidate.createdAt,
      skills: (candidate.structuredData as any)?.datos_cv?.habilidades?.habilidades_tecnicas || [],
      experience: (candidate.structuredData as any)?.datos_cv?.experiencia_laboral || [],
      education: (candidate.structuredData as any)?.datos_cv?.formacion_academica || [],
      summary: (candidate.structuredData as any)?.datos_cv?.resumen_profesional?.resumen || '',
    }));
  }
}