import {
  Body,
  Controller,
  Post,
  Get,
  UseGuards,
  UseFilters,
  Request,
  Res,
  Query,
  Logger,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { SetPasswordDto } from './dto/set-password.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { OAuthExceptionFilter } from './filters/oauth-exception.filter';

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private authService: AuthService) { }

  @Get('check-email')
  async checkEmail(@Query('email') email: string) {
    return this.authService.checkEmail(email);
  }

  @Post('register')
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  async getProfile(@Request() req: any) {
    return this.authService.findUserById(req.user.id);
  }

  @Post('activate')
  async activate(@Body() setPasswordDto: SetPasswordDto) {
    return this.authService.activateAccount(
      setPasswordDto.token,
      setPasswordDto.password,
    );
  }

  @Get('google')
  @UseGuards(AuthGuard('google'))
  async googleAuth(@Request() req: any) { }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  @UseFilters(OAuthExceptionFilter)
  async googleAuthRedirect(@Request() req: any, @Res() res: Response) {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const user = req.user;

    if (!user) {
      this.logger.warn('Google OAuth callback: no user returned from strategy');
      res.redirect(
        `${frontendUrl}/auth/callback?error=authentication_failed&message=${encodeURIComponent('Google authentication failed. Please try again.')}`,
      );
      return;
    }

    const { access_token } = user;
    const isNew = user.onboardingPending || !user.company;

    let redirectUrl = `${frontendUrl}/auth/callback?token=${access_token}&new=${isNew}`;

    if (req.query.state) {
      redirectUrl += `&state=${req.query.state}`;
    }

    res.redirect(redirectUrl);
  }
}