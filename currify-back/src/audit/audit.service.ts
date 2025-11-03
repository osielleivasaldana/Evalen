import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface CreateAuditLogDto {
  userId: string;
  action: string;
  entityType: string;
  entityId: string;
  oldValue?: any;
  newValue?: any;
  metadata?: any;
  processInstanceId?: string;
  stageInstanceId?: string;
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  async log(data: CreateAuditLogDto) {
    return this.prisma.auditLog.create({
      data: {
        userId: data.userId,
        action: data.action,
        entityType: data.entityType,
        entityId: data.entityId,
        oldValue: data.oldValue || undefined,
        newValue: data.newValue || undefined,
        metadata: data.metadata || undefined,
        processInstanceId: data.processInstanceId,
        stageInstanceId: data.stageInstanceId,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }

  async getByProcess(processInstanceId: string) {
    return this.prisma.auditLog.findMany({
      where: { processInstanceId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getByEntity(entityType: string, entityId: string) {
    return this.prisma.auditLog.findMany({
      where: {
        entityType,
        entityId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getByUser(userId: string, limit = 50) {
    return this.prisma.auditLog.findMany({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}
