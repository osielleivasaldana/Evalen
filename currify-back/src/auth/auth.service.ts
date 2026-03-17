import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) { }

  async register(registerDto: RegisterDto) {
    const { email, password, name, company } = registerDto;

    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Default role is always ADMIN as requested
    const role = 'ADMIN';

    console.log(`[AUTH] Registering user ${email} with role: ${role}`);

    const user = await this.prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        company,
        role: 'ADMIN', // Always ADMIN
      },
      select: {
        id: true,
        email: true,
        name: true,
        company: true,
        role: true,
        createdAt: true,
        cvCredits: true,
        campaignLimit: true,
        plan: true,
      },
    });

    console.log(`[AUTH] User created with role: ${user.role}`);

    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      company: user.company,
      plan: user.plan,
      cvCredits: user.cvCredits,
      campaignLimit: user.campaignLimit
    };
    const token = this.jwtService.sign(payload);

    return {
      user,
      access_token: token,
    };
  }

  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.password) {
      throw new UnauthorizedException('Please activate your account first');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      company: user.company,
      plan: user.plan,
      cvCredits: user.cvCredits,
      campaignLimit: user.campaignLimit
    };
    const token = this.jwtService.sign(payload);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        company: user.company,
        role: user.role,
        plan: user.plan,
        cvCredits: user.cvCredits,
        campaignLimit: user.campaignLimit,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
      access_token: token,
    };
  }

  async findUserById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        company: true,
        role: true,
        plan: true,
        cvCredits: true,
        campaignLimit: true,
        createdAt: true,
      },
    });

    if (!user) return null;

    // Count active campaigns for this user (SaaS Limit Check)
    const activeCampaignsCount = await this.prisma.campaign.count({
      where: {
        userId: user.id,
        status: 'ACTIVE' // Explicit string or use Enum if imported
      }
    });

    return {
      ...user,
      activeCampaignsCount
    };
  }

  async activateAccount(token: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { activationToken: token },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid activation token');
    }

    if (user.activationExpiry && user.activationExpiry < new Date()) {
      throw new UnauthorizedException('Activation token has expired');
    }

    if (user.isActive) {
      throw new ConflictException('Account is already active');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const updatedUser = await this.prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        isActive: true,
        activationToken: null,
        activationExpiry: null,
      },
      select: {
        id: true,
        email: true,
        name: true,
        company: true,
        role: true,
        createdAt: true,
      },
    });

    const payload = { sub: updatedUser.id, email: updatedUser.email, role: updatedUser.role, company: updatedUser.company };
    const jwtToken = this.jwtService.sign(payload);

    return {
      user: updatedUser,
      access_token: jwtToken,
    };
  }


  async validateOAuthLogin(profile: any, provider: string) {
    const { email, firstName, lastName, googleId } = profile;

    // 1. Check if user exists by email
    let user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      // 2. If not, create new user (Onboarding PENDING)
      console.log(`[AUTH] Creating new user from ${provider}: ${email}`);
      user = await this.prisma.user.create({
        data: {
          email,
          name: `${firstName} ${lastName}`,
          role: 'ADMIN', // Default for SaaS Signups
          isActive: true, // Social login is auto-verified
          socialProvider: provider,
          socialId: googleId,
          // Password is null for social users
        },
      });
    } else {
      // 3. If exists, update social ID if needed
      if (!user.socialId) {
        await this.prisma.user.update({
          where: { id: user.id },
          data: { socialProvider: provider, socialId: googleId }
        });
      }
    }

    // 4. Generate JWT
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      company: user.company,
      onboardingPending: !user.company, // Flag for frontend redirection
      plan: user.plan,
      cvCredits: user.cvCredits,
      campaignLimit: user.campaignLimit
    };

    return {
      user,
      access_token: this.jwtService.sign(payload)
    };
  }
}