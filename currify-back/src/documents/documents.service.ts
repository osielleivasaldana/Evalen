import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { ScoringService } from '../scoring/scoring.service';
import { UploadDocumentDto } from './dto/upload-document.dto';
import { ProcessingStatus } from '@prisma/client';
import * as path from 'path';
import * as fs from 'fs';
import axios from 'axios';
import FormData = require('form-data');

@Injectable()
export class DocumentsService {
  private readonly coreServiceUrl: string;

  constructor(
    private prisma: PrismaService,
    private scoringService: ScoringService,
    private configService: ConfigService,
  ) {
    this.coreServiceUrl = this.configService.get<string>('SCORING_SERVICE_URL') || 'http://currify-core:8000';
  }

  async uploadDocument(
    file: Express.Multer.File,
    uploadDto: UploadDocumentDto
  ) {
    const { campaignPublicId, candidateName, candidateEmail, candidatePhone } = uploadDto;

    const campaign = await this.prisma.campaign.findUnique({
      where: { publicId: campaignPublicId },
    });

    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    if (campaign.status !== 'ACTIVE') {
      throw new BadRequestException('Campaign is not active');
    }

    const timestamp = Date.now();
    const fileName = `${timestamp}_${file.originalname}`;
    const uploadsDir = path.join(process.cwd(), 'uploads');

    // Ensure uploads directory exists
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const filePath = path.join(uploadsDir, fileName);

    try {
      // 1. Check if user has credits
      const user = await this.prisma.user.findUnique({
        where: { id: campaign.userId },
        select: { cvCredits: true, plan: true }
      });

      if (!user) {
        throw new NotFoundException('User owner of campaign not found');
      }

      if (user.cvCredits <= 0) {
        throw new ForbiddenException('Has usado todos tus créditos de evaluación. Mejora tu plan para continuar.');
      }

      fs.writeFileSync(filePath, file.buffer);

      // Decrement credit immediately (safe decrement)
      await this.prisma.user.update({
        where: { id: campaign.userId },
        data: { cvCredits: { decrement: 1 } }
      });

      let candidate = await this.prisma.candidate.findFirst({
        where: {
          campaignId: campaign.id,
          email: candidateEmail || undefined,
        },
      });

      if (!candidate) {
        candidate = await this.prisma.candidate.create({
          data: {
            campaignId: campaign.id,
            name: candidateName,
            email: candidateEmail,
            phone: candidatePhone,
            processingStatus: ProcessingStatus.PENDING,
          },
        });
      }

      const document = await this.prisma.document.create({
        data: {
          originalName: file.originalname,
          fileName,
          filePath,
          mimeType: file.mimetype,
          fileSize: file.size,
          candidateId: candidate.id,
          processingStatus: ProcessingStatus.PENDING,
        },
      });

      this.processDocumentAsync(document.id);

      return {
        message: 'Document uploaded successfully',
        documentId: document.id,
        candidateId: candidate.id,
      };

    } catch (error) {
      console.error('[DOCUMENTS] Upload failed:', error);
      throw new BadRequestException(`Failed to upload document: ${error.message}`);
    }
  }

  private async processDocumentAsync(documentId: string) {
    try {
      await this.prisma.document.update({
        where: { id: documentId },
        data: { processingStatus: ProcessingStatus.PROCESSING },
      });

      const document = await this.prisma.document.findUnique({
        where: { id: documentId },
        include: { candidate: true },
      });

      if (!document) return;

      const extractedData = await this.extractDataFromDocument(document.filePath);

      await this.prisma.$transaction(async (tx) => {
        await tx.document.update({
          where: { id: documentId },
          data: {
            processingStatus: ProcessingStatus.COMPLETED,
            extractedText: extractedData.rawText,
          },
        });

        if (document.candidate) {
          await tx.candidate.update({
            where: { id: document.candidate.id },
            data: {
              structuredData: extractedData.structuredData,
              // processingStatus remains PROCESSING until scoring is done
              name: extractedData.structuredData.datos_cv?.datos_contacto?.nombre_completo || document.candidate.name,
              email: extractedData.structuredData.datos_cv?.datos_contacto?.email || document.candidate.email,
              phone: extractedData.structuredData.datos_cv?.datos_contacto?.telefono || document.candidate.phone,
            },
          });
        }
      });

      // Calculate scoring after successful extraction
      try {
        if (document.candidate) {
          console.log(`[SCORING_START] Triggering scoring for candidate ${document.candidate.id}`);
          await this.scoringService.evaluateCandidate(document.candidate.id);
          console.log(`[SCORING_SUCCESS] Scoring completed for candidate ${document.candidate.id}`);
        }
      } catch (scoringError) {
        console.error('[SCORING_ERROR] Error calculating candidate score:', scoringError);
        // We log it but don't fail the process
      }

      // FINAL STEP: Mark candidate as COMPLETED only after scoring attempt
      if (document.candidate) {
        await this.prisma.candidate.update({
          where: { id: document.candidate.id },
          data: { processingStatus: ProcessingStatus.COMPLETED }
        });
      }

    } catch (error) {
      console.error('Error processing document:', error);

      await this.prisma.document.update({
        where: { id: documentId },
        data: { processingStatus: ProcessingStatus.FAILED },
      });

      if (document && (document as any).candidate) {
        await this.prisma.candidate.update({
          where: { id: (document as any).candidate.id },
          data: { processingStatus: ProcessingStatus.FAILED },
        });
      }
    }
  }

  private tokenCache: string | null = null;
  private tokenExpiry: number = 0;

  private async getCoreServiceToken(): Promise<string> {
    const now = Date.now();
    if (this.tokenCache && now < this.tokenExpiry) {
      return this.tokenCache;
    }

    try {
      const response = await axios.post(`${this.coreServiceUrl}/auth/login`, {
        username: 'kinich',
        password: 'kinich!'
      }, {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });

      const token = response.data.access_token as string;
      this.tokenCache = token;
      // Token usually lasts 60 mins, refresh after 50 mins
      this.tokenExpiry = now + (50 * 60 * 1000);
      return token;
    } catch (error) {
      console.error('Error getting token from core service:', error);
      throw new Error('Failed to authenticate with core service');
    }
  }

  private async extractDataFromDocument(filePath: string): Promise<{
    rawText: string;
    structuredData: any;
  }> {
    try {
      if (!fs.existsSync(filePath)) {
        throw new Error('File not found');
      }

      // Get fresh token from core service
      const token = await this.getCoreServiceToken();

      const formData = new FormData();
      formData.append('file', fs.createReadStream(filePath));

      const response = await axios.post(`${this.coreServiceUrl}/resume/extract`, formData, {
        headers: {
          ...formData.getHeaders(),
          'Authorization': `Bearer ${token}`
        },
        timeout: 120000, // 120 seconds timeout
      });

      return {
        rawText: response.data.datos_cv?.resumen_profesional?.resumen || 'Extracted text not available',
        structuredData: response.data
      };

    } catch (error) {
      console.error('Error calling external CV extraction service:', error);

      // Fallback to mock data if external service fails
      const mockStructuredData = {
        datos_cv: {
          datos_contacto: {
            nombre_completo: "Processing Error",
            telefono: null,
            email: null,
            ubicacion: null,
            metadata: null
          },
          titular_profesional: {
            titular: "Error en procesamiento",
            metadata: null
          },
          resumen_profesional: {
            resumen: "Error al procesar el CV. Por favor, inténtelo de nuevo más tarde.",
            metadata: null
          },
          experiencia_laboral: [],
          formacion_academica: [],
          habilidades: {
            habilidades_tecnicas: [],
            idiomas: [],
            habilidades_blandas: [],
            metadata: null
          },
          perfiles_online: null,
          formacion_complementaria: null,
          reconocimientos: null,
          actividades_extracurriculares: null,
          intereses: null,
          metadata_procesamiento: null
        },
        confianza_general: 0.0,
        advertencias: ["Error en el procesamiento del CV"],
        campos_faltantes: [],
        tiempo_procesamiento: 0,
        timestamp: new Date().toISOString()
      };

      return {
        rawText: 'Error processing document',
        structuredData: mockStructuredData
      };
    }
  }

  async findDocumentsByCandidate(candidateId: string) {
    return this.prisma.document.findMany({
      where: { candidateId },
      select: {
        id: true,
        originalName: true,
        fileName: true,
        mimeType: true,
        fileSize: true,
        processingStatus: true,
        createdAt: true,
      }
    });
  }

  async getDocument(documentId: string) {
    const document = await this.prisma.document.findUnique({
      where: { id: documentId },
      include: {
        candidate: {
          include: {
            campaign: true
          }
        }
      }
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    return document;
  }

  async downloadDocument(documentId: string) {
    const document = await this.getDocument(documentId);

    if (!fs.existsSync(document.filePath)) {
      throw new NotFoundException('File not found on disk');
    }

    const file = fs.readFileSync(document.filePath);

    return {
      buffer: file,
      filename: document.originalName,
      mimeType: document.mimeType
    };
  }

  async reprocessDocument(documentId: string) {
    const document = await this.prisma.document.findUnique({
      where: { id: documentId },
      include: {
        candidate: {
          include: {
            campaign: true
          }
        }
      },
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    if (!fs.existsSync(document.filePath)) {
      throw new NotFoundException('File not found on disk');
    }

    // Reset status to PROCESSING
    await this.prisma.document.update({
      where: { id: documentId },
      data: {
        processingStatus: ProcessingStatus.PROCESSING,
        extractedText: null
      },
    });

    if (document.candidateId) {
      await this.prisma.candidate.update({
        where: { id: document.candidateId },
        data: { processingStatus: ProcessingStatus.PROCESSING },
      });

      // Delete existing scoring to recalculate
      await this.prisma.candidateScoring.deleteMany({
        where: { candidateId: document.candidateId },
      });
    }

    // Process the document asynchronously (will trigger scoring again)
    this.processDocumentAsync(documentId);

    return {
      message: 'Document reprocessing started',
      documentId: document.id,
      candidateId: document.candidateId,
    };
  }
}