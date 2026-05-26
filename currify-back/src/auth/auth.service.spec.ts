import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';

jest.mock('bcryptjs');

describe('AuthService', () => {
  let service: AuthService;
  let prisma: PrismaService;
  let jwtService: JwtService;

  const mockPrisma = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    campaign: {
      count: jest.fn(),
    },
    planConfig: {
      findUnique: jest.fn(),
    },
    candidate: {
      count: jest.fn(),
    },
  };

  const mockJwtService = {
    sign: jest.fn().mockReturnValue('mock-jwt-token'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prisma = module.get<PrismaService>(PrismaService);
    jwtService = module.get<JwtService>(JwtService);

    mockPrisma.planConfig.findUnique.mockResolvedValue(null);
    mockPrisma.candidate.count.mockResolvedValue(0);

    jest.clearAllMocks();
  });

  describe('checkEmail', () => {
    it('should return exists: false when user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const result = await service.checkEmail('nonexistent@test.com');

      expect(result).toEqual({ exists: false });
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'nonexistent@test.com' },
        select: { id: true, socialProvider: true, password: true },
      });
    });

    it('should return exists: true with local provider when user has password', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: '1',
        socialProvider: null,
        password: 'hashed123',
      });

      const result = await service.checkEmail('user@test.com');

      expect(result).toEqual({ exists: true, authProvider: 'local' });
    });

    it('should return exists: true with google provider when user has socialProvider', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: '1',
        socialProvider: 'google',
        password: null,
      });

      const result = await service.checkEmail('google@test.com');

      expect(result).toEqual({ exists: true, authProvider: 'google' });
    });
  });

  describe('register', () => {
    it('should register a new user successfully', async () => {
      const registerDto = {
        email: 'new@test.com',
        password: 'password123',
        name: 'Test User',
        company: 'Test Corp',
      };

      mockPrisma.user.findUnique.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');
      mockPrisma.user.create.mockResolvedValue({
        id: '1',
        email: 'new@test.com',
        name: 'Test User',
        company: 'Test Corp',
        role: 'ADMIN',
        createdAt: new Date(),
        cvCredits: 0,
        campaignLimit: 5,
        plan: 'FREE',
      });

      const result = await service.register(registerDto);

      expect(bcrypt.hash).toHaveBeenCalledWith('password123', 10);
      expect(mockPrisma.user.create).toHaveBeenCalled();
      expect(result).toHaveProperty('access_token');
      expect(result).toHaveProperty('user');
    });

    it('should throw ConflictException when email already registered', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: '1', email: 'existing@test.com' });

      await expect(
        service.register({
          email: 'existing@test.com',
          password: 'password123',
          name: 'Test',
          company: 'Corp',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('login', () => {
    it('should login successfully with valid credentials', async () => {
      const loginDto = { email: 'user@test.com', password: 'password123' };

      mockPrisma.user.findUnique.mockResolvedValue({
        id: '1',
        email: 'user@test.com',
        password: 'hashed-password',
        name: 'Test User',
        company: 'Test Corp',
        role: 'ADMIN',
        plan: 'FREE',
        cvCredits: 0,
        campaignLimit: 5,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.login(loginDto);

      expect(result).toHaveProperty('access_token', 'mock-jwt-token');
      expect(result.user).toHaveProperty('email', 'user@test.com');
    });

    it('should throw UnauthorizedException when user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.login({ email: 'nobody@test.com', password: 'pass' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when user has no password (social login)', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: '1',
        email: 'social@test.com',
        password: null,
      });

      await expect(
        service.login({ email: 'social@test.com', password: 'pass' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when password is invalid', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: '1',
        email: 'user@test.com',
        password: 'hashed-password',
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.login({ email: 'user@test.com', password: 'wrong' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('validateOAuthLogin', () => {
    it('should create a new user when email does not exist', async () => {
      const profile = {
        email: 'newgoogle@test.com',
        firstName: 'John',
        lastName: 'Doe',
        googleId: 'google-123',
      };

      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({
        id: '1',
        email: 'newgoogle@test.com',
        name: 'John Doe',
        role: 'ADMIN',
        isActive: true,
        socialProvider: 'google',
        socialId: 'google-123',
        company: null,
        plan: 'FREE',
        cvCredits: 0,
        campaignLimit: 5,
      });

      const result = await service.validateOAuthLogin(profile, 'google');

      expect(mockPrisma.user.create).toHaveBeenCalledWith({
        data: {
          email: 'newgoogle@test.com',
          name: 'John Doe',
          role: 'ADMIN',
          isActive: true,
          socialProvider: 'google',
          socialId: 'google-123',
        },
      });
      expect(result).toHaveProperty('access_token');
      expect(result).toHaveProperty('user');
    });

    it('should return existing user when email already exists', async () => {
      const profile = {
        email: 'existing@test.com',
        firstName: 'Jane',
        lastName: 'Doe',
        googleId: 'google-456',
      };

      mockPrisma.user.findUnique.mockResolvedValue({
        id: '2',
        email: 'existing@test.com',
        name: 'Jane Doe',
        role: 'ADMIN',
        company: 'Existing Corp',
        socialId: 'google-456',
        plan: 'PRO',
        cvCredits: 10,
        campaignLimit: 20,
      });

      const result = await service.validateOAuthLogin(profile, 'google');

      expect(mockPrisma.user.create).not.toHaveBeenCalled();
      expect(result).toHaveProperty('access_token');
    });

    it('should update socialId when existing user has no socialId', async () => {
      const profile = {
        email: 'local-to-google@test.com',
        firstName: 'Bob',
        lastName: 'Smith',
        googleId: 'google-789',
      };

      const existingUser = {
        id: '3',
        email: 'local-to-google@test.com',
        name: 'Bob Smith',
        socialId: null,
        company: 'Some Corp',
        role: 'ADMIN',
        plan: 'FREE',
        cvCredits: 0,
        campaignLimit: 5,
      };

      mockPrisma.user.findUnique.mockResolvedValue(existingUser);
      mockPrisma.user.update.mockResolvedValue({
        ...existingUser,
        socialProvider: 'google',
        socialId: 'google-789',
      });

      await service.validateOAuthLogin(profile, 'google');

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: '3' },
        data: { socialProvider: 'google', socialId: 'google-789' },
      });
    });
  });

  describe('activateAccount', () => {
    it('should activate account with valid token', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: '1',
        email: 'pending@test.com',
        name: 'Pending User',
        company: null,
        role: 'ADMIN',
        isActive: false,
        activationToken: 'valid-token',
        activationExpiry: new Date(Date.now() + 86400000),
        createdAt: new Date(),
      });
      (bcrypt.hash as jest.Mock).mockResolvedValue('new-hashed-password');
      mockPrisma.user.update.mockResolvedValue({
        id: '1',
        email: 'pending@test.com',
        name: 'Pending User',
        company: null,
        role: 'ADMIN',
        createdAt: new Date(),
      });

      const result = await service.activateAccount('valid-token', 'newPassword123');

      expect(result).toHaveProperty('access_token');
      expect(result.user).toHaveProperty('email', 'pending@test.com');
    });

    it('should throw UnauthorizedException when token is invalid', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.activateAccount('invalid-token', 'password'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when token is expired', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: '1',
        isActive: false,
        activationToken: 'expired-token',
        activationExpiry: new Date(Date.now() - 86400000),
      });

      await expect(
        service.activateAccount('expired-token', 'password'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw ConflictException when account is already active', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: '1',
        isActive: true,
        activationToken: 'valid-token',
        activationExpiry: new Date(Date.now() + 86400000),
      });

      await expect(
        service.activateAccount('valid-token', 'password'),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('findUserById', () => {
    it('should return user with active campaigns count', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: '1',
        email: 'user@test.com',
        name: 'Test User',
        company: 'Test Corp',
        role: 'ADMIN',
        plan: 'PRO',
        cvCredits: 10,
        campaignLimit: 20,
        onboardingCompleted: true,
        createdAt: new Date(),
      });
      mockPrisma.campaign.count.mockResolvedValue(3);

      const result = await service.findUserById('1');

      expect(result).toHaveProperty('id', '1');
      expect(result).toHaveProperty('activeCampaignsCount', 3);
    });

    it('should return null when user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const result = await service.findUserById('nonexistent');

      expect(result).toBeNull();
    });
  });
});
