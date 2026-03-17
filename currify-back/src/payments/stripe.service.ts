import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class StripeService {
    private stripe: Stripe;
    private readonly logger = new Logger(StripeService.name);

    constructor(
        private configService: ConfigService,
        private prisma: PrismaService,
    ) {
        const secretKey = this.configService.get<string>('STRIPE_SECRET_KEY');
        if (!secretKey) {
            this.logger.warn('STRIPE_SECRET_KEY not set. Stripe functionality will be disabled.');
            // Prevent crashing if key is missing during dev, but warn loudly
        }

        this.stripe = new Stripe(secretKey || 'dummy', {
            apiVersion: '2024-12-18.acacia' as any, // Latest stable API version or match your account
        });
    }

    async createCheckoutSession(userId: string, plan: string) {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user) throw new Error('User not found');

        // BYPASS: If dummy mode, upgrade immediately
        if (this.configService.get('STRIPE_SECRET_KEY') === 'dummy') {
            this.logger.warn(`[DUMMY_MODE] Upgrading user ${userId} to ${plan} immediately without Stripe.`);

            await this.prisma.user.update({
                where: { id: userId },
                data: {
                    plan: 'PRO', // Assuming plan is 'PRO' or map it from session.metadata.plan
                    trialEndsAt: null, // End trial if upgrading
                    stripeSubscriptionId: `mock_sub_${Date.now()}`,
                    stripeCustomerId: `mock_cust_${userId}`,
                    stripeStatus: 'ACTIVE',
                    // Reset limits for Pro? Or Keep credits? Best to set High limits.
                    campaignLimit: 999,
                    cvCredits: 999
                }
            });

            return {
                sessionId: 'dummy_session',
                url: `${this.configService.get('FRONTEND_URL')}/dashboard?checkout_success=true`
            };
        }

        // Define Price IDs for your plans (should come from Env or Constants)
        // For now mocking or using Env
        const priceId = this.getPriceIdForPlan(plan);

        if (!priceId) throw new Error('Invalid plan selected');

        const session = await this.stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [
                {
                    price: priceId,
                    quantity: 1,
                },
            ],
            mode: 'subscription',
            success_url: `${this.configService.get('FRONTEND_URL')}/dashboard?checkout_success=true`,
            cancel_url: `${this.configService.get('FRONTEND_URL')}/pricing?checkout_canceled=true`,
            customer_email: user.email,
            metadata: {
                userId: user.id,
                plan: plan,
            },
        });

        return { sessionId: session.id, url: session.url };
    }

    private getPriceIdForPlan(plan: string): string | null {
        // Return Stripe Price IDs based on plan
        // You should put these in .env
        if (plan === 'PRO') return this.configService.get<string>('STRIPE_PRICE_ID_PRO') || '';
        // if (plan === 'ENTERPRISE') return this.configService.get('STRIPE_PRICE_ID_ENTERPRISE');
        return null;
    }

    async handleWebhook(signature: string, payload: Buffer) {
        let event: Stripe.Event;

        if (this.configService.get('STRIPE_SECRET_KEY') === 'dummy') {
            // Mock event construction for testing
            try {
                event = JSON.parse(payload.toString());
            } catch (err) {
                this.logger.error('Webhook payload parse failed', err);
                throw new Error(`Webhook Error: ${err.message}`);
            }
        } else {
            const webhookSecret = (this.configService.get<string>('STRIPE_WEBHOOK_SECRET') || '') as string;
            if (!webhookSecret) {
                throw new Error('STRIPE_WEBHOOK_SECRET is not set');
            }
            try {
                event = this.stripe.webhooks.constructEvent(payload, signature, webhookSecret);
            } catch (err) {
                this.logger.error('Webhook signature verification failed', err);
                throw new Error(`Webhook Error: ${err.message}`);
            }
        }

        if (event.type === 'checkout.session.completed') {
            const session = event.data.object as Stripe.Checkout.Session;
            await this.handleCheckoutSessionCompleted(session);
        }

        return { received: true };
    }

    private async handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
        const userId = session.metadata?.userId;
        const plan = session.metadata?.plan;

        if (!userId || !plan) {
            this.logger.warn('Missing metadata in checkout session', session.id);
            return;
        }

        this.logger.log(`Upgrading user ${userId} to plan ${plan}`);

        await this.prisma.user.update({
            where: { id: userId },
            data: {
                plan: 'PRO', // Assuming plan is 'PRO' or map it from session.metadata.plan
                trialEndsAt: null, // End trial if upgrading
                // You might want to store subscription ID etc.
                stripeSubscriptionId: session.subscription as string,
                stripeCustomerId: session.customer as string,
                stripeStatus: 'ACTIVE'
            }
        });
    }
}
