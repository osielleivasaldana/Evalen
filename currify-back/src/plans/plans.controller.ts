import { Controller, Get, Put, Body, Param, UseGuards } from '@nestjs/common';
import { PlansService } from './plans.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { PlanTier } from '@prisma/client';

@Controller('plans')
export class PlansController {
  constructor(private readonly plansService: PlansService) {}

  @Get()
  getPublicPlans() {
    return this.plansService.getPublicPlans();
  }

  @Get('admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OWNER')
  getAdminPlans() {
    return this.plansService.getAdminPlans();
  }

  @Put('admin/:tier')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OWNER')
  updatePlan(
    @Param('tier') tier: PlanTier,
    @Body() body: {
      name?: string;
      description?: string;
      price?: number;
      campaignLimit?: number;
      cvCredits?: number;
      smartFillCredits?: number;
      features?: string[];
    }
  ) {
    return this.plansService.updatePlan(tier, body);
  }
}
