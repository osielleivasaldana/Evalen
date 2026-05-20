import { Controller, Get, Body, Patch, Param, UseGuards } from '@nestjs/common';
import { OwnerService } from './owner.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { PlanTier } from '@prisma/client';

@Controller('owner')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('OWNER')
export class OwnerController {
  constructor(private readonly ownerService: OwnerService) {}

  @Get('dashboard-summary')
  getDashboardSummary() {
    return this.ownerService.getDashboardSummary();
  }

  @Get('llm-stats')
  getLlmStats() {
    return this.ownerService.getLlmStats();
  }

  @Get('users')
  getAllUsers() {
    return this.ownerService.getAllUsers();
  }

  @Patch('users/:id')
  updateUserPlan(
    @Param('id') id: string,
    @Body() body: {
      plan?: PlanTier;
      cvCredits?: number;
      smartFillCredits?: number;
      campaignLimit?: number;
      isActive?: boolean;
    }
  ) {
    return this.ownerService.updateUserPlan(id, body);
  }
}
