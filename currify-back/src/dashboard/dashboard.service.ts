import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CampaignStatus, CandidateStatus, ScoringStatus } from '@prisma/client';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getSummary(userId: string, userCompany?: string) {
    // Build access WHERE clause (same access logic as CampaignsService.findAll):
    // user sees campaigns they created, where they're responsible, or from same company
    const accessWhere: any = {
      OR: [
        { userId },
        { stageTemplates: { some: { responsibleId: userId } } },
      ],
    };
    if (userCompany) {
      accessWhere.OR.push({ user: { company: userCompany } });
    }

    // ── Query 1: Campaign counts ──────────────────────────────────────────
    const [totalCampaigns, activeCampaigns, draftCampaigns, closedCampaigns] =
      await Promise.all([
        this.prisma.campaign.count({ where: accessWhere }),
        this.prisma.campaign.count({
          where: { ...accessWhere, status: CampaignStatus.ACTIVE },
        }),
        this.prisma.campaign.count({
          where: { ...accessWhere, status: CampaignStatus.DRAFT },
        }),
        this.prisma.campaign.count({
          where: { ...accessWhere, status: CampaignStatus.COMPLETED },
        }),
      ]);

    // ── Query 2: Campaigns with funnel data ───────────────────────────────
    const campaigns = await this.prisma.campaign.findMany({
      where: accessWhere,
      include: {
        _count: { select: { candidates: true } },
        candidates: {
          select: { id: true, candidateStatus: true },
          where: { processingStatus: 'COMPLETED' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // ── Query 3: Decision queue ───────────────────────────────────────────
    // Candidates with candidateStatus=NEW, scoringStatus=CURRENT, accessible campaign
    const decisionCandidates = await this.prisma.candidate.findMany({
      where: {
        candidateStatus: CandidateStatus.NEW,
        scoringStatus: ScoringStatus.CURRENT,
        campaign: accessWhere,
      },
      include: {
        campaign: { select: { id: true, title: true } },
        scoring: {
          select: { overallScore: true, recommendation: true, summary: true },
        },
      },
      orderBy: { scoring: { overallScore: 'desc' } },
      take: 20,
    });

    // ── Query 4: Top candidates ──────────────────────────────────────────
    // Candidates with scoringStatus=CURRENT, overallScore >= 60, accessible campaign
    const topCandidates = await this.prisma.candidate.findMany({
      where: {
        scoringStatus: ScoringStatus.CURRENT,
        scoring: { overallScore: { gte: 60 } },
        campaign: accessWhere,
      },
      include: {
        campaign: { select: { id: true, title: true } },
        scoring: {
          select: {
            overallScore: true,
            breakdown: true,
            summary: true,
            recommendation: true,
          },
        },
      },
      orderBy: { scoring: { overallScore: 'desc' } },
      take: 20,
    });

    // ── Query 5: Weekly stats ────────────────────────────────────────────
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    const [weeklyNewCVs, prevWeekCVs, evaluatedCVs] = await Promise.all([
      this.prisma.candidate.count({
        where: { campaign: accessWhere, createdAt: { gte: weekAgo } },
      }),
      this.prisma.candidate.count({
        where: {
          campaign: accessWhere,
          createdAt: { gte: twoWeeksAgo, lt: weekAgo },
        },
      }),
      this.prisma.candidate.count({
        where: { campaign: accessWhere, processingStatus: 'COMPLETED' },
      }),
    ]);

    const inInterview = await this.prisma.candidate.count({
      where: {
        campaign: accessWhere,
        candidateStatus: CandidateStatus.IN_PROCESS,
      },
    });

    const weeklyIncrease =
      prevWeekCVs > 0
        ? Math.round(((weeklyNewCVs - prevWeekCVs) / prevWeekCVs) * 100)
        : weeklyNewCVs > 0
          ? 100
          : 0;

    // ── Build response ───────────────────────────────────────────────────
    return {
      stats: {
        activeCampaigns,
        evaluatedCVs,
        inInterview,
        timeSavedHours: Math.round(evaluatedCVs * 0.5 * 10) / 10,
        draftCampaigns,
        closedCampaigns,
        weeklyNewCVs,
        weeklyIncrease,
      },
      campaigns: campaigns.map((c) => ({
        id: c.id,
        title: c.title,
        description: c.description || '',
        status: c.status,
        modality: c.modality || '',
        location: c.location || '',
        createdAt: c.createdAt.toISOString(),
        candidateCount: c._count.candidates,
        funnel: this.buildFunnel(c.candidates),
      })),
      decisionQueue: decisionCandidates.map((c) => ({
        id: c.id,
        name: c.name || 'Sin nombre',
        initials: this.getInitials(c.name || 'Candidato'),
        campaignTitle: c.campaign?.title || '',
        campaignId: c.campaign?.id || '',
        matchScore: c.scoring?.overallScore || 0,
        recommendation: c.scoring?.recommendation || '',
        summary: c.scoring?.summary || '',
        photoUrl: undefined,
      })),
      topCandidates: topCandidates.map((c) => ({
        id: c.id,
        name: c.name || 'Sin nombre',
        initials: this.getInitials(c.name || 'Candidato'),
        photoUrl: undefined,
        role: this.extractRole(c),
        experience: this.extractExperience(c),
        campaignTitle: c.campaign?.title || '',
        campaignId: c.campaign?.id || '',
        matchScore: c.scoring?.overallScore || 0,
        status: c.candidateStatus,
        stageLabel: this.getStageLabel(c.candidateStatus),
        dimensions: this.extractDimensions(c.scoring?.breakdown),
        summary: c.scoring?.summary || '',
      })),
    };
  }

  // ── Private helpers ────────────────────────────────────────────────────

  private buildFunnel(
    candidates: { candidateStatus: string }[],
  ): { review: number; interview: number; offer: number; hired: number } {
    let review = 0;
    let interview = 0;
    let offer = 0;
    let hired = 0;
    for (const c of candidates) {
      if (c.candidateStatus === 'NEW') review++;
      else if (c.candidateStatus === 'IN_PROCESS') interview++;
      else if (c.candidateStatus === 'SELECTED') hired++;
      else offer++;
    }
    return { review, interview, offer, hired };
  }

  private getInitials(name: string): string {
    const parts = name.trim().split(/\s+/);
    return parts.length >= 2
      ? (parts[0][0] + parts[1][0]).toUpperCase()
      : name.substring(0, 2).toUpperCase();
  }

  private getStageLabel(status: string): string {
    const map: Record<string, string> = {
      NEW: 'En revisión',
      IN_PROCESS: 'En entrevista',
      NOT_SELECTED: 'Descartado',
      SELECTED: 'Contratado',
    };
    return map[status] || status;
  }

  private extractRole(candidate: any): string {
    const sd = candidate.structuredData as any;
    return (
      sd?.datos_cv?.titular_profesional?.titular ||
      sd?.datos_cv?.experiencia_laboral?.[0]?.cargo ||
      'Candidato'
    );
  }

  private extractExperience(candidate: any): string {
    const sd = candidate.structuredData as any;
    const firstExp = sd?.datos_cv?.experiencia_laboral?.[0];
    if (firstExp?.cargo) {
      const company = firstExp.empresa || firstExp.institucion || '';
      return company ? `${firstExp.cargo} en ${company}` : firstExp.cargo;
    }
    return '';
  }

  private extractDimensions(
    scores: any,
  ): { label: string; score: number; maxScore: number }[] {
    if (!scores || typeof scores !== 'object') return [];
    const labelMap: Record<string, string> = {
      skills: 'Stack',
      experience: 'Experiencia',
      education: 'Educación',
      culturalFit: 'Fit cultural',
      portfolio: 'Portafolios',
      languages: 'Idiomas',
    };
    return Object.entries(scores)
      .filter(([_, v]) => typeof v === 'number')
      .slice(0, 3)
      .map(([key, val]) => ({
        label: labelMap[key] || key,
        score: Math.round((val as number) * 10) / 10,
        maxScore: 10,
      }));
  }
}
