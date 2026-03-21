import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface BillingStatus {
  status: 'active' | 'trialing' | 'canceled' | 'past_due' | 'free';
  planId: string;
  planName: string;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  paymentMethod?: {
    brand: string;
    last4: string;
  };
  trial: {
    isActive: boolean;
    daysLeft: number;
  };
  benefits: {
    cvLimit: number;
    campaignLimit: number;
    cvUsed: number;
    activeCampaigns: number;
  };
}

@Injectable()
export class BillingService {
  constructor(private prisma: PrismaService) {}

  async getBillingStatus(userId: string): Promise<BillingStatus> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        plan: true,
        stripeStatus: true,
        trialEndsAt: true,
        stripeCustomerId: true,
        cvCredits: true,
        campaignLimit: true,
        _count: {
          select: {
            campaigns: {
              where: { status: 'ACTIVE' }
            }
          }
        }
      }
    });

    if (!user) {
      throw new Error('User not found');
    }

    const plan = user.plan || 'FREE';
    const isTrialing = user.trialEndsAt && new Date(user.trialEndsAt) > new Date();
    const trialDaysLeft = isTrialing
      ? Math.ceil((new Date(user.trialEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      : 0;

    let status: BillingStatus['status'] = 'free';
    if (plan === 'PRO') {
      if (isTrialing) {
        status = 'trialing';
      } else if (user.stripeStatus === 'ACTIVE') {
        status = 'active';
      } else if (user.stripeStatus === 'PAST_DUE') {
        status = 'past_due';
      } else if (user.stripeStatus === 'CANCELED') {
        status = 'canceled';
      } else {
        status = 'active';
      }
    }

    const planName = plan === 'PRO' ? 'Pro Mensual' : 'Gratis';

    return {
      status,
      planId: plan === 'PRO' ? 'pro_monthly' : 'free',
      planName,
      currentPeriodEnd: user.trialEndsAt?.toISOString() || null,
      cancelAtPeriodEnd: false,
      paymentMethod: user.stripeCustomerId ? {
        brand: 'visa',
        last4: '0000'
      } : undefined,
      trial: {
        isActive: isTrialing,
        daysLeft: trialDaysLeft
      },
      benefits: {
        cvLimit: plan === 'PRO' ? 999 : (user.cvCredits || 3),
        campaignLimit: plan === 'PRO' ? 999 : (user.campaignLimit || 1),
        cvUsed: 0,
        activeCampaigns: user._count.campaigns
      }
    };
  }
}
