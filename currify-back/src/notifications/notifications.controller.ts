import { Controller, Get, Patch, Delete, Param, Query, Request, UseGuards } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private notificationsService: NotificationsService) {}

  @Get()
  async getNotifications(
    @Request() req: any,
    @Query('unreadOnly') unreadOnly?: string,
  ) {
    return this.notificationsService.getUserNotifications(
      req.user.userId,
      unreadOnly === 'true',
    );
  }

  @Get('unread-count')
  async getUnreadCount(@Request() req: any) {
    const count = await this.notificationsService.getUnreadCount(req.user.userId);
    return { count };
  }

  @Patch(':id/read')
  async markAsRead(@Param('id') id: string, @Request() req: any) {
    return this.notificationsService.markAsRead(id, req.user.userId);
  }

  @Patch('mark-all-read')
  async markAllAsRead(@Request() req: any) {
    return this.notificationsService.markAllAsRead(req.user.userId);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @Request() req: any) {
    return this.notificationsService.delete(id, req.user.userId);
  }
}
