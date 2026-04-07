import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);
  private readonly maxRetries = 8;
  private readonly baseDelayMs = 2000;

  async onModuleInit() {
    await this.connectWithRetry();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  /**
   * Intenta conectar a la base de datos con reintentos exponenciales con jitter.
   * Esto es crítico en entornos Docker donde PostgreSQL puede tardar
   * más en estar listo que el backend en arrancar.
   *
   * Delays: ~2s, ~4s, ~8s, ~16s, ~32s, ~64s, ~128s, ~256s (con jitter ±25%)
   */
  private async connectWithRetry(): Promise<void> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        await this.$connect();
        this.logger.log(`Database connection established successfully (attempt ${attempt})`);
        return;
      } catch (error) {
        lastError = error as Error;
        this.logger.warn(
          `Database connection attempt ${attempt}/${this.maxRetries} failed: ${lastError.message}`,
        );

        if (attempt < this.maxRetries) {
          // Exponential backoff: baseDelay * 2^(attempt-1) with jitter
          const exponentialDelay = this.baseDelayMs * Math.pow(2, attempt - 1);
          const jitter = exponentialDelay * 0.25 * (Math.random() - 0.5);
          const delay = Math.max(1000, exponentialDelay + jitter);
          this.logger.log(`Retrying in ${(delay / 1000).toFixed(1)}s...`);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    this.logger.error(
      `Failed to connect to database after ${this.maxRetries} attempts. Last error: ${lastError?.message}`,
    );
    throw lastError;
  }
}