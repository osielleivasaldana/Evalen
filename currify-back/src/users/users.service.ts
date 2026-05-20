import { Injectable, NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
  ) { }

  async create(createUserDto: CreateUserDto, currentUserId: string) {
    const { email, password, name, company, role } = createUserDto;

    // Get current user to check permissions
    const currentUser = await this.prisma.user.findUnique({
      where: { id: currentUserId },
    });

    if (!currentUser) {
      throw new ForbiddenException('Current user not found');
    }

    // Validate role-based user creation permissions
    if (currentUser.role === UserRole.ADMIN) {
      // ADMIN (Administrador de empresa) can ONLY create RECRUITER and TECHNICAL_REVIEWER users
      if (role !== UserRole.RECRUITER && role !== UserRole.TECHNICAL_REVIEWER) {
        throw new ForbiddenException('Administrators can only create RECRUITER and TECHNICAL_REVIEWER users');
      }
    } else if (currentUser.role === UserRole.RECRUITER) {
      // RECRUITER can only create RECRUITER and TECHNICAL_REVIEWER
      if (role !== UserRole.RECRUITER && role !== UserRole.TECHNICAL_REVIEWER) {
        throw new ForbiddenException('Recruiters can only create RECRUITER and TECHNICAL_REVIEWER users');
      }
    } else if (currentUser.role === UserRole.TECHNICAL_REVIEWER) {
      // TECHNICAL_REVIEWER cannot create any users
      throw new ForbiddenException('Technical reviewers cannot create users');
    }
    // ADMIN can create any role (no restriction)

    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    // Enforce one ADMIN per company constraint
    if (role === UserRole.ADMIN) {
      const existingAdmin = await this.prisma.user.findFirst({
        where: {
          company: company || currentUser.company,
          role: UserRole.ADMIN,
        },
      });

      if (existingAdmin) {
        throw new ConflictException('This company already has an administrator. Only one ADMIN is allowed per company.');
      }
    }

    // Generate activation token
    const activationToken = crypto.randomBytes(32).toString('hex');
    const activationExpiry = new Date();
    activationExpiry.setHours(activationExpiry.getHours() + 48); // Token expires in 48 hours

    // Hash password if provided (for direct creation), otherwise null
    const hashedPassword = password ? await bcrypt.hash(password, 10) : null;

    const user = await this.prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        company: company || currentUser.company, // Use current user's company if not provided
        role: role as UserRole,
        isActive: false,
        activationToken,
        activationExpiry,
      },
      select: {
        id: true,
        email: true,
        name: true,
        company: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Send activation email
    try {
      await this.emailService.sendActivationEmail(email, name, activationToken);
      console.log(`[USERS] Activation email sent to ${email}`);
    } catch (error) {
      console.error(`[USERS] Failed to send activation email to ${email}:`, error);
      // Don't throw error, user was created successfully
    }

    return user;
  }

  async findAll(company?: string) {
    const where: any = {};
    if (company) {
      where.company = company;
    }

    return this.prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        name: true,
        company: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        company: true,
        role: true,
        createdAt: true,
        updatedAt: true,
        plan: true,
        cvCredits: true,
        campaignLimit: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async update(id: string, updateUserDto: UpdateUserDto, currentUserId: string, currentUserRole: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Allow role update if it's the onboarding process/wizard
    if (id === currentUserId && updateUserDto.role && !updateUserDto.onboardingCompleted) {
      throw new ForbiddenException('You cannot change your own role');
    }

    // Non-OWNER users cannot assign ADMIN or OWNER roles to anyone, unless they already have that role and it is not changing
    if (currentUserRole !== 'OWNER' && updateUserDto.role && (updateUserDto.role as string) !== (user.role as string)) {
      if ((updateUserDto.role as string) === 'ADMIN' || (updateUserDto.role as string) === 'OWNER') {
        throw new ForbiddenException('Only system owners can assign ADMIN or OWNER roles');
      }
    }

    if (updateUserDto.email && updateUserDto.email !== user.email) {
      const emailExists = await this.prisma.user.findUnique({
        where: { email: updateUserDto.email },
      });

      if (emailExists) {
        throw new ConflictException('Email already in use');
      }
    }

    const updateData: any = {
      email: updateUserDto.email,
      name: updateUserDto.name,
      company: updateUserDto.company,
      role: updateUserDto.role,
    };

    if (updateUserDto.onboardingCompleted !== undefined) {
      updateData.onboardingCompleted = updateUserDto.onboardingCompleted;
    }

    if (updateUserDto.password) {
      updateData.password = await bcrypt.hash(updateUserDto.password, 10);
    }

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        company: true,
        role: true,
        onboardingCompleted: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return updatedUser;
  }

  async remove(id: string, currentUserId: string) {
    if (id === currentUserId) {
      throw new ForbiddenException('You cannot delete your own account');
    }

    const user = await this.prisma.user.findUnique({ where: { id } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.prisma.user.delete({ where: { id } });

    return { message: 'User deleted successfully' };
  }

  async findByCompany(company: string) {
    return this.prisma.user.findMany({
      where: {
        company,
        isActive: true, // Only return active users
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
      },
      orderBy: {
        name: 'asc',
      },
    });
  }

  async updateCompany(userId: string, companyName: string) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        company: companyName,
        onboardingCompleted: true,
      },
      select: {
        id: true,
        email: true,
        name: true,
        company: true,
        role: true,
        onboardingCompleted: true,
        plan: true,
        cvCredits: true,
        campaignLimit: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return user;
  }
}
