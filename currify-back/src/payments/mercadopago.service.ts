import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { PlanTier } from '@prisma/client';
import axios from 'axios';

@Injectable()
export class MercadoPagoService {
  private readonly logger = new Logger(MercadoPagoService.name);
  private readonly accessToken: string;
  private readonly isDummy: boolean;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    this.accessToken = this.configService.get<string>('MERCADOPAGO_ACCESS_TOKEN') || '';
    this.isDummy = !this.accessToken || this.accessToken === 'dummy';
    if (this.isDummy) {
      this.logger.warn('MERCADOPAGO_ACCESS_TOKEN not set or set to dummy. Mercado Pago will run in DUMMY mode.');
    }
  }

  async createSubscriptionPreference(userId: string, plan: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error('User not found');

    const targetPlan = await this.prisma.planConfig.findUnique({
      where: { tier: plan as PlanTier }
    });

    if (this.isDummy) {
      this.logger.warn(`[DUMMY_MODE] Simulating Mercado Pago subscription for user ${userId}`);
      
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          plan: 'PRO',
          trialEndsAt: null,
          stripeSubscriptionId: `mock_mp_sub_${Date.now()}`,
          stripeCustomerId: `mock_mp_cust_${userId}`,
          stripeStatus: 'ACTIVE',
          campaignLimit: targetPlan?.campaignLimit ?? 999,
          cvCredits: targetPlan?.cvCredits ?? 999,
          smartFillCredits: targetPlan?.smartFillCredits ?? 999
        },
      });

      return {
        url: `${this.configService.get('FRONTEND_URL') || 'http://localhost:3000'}/dashboard?checkout_success=true`
      };
    }

    try {
      const amount = targetPlan?.price ?? (plan === 'PRO' ? 19990 : 0);
      if (amount <= 0) throw new Error('Invalid plan or price not set');

      const response = await axios.post(
        'https://api.mercadopago.com/preapproval',
        {
          back_url: `${this.configService.get('FRONTEND_URL') || 'http://localhost:3000'}/dashboard?checkout_success=true`,
          reason: `Evalen - Plan ${plan} Mensual`,
          auto_recurring: {
            frequency: 1,
            frequency_type: 'months',
            transaction_amount: amount,
            currency_id: 'CLP',
          },
          payer_email: user.email,
          status: 'pending',
          external_reference: user.id,
        },
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      this.logger.log(`Created preapproval preference: ${response.data.id}`);
      return {
        url: response.data.init_point,
      };
    } catch (error: any) {
      this.logger.error('Error creating Mercado Pago subscription preapproval', error.response?.data || error.message);
      throw new Error(`Mercado Pago preference creation failed: ${error.response?.data?.message || error.message}`);
    }
  }

  async handleWebhook(body: any) {
    this.logger.log(`Received Mercado Pago webhook event: ${JSON.stringify(body)}`);

    const topic = body.type || body.topic;
    const resourceId = body.data?.id || body.resource;

    if (!resourceId) {
      this.logger.warn('Mercado Pago webhook missing resource ID');
      return { received: true };
    }

    if (topic === 'preapproval') {
      await this.processPreapprovalNotification(resourceId);
    } else if (topic === 'authorized_payment') {
      await this.processAuthorizedPaymentNotification(resourceId);
    }

    return { received: true };
  }

  private async processPreapprovalNotification(preapprovalId: string) {
    try {
      this.logger.log(`Fetching preapproval ${preapprovalId} status from Mercado Pago`);
      const response = await axios.get(`https://api.mercadopago.com/preapproval/${preapprovalId}`, {
        headers: { Authorization: `Bearer ${this.accessToken}` },
      });

      const preapproval = response.data;
      const userId = preapproval.external_reference;
      const status = preapproval.status;

      this.logger.log(`Preapproval ${preapprovalId} status is ${status} for user ${userId}`);

      if (!userId) {
        this.logger.warn(`No external_reference (userId) found in preapproval ${preapprovalId}`);
        return;
      }

      if (status === 'authorized') {
        const proPlan = await this.prisma.planConfig.findUnique({
          where: { tier: 'PRO' }
        });
        this.logger.log(`Upgrading user ${userId} to PRO plan`);
        await this.prisma.user.update({
          where: { id: userId },
          data: {
            plan: 'PRO',
            trialEndsAt: null,
            stripeSubscriptionId: preapproval.id,
            stripeCustomerId: preapproval.payer_id ? String(preapproval.payer_id) : `mp_${preapproval.payer_email}`,
            stripeStatus: 'ACTIVE',
            campaignLimit: proPlan?.campaignLimit ?? 999,
            cvCredits: proPlan?.cvCredits ?? 999,
            smartFillCredits: proPlan?.smartFillCredits ?? 999
          },
        });
      } else if (status === 'cancelled' || status === 'cancelled_by_payer' || status === 'cancelled_by_collector') {
        const freePlan = await this.prisma.planConfig.findUnique({
          where: { tier: 'FREE' }
        });
        this.logger.log(`Downgrading user ${userId} to FREE plan`);
        await this.prisma.user.update({
          where: { id: userId },
          data: {
            plan: 'FREE',
            stripeStatus: 'CANCELED',
            campaignLimit: freePlan?.campaignLimit ?? 1,
            cvCredits: freePlan?.cvCredits ?? 3,
            smartFillCredits: freePlan?.smartFillCredits ?? 3
          },
        });
      } else if (status === 'paused') {
        this.logger.log(`Pausing subscription for user ${userId}`);
        await this.prisma.user.update({
          where: { id: userId },
          data: {
            stripeStatus: 'PAST_DUE',
          },
        });
      }
    } catch (error: any) {
      this.logger.error(`Error processing preapproval ${preapprovalId}`, error.response?.data || error.message);
    }
  }

  private async processAuthorizedPaymentNotification(authorizedPaymentId: string) {
    try {
      this.logger.log(`Fetching authorized payment ${authorizedPaymentId} status from Mercado Pago`);
      const response = await axios.get(`https://api.mercadopago.com/authorized_payments/${authorizedPaymentId}`, {
        headers: { Authorization: `Bearer ${this.accessToken}` },
      });

      const payment = response.data;
      const preapprovalId = payment.preapproval_id;
      if (preapprovalId) {
        await this.processPreapprovalNotification(preapprovalId);
      }
    } catch (error: any) {
      this.logger.error(`Error processing authorized payment ${authorizedPaymentId}`, error.response?.data || error.message);
    }
  }
}
