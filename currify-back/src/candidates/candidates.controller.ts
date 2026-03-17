import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  Request,
  UseGuards,
  Body,
  Patch
} from '@nestjs/common';
import { CandidatesService } from './candidates.service';
import { SearchCandidatesDto } from './dto/search-candidates.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('candidates')
@UseGuards(JwtAuthGuard)
export class CandidatesController {
  constructor(private readonly candidatesService: CandidatesService) { }

  @Get('campaign/:campaignId')
  findAll(
    @Param('campaignId') campaignId: string,
    @Request() req: any,
    @Query() searchDto: SearchCandidatesDto
  ) {
    return this.candidatesService.findAll(campaignId, req.user.id, searchDto);
  }

  @Get('campaign/:campaignId/stats')
  getCandidateStats(
    @Param('campaignId') campaignId: string,
    @Request() req: any
  ) {
    return this.candidatesService.getCandidateStats(campaignId, req.user.id);
  }

  @Get('campaign/:campaignId/export')
  exportCandidates(
    @Param('campaignId') campaignId: string,
    @Request() req: any
  ) {
    return this.candidatesService.exportCandidates(campaignId, req.user.id);
  }

  @Post('campaign/:campaignId/search-by-skills')
  searchBySkills(
    @Param('campaignId') campaignId: string,
    @Request() req: any,
    @Body('skills') skills: string[]
  ) {
    return this.candidatesService.searchBySkills(campaignId, req.user.id, skills);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req: any) {
    return this.candidatesService.findOne(id, req.user.id);
  }

  @Get(':id/structured-data')
  getStructuredData(@Param('id') id: string, @Request() req: any) {
    return this.candidatesService.getStructuredData(id, req.user.id);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req: any) {
    return this.candidatesService.remove(id, req.user.id);
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body('status') status: string,
    @Request() req: any
  ) {
    return this.candidatesService.updateStatus(id, req.user.id, status);
  }
}