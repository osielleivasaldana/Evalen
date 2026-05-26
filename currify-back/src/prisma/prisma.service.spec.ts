import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { PrismaService } from './prisma.service';

describe('PrismaService', () => {
  let service: PrismaService;
  let loggerWarnSpy: jest.SpyInstance;
  let loggerLogSpy: jest.SpyInstance;

  beforeEach(async () => {
    jest.useFakeTimers({ doNotFake: ['nextTick'] });
    loggerWarnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
    loggerLogSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {});

    const module: TestingModule = await Test.createTestingModule({
      providers: [PrismaService],
    }).compile();

    service = module.get<PrismaService>(PrismaService);
  });

  afterEach(async () => {
    jest.useRealTimers();
    jest.restoreAllMocks();
    try {
      await service.$disconnect();
    } catch {
      // Ignore disconnect errors in tests
    }
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should have retry configuration', () => {
    expect((service as any).maxRetries).toBe(8);
    expect((service as any).baseDelayMs).toBe(2000);
  });

  describe('onModuleInit', () => {
    beforeEach(() => {
      (service as any).baseDelayMs = 1;
    });

    it('should connect successfully when database is available', async () => {
      const connectSpy = jest.spyOn(service, '$connect').mockResolvedValue(undefined);

      await service.onModuleInit();

      expect(connectSpy).toHaveBeenCalledTimes(1);
      expect(loggerLogSpy).toHaveBeenCalledWith('Database connection established successfully (attempt 1)');
    });

    it('should retry on connection failure and eventually succeed', async () => {
      jest
        .spyOn(service, '$connect')
        .mockRejectedValueOnce(new Error('Connection refused'))
        .mockRejectedValueOnce(new Error('Connection refused'))
        .mockResolvedValue(undefined);

      const promise = service.onModuleInit();

      // Advance timers to trigger retries
      await jest.advanceTimersByTimeAsync(5000);
      await promise;

      expect(service.$connect).toHaveBeenCalledTimes(3);
      expect(loggerWarnSpy).toHaveBeenCalledTimes(2);
      expect(loggerLogSpy).toHaveBeenCalledWith('Database connection established successfully (attempt 3)');
    });

    it('should throw after exhausting all retries', async () => {
      // Use real timers for this test to avoid Jest 30 fake timer issues
      jest.useRealTimers();
      
      const connectionError = new Error('Can\'t reach database server');
      jest.spyOn(service, '$connect').mockRejectedValue(connectionError);
      // Set very small retry delay for fast test
      (service as any).baseDelayMs = 1;

      await expect(service.onModuleInit()).rejects.toThrow('Can\'t reach database server');
      expect(service.$connect).toHaveBeenCalledTimes(8);
      expect(loggerWarnSpy).toHaveBeenCalledTimes(8);
    }, 10000);

    it('should log retry attempts with correct attempt number', async () => {
      jest
        .spyOn(service, '$connect')
        .mockRejectedValueOnce(new Error('ECONNREFUSED'))
        .mockResolvedValue(undefined);

      const promise = service.onModuleInit();
      await jest.advanceTimersByTimeAsync(5000);
      await promise;

      expect(loggerWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('attempt 1/8 failed'),
      );
    });
  });

  describe('onModuleDestroy', () => {
    it('should disconnect from database', async () => {
      const disconnectSpy = jest.spyOn(service, '$disconnect').mockResolvedValue(undefined);

      await service.onModuleDestroy();

      expect(disconnectSpy).toHaveBeenCalledTimes(1);
    });
  });
});
