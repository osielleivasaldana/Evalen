import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: AuthService;

  const mockAuthService = {
    checkEmail: jest.fn(),
    register: jest.fn(),
    login: jest.fn(),
    findUserById: jest.fn(),
    activateAccount: jest.fn(),
    validateOAuthLogin: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);

    jest.clearAllMocks();
  });

  describe('checkEmail', () => {
    it('should return email check result', async () => {
      mockAuthService.checkEmail.mockResolvedValue({ exists: true, authProvider: 'google' });

      const result = await controller.checkEmail('test@example.com');

      expect(result).toEqual({ exists: true, authProvider: 'google' });
      expect(mockAuthService.checkEmail).toHaveBeenCalledWith('test@example.com');
    });
  });

  describe('register', () => {
    it('should register a new user', async () => {
      const registerDto = { email: 'new@test.com', password: 'pass123', name: 'Test', company: 'Corp' };
      mockAuthService.register.mockResolvedValue({ user: { id: '1' }, access_token: 'token' });

      const result = await controller.register(registerDto);

      expect(result).toEqual({ user: { id: '1' }, access_token: 'token' });
    });
  });

  describe('login', () => {
    it('should login a user', async () => {
      const loginDto = { email: 'user@test.com', password: 'pass123' };
      mockAuthService.login.mockResolvedValue({ user: { id: '1' }, access_token: 'token' });

      const result = await controller.login(loginDto);

      expect(result).toEqual({ user: { id: '1' }, access_token: 'token' });
    });
  });

  describe('getProfile', () => {
    it('should return user profile', async () => {
      mockAuthService.findUserById.mockResolvedValue({ id: '1', email: 'user@test.com' });

      const result = await controller.getProfile({ user: { id: '1' } });

      expect(result).toEqual({ id: '1', email: 'user@test.com' });
      expect(mockAuthService.findUserById).toHaveBeenCalledWith('1');
    });
  });

  describe('activate', () => {
    it('should activate account', async () => {
      mockAuthService.activateAccount.mockResolvedValue({ user: { id: '1' }, access_token: 'token' });

      const result = await controller.activate({ token: 'activation-token', password: 'newpass' });

      expect(result).toEqual({ user: { id: '1' }, access_token: 'token' });
      expect(mockAuthService.activateAccount).toHaveBeenCalledWith('activation-token', 'newpass');
    });
  });

  describe('googleAuth', () => {
    it('should be defined', () => {
      expect(controller.googleAuth).toBeDefined();
    });
  });

  describe('googleAuthRedirect', () => {
    it('should redirect to frontend with token on success', async () => {
      const mockRes = { redirect: jest.fn() } as any;
      const mockReq = {
        user: {
          access_token: 'jwt-token',
          onboardingPending: false,
          company: 'Test Corp',
        },
        query: {},
      };

      await controller.googleAuthRedirect(mockReq, mockRes);

      expect(mockRes.redirect).toHaveBeenCalledWith(
        'http://localhost:3000/auth/callback?token=jwt-token&new=false',
      );
    });

    it('should redirect with new=true when user has no company', async () => {
      const mockRes = { redirect: jest.fn() } as any;
      const mockReq = {
        user: {
          access_token: 'jwt-token',
          onboardingPending: true,
          company: null,
        },
        query: {},
      };

      await controller.googleAuthRedirect(mockReq, mockRes);

      expect(mockRes.redirect).toHaveBeenCalledWith(
        'http://localhost:3000/auth/callback?token=jwt-token&new=true',
      );
    });

    it('should include state parameter in redirect URL', async () => {
      const mockRes = { redirect: jest.fn() } as any;
      const mockReq = {
        user: {
          access_token: 'jwt-token',
          onboardingPending: false,
          company: 'Test Corp',
        },
        query: { state: 'return-to-dashboard' },
      };

      await controller.googleAuthRedirect(mockReq, mockRes);

      expect(mockRes.redirect).toHaveBeenCalledWith(
        'http://localhost:3000/auth/callback?token=jwt-token&new=false&state=return-to-dashboard',
      );
    });

    it('should redirect with error when no user is returned', async () => {
      const mockRes = { redirect: jest.fn() } as any;
      const mockReq = {
        user: null,
        query: {},
      };

      await controller.googleAuthRedirect(mockReq, mockRes);

      expect(mockRes.redirect).toHaveBeenCalledWith(
        expect.stringContaining('error=authentication_failed'),
      );
    });

    it('should use custom FRONTEND_URL when defined', async () => {
      const originalEnv = process.env.FRONTEND_URL;
      process.env.FRONTEND_URL = 'https://myapp.com';

      const mockRes = { redirect: jest.fn() } as any;
      const mockReq = {
        user: {
          access_token: 'jwt-token',
          onboardingPending: false,
          company: 'Corp',
        },
        query: {},
      };

      await controller.googleAuthRedirect(mockReq, mockRes);

      expect(mockRes.redirect).toHaveBeenCalledWith(
        'https://myapp.com/auth/callback?token=jwt-token&new=false',
      );

      process.env.FRONTEND_URL = originalEnv;
    });
  });
});
