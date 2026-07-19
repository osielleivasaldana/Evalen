import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Res,
  UseGuards
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import { Response } from 'express';
import { DocumentsService } from './documents.service';
import { UploadDocumentDto } from './dto/upload-document.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  // Public upload (no auth) — stricter per-IP throttle than the global 100/min.
  // 10 uploads/min/IP limits abuse while still allowing a recruiter visiting a
  // public campaign page to submit a small batch of CVs.
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('upload')
  @UseInterceptors(FileInterceptor('file', {
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB
    },
    fileFilter: (req, file, callback) => {
      if (file.mimetype.match(/\/(pdf|msword|vnd\.openxmlformats-officedocument\.wordprocessingml\.document)$/)) {
        callback(null, true);
      } else {
        callback(new BadRequestException('Only PDF and Word documents are allowed'), false);
      }
    },
  }))
  async uploadDocument(
    @UploadedFile() file: Express.Multer.File,
    @Body() uploadDto: UploadDocumentDto
  ) {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    return this.documentsService.uploadDocument(file, uploadDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('candidate/:candidateId')
  findDocumentsByCandidate(@Param('candidateId') candidateId: string) {
    return this.documentsService.findDocumentsByCandidate(candidateId);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  getDocument(@Param('id') id: string) {
    return this.documentsService.getDocument(id);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id/download')
  async downloadDocument(
    @Param('id') id: string,
    @Res() res: Response
  ) {
    const { buffer, filename, mimeType } = await this.documentsService.downloadDocument(id);

    res.set({
      'Content-Type': mimeType,
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': buffer.length.toString(),
    });

    res.send(buffer);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/reprocess')
  reprocessDocument(@Param('id') id: string) {
    return this.documentsService.reprocessDocument(id);
  }
}