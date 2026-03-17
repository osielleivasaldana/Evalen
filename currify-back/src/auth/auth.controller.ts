import { Body, Controller, Post, Get, UseGuards, Request, Res } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { SetPasswordDto } from './dto/set-password.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) { }

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
  async googleAuthRedirect(@Request() req: any, @Res() res: any) {
    const { access_token, user } = req.user;

    // Check if new user (onboarding pending)
    const isNew = user.onboardingPending || !user.company;

    // Redirect to Frontend
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const redirectUrl = `${frontendUrl}/auth/callback?token=${access_token}&new=${isNew}`;

    res.redirect(redirectUrl);
  }
}