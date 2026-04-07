import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleStrategy } from './google.strategy';
import { AuthService } from '../auth.service';

describe('GoogleStrategy', () => {
  let strategy: GoogleStrategy;
  let authService: AuthService;

  const mockAuthService = {
    validateOAuthLogin: jest.fn(),
  };

  const createMockConfig = (values: Record<string, string>) => ({
    get: jest.fn((key: string) => values[key] || undefined),
  });

  beforeEach(async () => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should be defined with valid config', async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          GoogleStrategy,
          { provide: AuthService, useValue: mockAuthService },
          { provide: ConfigService, useValue: createMockConfig({
            GOOGLE_CLIENT_ID: 'test-client-id',
            GOOGLE_CLIENT_SECRET: 'test-client-secret',
            GOOGLE_CALLBACK_URL: 'http://localhost:3001/api/auth/google/callback',
          })},
        ],
      }).compile();

      strategy = module.get<GoogleStrategy>(GoogleStrategy);
      authService = module.get<AuthService>(AuthService);

      expect(strategy).toBeDefined();
    });

    it('should be defined even with missing credentials (uses defaults)', async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          GoogleStrategy,
          { provide: AuthService, useValue: mockAuthService },
          { provide: ConfigService, useValue: createMockConfig({
            GOOGLE_CLIENT_ID: '',
            GOOGLE_CLIENT_SECRET: '',
            GOOGLE_CALLBACK_URL: 'http://localhost:3001/api/auth/google/callback',
          })},
        ],
      }).compile();

      const strat = module.get<GoogleStrategy>(GoogleStrategy);
      expect(strat).toBeDefined();
    });

    it('should use default callback URL when not configured', async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          GoogleStrategy,
          { provide: AuthService, useValue: mockAuthService },
          { provide: ConfigService, useValue: createMockConfig({
            GOOGLE_CLIENT_ID: 'test-client-id',
            GOOGLE_CLIENT_SECRET: 'test-client-secret',
          })},
        ],
      }).compile();

      const strat = module.get<GoogleStrategy>(GoogleStrategy);
      expect(strat).toBeDefined();
    });
  });

  describe('validate', () => {
    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          GoogleStrategy,
          { provide: AuthService, useValue: mockAuthService },
          { provide: ConfigService, useValue: createMockConfig({
            GOOGLE_CLIENT_ID: 'test-client-id',
            GOOGLE_CLIENT_SECRET: 'test-client-secret',
            GOOGLE_CALLBACK_URL: 'http://localhost:3001/api/auth/google/callback',
          })},
        ],
      }).compile();

      strategy = module.get<GoogleStrategy>(GoogleStrategy);
      authService = module.get<AuthService>(AuthService);
    });

    it('should call authService.validateOAuthLogin with correct user data', async () => {
      const profile = {
        id: 'google-123',
        emails: [{ value: 'test@gmail.com' }],
        name: { givenName: 'John', familyName: 'Doe' },
        photos: [{ value: 'https://photo.url' }],
      };

      mockAuthService.validateOAuthLogin.mockResolvedValue({
        user: { id: '1', email: 'test@gmail.com' },
        access_token: 'jwt-token',
      });

      const done = jest.fn();

      await strategy.validate('access-token', 'refresh-token', profile, done);

      expect(mockAuthService.validateOAuthLogin).toHaveBeenCalledWith(
        {
          email: 'test@gmail.com',
          firstName: 'John',
          lastName: 'Doe',
          picture: 'https://photo.url',
          accessToken: 'access-token',
          googleId: 'google-123',
        },
        'google',
      );
      expect(done).toHaveBeenCalledWith(null, {
        user: { id: '1', email: 'test@gmail.com' },
        access_token: 'jwt-token',
      });
    });

    it('should return error when profile has no email', async () => {
      const profile = {
        id: 'google-123',
        emails: [],
        name: { givenName: 'John', familyName: 'Doe' },
        photos: [{ value: 'https://photo.url' }],
      };

      const done = jest.fn();

      await strategy.validate('access-token', 'refresh-token', profile, done);

      expect(done).toHaveBeenCalledWith(
        expect.any(UnauthorizedException),
        false,
      );
      expect(mockAuthService.validateOAuthLogin).not.toHaveBeenCalled();
    });

    it('should handle authService errors and pass them to done', async () => {
      const profile = {
        id: 'google-123',
        emails: [{ value: 'test@gmail.com' }],
        name: { givenName: 'John', familyName: 'Doe' },
        photos: [{ value: 'https://photo.url' }],
      };

      const dbError = new Error('Database connection failed');
      mockAuthService.validateOAuthLogin.mockRejectedValue(dbError);

      const done = jest.fn();

      await strategy.validate('access-token', 'refresh-token', profile, done);

      expect(done).toHaveBeenCalledWith(dbError, false);
    });
  });
});
