import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';

import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() body: RegisterDto, @Req() req: Request) {
    const tokens = await this.authService.register(body, {
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    return {
      message: 'Register success',
      data: tokens,
    };
  }

  @Post('login')
  async login(@Body() body: LoginDto, @Req() req: Request) {
    const tokens = await this.authService.loginWithPassword(body, {
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    return {
      message: 'Login success',
      data: tokens,
    };
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
  async me(@CurrentUser('sub') userId: string) {
    const user = await this.authService.me(userId);

    return {
      message: 'Current user fetched successfully',
      data: user,
    };
  }

  private extractBearerToken(req: Request): string {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Refresh token not found');
    }

    return authHeader.split(' ')[1];
  }
}
