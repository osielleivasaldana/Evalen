import { Controller, Post, Body, UseGuards, Request, BadRequestException, Headers } from '@nestjs/common';
import { StripeService } from './stripe.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('payments')
@UseGuards(JwtAuthGuard)
export class PaymentsController {
    constructor(private readonly stripeService: StripeService) { }

    @Post('create-checkout-session')
    async createCheckoutSession(@Request() req: any, @Body('plan') plan: string) {
        if (!plan) throw new BadRequestException('Plan is required');
        return this.stripeService.createCheckoutSession(req.user.id, plan);
    }

    @Post('webhook')
    @UseGuards() // Disable auth guards for webhook
    async handleWebhook(@Headers('stripe-signature') signature: string, @Body() body: any) { // Body should be Buffer for real Stripe verification, but for dummy we parse JSON. NestJS parses body by default. For real Stripe, we need raw body. 
        // Note: For real Stripe signature verification you need raw body. NestJS setup for raw body is tricky.
        // For 'dummy' flow, we assume body is parsed JSON.
        // Let's stringify it back to buffer-like for the service mock.
        return this.stripeService.handleWebhook(signature, Buffer.from(JSON.stringify(body)));
    }
}
