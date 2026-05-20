import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PlanTier } from '@prisma/client';

@Injectable()
export class OwnerService {
  constructor(private prisma: PrismaService) {}

  async getDashboardSummary() {
    const totalUsers = await this.prisma.user.count();
    
    // Group users by company name to count distinct companies
    const companiesGroup = await this.prisma.user.groupBy({
      by: ['company'],
      where: {
        company: { not: null }
      }
    });
    const totalCompanies = companiesGroup.length;

    const totalCampaigns = await this.prisma.campaign.count();
    const totalCandidates = await this.prisma.candidate.count();

    return {
      totalUsers,
      totalCompanies,
      totalCampaigns,
      totalCandidates,
    };
  }

  async getLlmStats() {
    // Aggregations
    const totals = await this.prisma.llmUsageLog.aggregate({
      _sum: {
        promptTokens: true,
        completionTokens: true,
        totalTokens: true,
        costUsd: true,
      },
      _count: {
        id: true,
      }
    });

    // Group by model
    const byModel = await this.prisma.llmUsageLog.groupBy({
      by: ['model'],
      _sum: {
        promptTokens: true,
        completionTokens: true,
        totalTokens: true,
        costUsd: true,
      },
      _count: {
        id: true,
      }
    });

    // Group by action
    const byAction = await this.prisma.llmUsageLog.groupBy({
      by: ['action'],
      _sum: {
        promptTokens: true,
        completionTokens: true,
        totalTokens: true,
        costUsd: true,
      },
      _count: {
        id: true,
      }
    });

    // Recent 100 logs with user info
    const recentLogs = await this.prisma.llmUsageLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    // Fetch user details for recent logs
    const logsWithUser = await Promise.all(
      recentLogs.map(async (log: any) => {
        let userEmail = null;
        let company = null;
        if (log.userId) {
          const user = await this.prisma.user.findUnique({
            where: { id: log.userId },
            select: { email: true, company: true }
          });
          if (user) {
            userEmail = user.email;
            company = user.company;
          }
        }
        return {
          id: log.id,
          userId: log.userId,
          companyId: null,
          action: log.action,
          model: log.model,
          promptTokens: log.promptTokens,
          completionTokens: log.completionTokens,
          totalTokens: log.totalTokens,
          cost: Number(log.costUsd),
          timestamp: log.createdAt.toISOString(),
          userEmail,
          company,
        };
      })
    );

    return {
      totals: {
        totalRequests: totals._count.id,
        promptTokens: totals._sum.promptTokens || 0,
        completionTokens: totals._sum.completionTokens || 0,
        totalTokens: totals._sum.totalTokens || 0,
        cost: Number(totals._sum.costUsd || 0),
      },
      byModel: byModel.map((m: any) => ({
        model: m.model,
        requests: m._count?.id || 0,
        promptTokens: m._sum?.promptTokens || 0,
        completionTokens: m._sum?.completionTokens || 0,
        totalTokens: m._sum?.totalTokens || 0,
        cost: Number(m._sum?.costUsd || 0),
      })),
      byAction: byAction.map((a: any) => ({
        action: a.action,
        requests: a._count?.id || 0,
        promptTokens: a._sum?.promptTokens || 0,
        completionTokens: a._sum?.completionTokens || 0,
        totalTokens: a._sum?.totalTokens || 0,
        cost: Number(a._sum?.costUsd || 0),
      })),
      recentLogs: logsWithUser,
    };
  }

  async getAllUsers() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        company: true,
        role: true,
        isActive: true,
        plan: true,
        cvCredits: true,
        smartFillCredits: true,
        campaignLimit: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async updateUserPlan(
    userId: string,
    updateData: {
      plan?: PlanTier;
      cvCredits?: number;
      smartFillCredits?: number;
      campaignLimit?: number;
      isActive?: boolean;
    }
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        company: true,
        role: true,
        isActive: true,
        plan: true,
        cvCredits: true,
        smartFillCredits: true,
        campaignLimit: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }
}
