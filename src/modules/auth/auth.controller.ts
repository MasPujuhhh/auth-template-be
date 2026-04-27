import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';

import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { LoginDto } from './dto/login.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(@Body() body: LoginDto, @Req() req: Request) {
    return this.authService.loginWithPassword(body, {
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }

  @Post('refresh')
  async refresh(@Req() req: Request) {
    const refreshToken = this.extractBearerToken(req);

    return this.authService.refresh(refreshToken, {
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  async logout(@CurrentUser('sessionId') sessionId: string) {
    await this.authService.logout(sessionId);

    return { message: 'Logged out successfully' };
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout-all')
  async logoutAll(@CurrentUser('sub') userId: string) {
    await this.authService.logoutAll(userId);

    return { message: 'Logged out from all devices successfully' };
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@CurrentUser('sub') userId: string) {
    return this.authService.me(userId);
  }

  private extractBearerToken(req: Request): string {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      throw new Error('Refresh token not found');
    }

    return authHeader.split(' ')[1];
  }
}
