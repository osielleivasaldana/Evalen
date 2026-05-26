import { Injectable, Logger, OnModuleInit, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PlanTier, PlanConfig } from '@prisma/client';

@Injectable()
export class PlansService implements OnModuleInit {
  private readonly logger = new Logger(PlansService.name);

  constructor(private prisma: PrismaService) {}

  async onModuleInit() {
    await this.seedPlans();
  }

  async seedPlans() {
    try {
      const plansCount = await this.prisma.planConfig.count();
      if (plansCount === 0) {
        this.logger.log('No plan configurations found. Seeding default plans...');
        
        const defaultPlans = [
          {
            tier: PlanTier.FREE,
            name: 'Starter',
            description: 'Ideal para probar la magia.',
            price: 0,
            campaignLimit: 1,
            cvCredits: 3,
            smartFillCredits: 3,
            features: [
              '1 Campaña activa',
              '3 CVs por mes',
              'Extracción básica de datos',
              'Análisis de candidatos'
            ]
          },
          {
            tier: PlanTier.PRO,
            name: 'EvalenPro',
            description: 'Para equipos de RR.HH. que buscan escalar.',
            price: 19990,
            campaignLimit: 999,
            cvCredits: 999,
            smartFillCredits: 999,
            features: [
              'Campañas ilimitadas',
              'Procesamiento ilimitado de CVs',
              'Smart Match avanzado',
              'Exportación de reportes',
              'Soporte prioritario'
            ]
          },
          {
            tier: PlanTier.ENTERPRISE,
            name: 'Enterprise',
            description: 'Para grandes corporativos.',
            price: -1,
            campaignLimit: 9999,
            cvCredits: 9999,
            smartFillCredits: 9999,
            features: [
              'Todo lo de EvalenPro',
              'SSO corporativo',
              'API de integración',
              'Onboarding personalizado',
              'SLA garantizado'
            ]
          }
        ];

        for (const p of defaultPlans) {
          await this.prisma.planConfig.create({
            data: p
          });
        }
        this.logger.log('Default plans seeded successfully.');
      }
    } catch (error) {
      this.logger.error('Error seeding default plans:', error);
    }
  }

  async getPublicPlans(): Promise<PlanConfig[]> {
    return this.prisma.planConfig.findMany({
      orderBy: { price: 'asc' }
    });
  }

  async getAdminPlans(): Promise<PlanConfig[]> {
    return this.prisma.planConfig.findMany({
      orderBy: { price: 'asc' }
    });
  }

  async updatePlan(
    tier: PlanTier,
    data: {
      name?: string;
      description?: string;
      price?: number;
      campaignLimit?: number;
      cvCredits?: number;
      smartFillCredits?: number;
      features?: string[];
    }
  ): Promise<PlanConfig> {
    const plan = await this.prisma.planConfig.findUnique({
      where: { tier }
    });

    if (!plan) {
      throw new NotFoundException(`Plan with tier ${tier} not found`);
    }

    return this.prisma.planConfig.update({
      where: { tier },
      data
    });
  }
}
