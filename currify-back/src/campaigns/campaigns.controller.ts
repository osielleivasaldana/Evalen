import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { CampaignsService } from './campaigns.service';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { UpdateCampaignDto } from './dto/update-campaign.dto';
import { SmartFillDto } from './dto/smart-fill.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@Controller('campaigns')
export class CampaignsController {
  constructor(private readonly campaignsService: CampaignsService) { }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'RECRUITER')
  @Post()
  create(@Request() req: any, @Body() createCampaignDto: CreateCampaignDto) {
    return this.campaignsService.create(req.user.id, createCampaignDto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'RECRUITER')
  @Post('generate-draft')
  generateDraft(@Request() req: any, @Body() smartFillDto: SmartFillDto) {
    return this.campaignsService.generateDraft(req.user.id, smartFillDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  findAll(@Request() req: any) {
    return this.campaignsService.findAll(req.user.id, req.user.company);
  }

  @UseGuards(JwtAuthGuard)
  @Get('stats')
  getStats(@Request() req: any) {
    return this.campaignsService.getStats(req.user.id, req.user.company);
  }

  // Public read (no auth) — stricter per-IP throttle to slow publicId enumeration.
  // 30 reads/min/IP is enough for a recruiter previewing the public campaign page
  // but stops someone from iterating publicIds to scrape campaign metadata.
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @Get('public/:publicId')
  findByPublicId(@Param('publicId') publicId: string) {
    return this.campaignsService.findByPublicId(publicId);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  findOne(@Param('id') id: string, @Request() req: any) {
    return this.campaignsService.findOne(id, req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id/stages')
  getStages(@Param('id') id: string, @Request() req: any) {
    return this.campaignsService.getStageTemplates(id, req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Request() req: any,
    @Body() updateCampaignDto: UpdateCampaignDto
  ) {
    return this.campaignsService.update(id, req.user.id, updateCampaignDto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'RECRUITER')
  @Post(':id/rescore-all')
  rescoreAll(@Param('id') id: string, @Request() req: any) {
    return this.campaignsService.rescoreAll(id, req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id/rescore-status')
  getRescoreStatus(@Param('id') id: string, @Request() req: any) {
    return this.campaignsService.getRescoreStatus(id, req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  remove(@Param('id') id: string, @Request() req: any) {
    return this.campaignsService.remove(id, req.user.id);
  }
}