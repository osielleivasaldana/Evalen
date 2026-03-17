import { Injectable, CanActivate, ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class UsageGuard implements CanActivate {
    constructor(
        private reflector: Reflector,
        private prisma: PrismaService
    ) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const requiredCredits = this.reflector.get<number>('requiredCredits', context.getHandler());

        // If no credits required, allow access
        if (!requiredCredits) {
            return true;
        }

        const request = context.switchToHttp().getRequest();
        const user = request.user;

        if (!user) {
            return false;
        }

        // Fetch latest user state including credits
        const dbUser = await this.prisma.user.findUnique({
            where: { id: user.id }
        });

        if (!dbUser) {
            return false;
        }

        // Admins or Enterprise might bypass limits? 
        // For now, let's enforce strictly based on credits.

        if (dbUser.cvCredits < requiredCredits) {
            throw new HttpException({
                status: HttpStatus.PAYMENT_REQUIRED,
                error: 'Insufficient credits',
                message: 'You have run out of credits. Please upgrade your plan.',
                code: 'INSUFFICIENT_CREDITS'
            }, HttpStatus.PAYMENT_REQUIRED);
        }

        return true;
    }
}
