import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { StripeService } from './stripe.service';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
    imports: [ConfigModule, PrismaModule],
    controllers: [PaymentsController],
    providers: [StripeService],
    exports: [StripeService],
})
export class PaymentsModule { }
