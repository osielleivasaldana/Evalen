import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface CreateNotificationDto {
  userId: string;
  type: string;
  title: string;
  message: string;
  metadata?: any;
}

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

  async create(data: CreateNotificationDto) {
    return this.prisma.notification.create({
      data: {
        userId: data.userId,
        type: data.type,
        title: data.title,
        message: data.message,
        metadata: data.metadata || undefined,
      },
    });
  }

  async getUserNotifications(userId: string, unreadOnly = false) {
    return this.prisma.notification.findMany({
      where: {
        userId,
        ...(unreadOnly && { read: false }),
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async getUnreadCount(userId: string) {
    return this.prisma.notification.count({
      where: {
        userId,
        read: false,
      },
    });
  }

  async markAsRead(notificationId: string, userId: string) {
    const notification = await this.prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    if (notification.userId !== userId) {
      throw new ForbiddenException('Not your notification');
    }

    return this.prisma.notification.update({
      where: { id: notificationId },
      data: {
        read: true,
        readAt: new Date(),
      },
    });
  }

  async markAllAsRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: {
        userId,
        read: false,
      },
      data: {
        read: true,
        readAt: new Date(),
      },
    });
  }

  async delete(notificationId: string, userId: string) {
    const notification = await this.prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    if (notification.userId !== userId) {
      throw new ForbiddenException('Not your notification');
    }

    return this.prisma.notification.delete({
      where: { id: notificationId },
    });
  }
}
