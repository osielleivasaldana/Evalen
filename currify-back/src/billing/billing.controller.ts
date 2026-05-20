import { Controller, Get, Post, UseGuards, Request } from '@nestjs/common';
import { BillingService } from './billing.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('billing')
@UseGuards(JwtAuthGuard)
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Get('status')
  async getBillingStatus(@Request() req: any) {
    return this.billingService.getBillingStatus(req.user.id);
  }

  @Post('reset-to-free')
  async resetToFree(@Request() req: any) {
    return this.billingService.resetToFree(req.user.id);
  }
}
