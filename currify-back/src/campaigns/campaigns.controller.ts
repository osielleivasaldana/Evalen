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
import { CampaignsService } from './campaigns.service';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { UpdateCampaignDto } from './dto/update-campaign.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('campaigns')
export class CampaignsController {
  constructor(private readonly campaignsService: CampaignsService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Request() req: any, @Body() createCampaignDto: CreateCampaignDto) {
    return this.campaignsService.create(req.user.id, createCampaignDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  findAll(@Request() req: any) {
    return this.campaignsService.findAll(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('stats')
  getStats(@Request() req: any) {
    return this.campaignsService.getStats(req.user.id);
  }

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

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  remove(@Param('id') id: string, @Request() req: any) {
    return this.campaignsService.remove(id, req.user.id);
  }
}