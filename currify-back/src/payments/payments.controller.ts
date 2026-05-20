import { Controller, Post, Body, UseGuards, Request, BadRequestException, Headers } from '@nestjs/common';
import { StripeService } from './stripe.service';
import { MercadoPagoService } from './mercadopago.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ConfigService } from '@nestjs/config';

@Controller('payments')
export class PaymentsController {
    constructor(
        private readonly stripeService: StripeService,
        private readonly mercadoPagoService: MercadoPagoService,
        private readonly configService: ConfigService,
    ) { }

    @UseGuards(JwtAuthGuard)
    @Post('create-checkout-session')
    async createCheckoutSession(@Request() req: any, @Body('plan') plan: string) {
        if (!plan) throw new BadRequestException('Plan is required');

        const gateway = this.configService.get<string>('PAYMENT_GATEWAY') || 
            (this.configService.get<string>('MERCADOPAGO_ACCESS_TOKEN') ? 'mercadopago' : 'stripe');

        if (gateway === 'mercadopago') {
            return this.mercadoPagoService.createSubscriptionPreference(req.user.id, plan);
        } else {
            return this.stripeService.createCheckoutSession(req.user.id, plan);
        }
    }

    @Post('webhook')
    async handleStripeWebhook(@Headers('stripe-signature') signature: string, @Body() body: any) {
        return this.stripeService.handleWebhook(signature, Buffer.from(JSON.stringify(body)));
    }

    @Post('mercadopago/webhook')
    async handleMercadoPagoWebhook(@Body() body: any) {
        return this.mercadoPagoService.handleWebhook(body);
    }
}
