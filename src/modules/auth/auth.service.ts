import {
  ConflictException,
  Injectable,
  UnauthorizedException,
  //   InternalServerErrorException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { SessionsService } from '../sessions/sessions.service';
import { AuthTokens, JwtExpiresIn, TokenPayload } from './auth.types';
import { randomUUID } from 'crypto';
import { AuthProvider } from '@prisma/client';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly sessionsService: SessionsService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  // ─── Token Generation ──────────────────────────────────────────────────────

  async generateTokens(
    userId: string,
    email: string,
    sessionId: string,
  ): Promise<AuthTokens> {
    const payload: TokenPayload = { sub: userId, email, sessionId };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.getOrThrow<string>('jwt.accessSecret'),
        expiresIn: this.configService.getOrThrow<JwtExpiresIn>(
          'jwt.accessExpiresIn',
        ),
      }),
      this.jwtService.signAsync(payload, {
        secret: this.configService.getOrThrow<string>('jwt.refreshSecret'),
        expiresIn: this.configService.getOrThrow<JwtExpiresIn>(
          'jwt.refreshExpiresIn',
        ),
      }),
    ]);

    return { accessToken, refreshToken };
  }

  // ─── Session Management ────────────────────────────────────────────────────

  private async createSession(payload: {
    id: string;
    userId: string;
    refreshToken: string;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<void> {
    const hashedRefreshToken = await bcrypt.hash(payload.refreshToken, 10);

    // BUG FIX 1: Ambil expiry dari config, bukan hardcode 7 hari
    const refreshExpiresIn = this.configService.getOrThrow<string>(
      'jwt.refreshExpiresIn',
    );
    const expiredAt = this.parseExpiresIn(refreshExpiresIn);

    await this.sessionsService.create({
      id: payload.id,
      userId: payload.userId,
      refreshToken: hashedRefreshToken,
      ipAddress: payload.ipAddress,
      userAgent: payload.userAgent,
      expiredAt,
    });
  }

  // ─── Auth Operations ───────────────────────────────────────────────────────

  async register(
    payload: { email: string; password: string; name?: string },
    meta?: { ipAddress?: string; userAgent?: string },
  ): Promise<AuthTokens> {
    const existingUser = await this.usersService.findByEmail(payload.email);

    if (existingUser && !existingUser.deletedAt) {
      throw new ConflictException('Email already registered');
    }

    const hashedPassword = await bcrypt.hash(payload.password, 10);

    const user = await this.usersService.create({
      email: payload.email,
      password: hashedPassword,
      name: payload.name,
      provider: AuthProvider.LOCAL,
    });

    return this.login(
      {
        id: user.id,
        email: user.email,
      },
      meta,
    );
  }

  async login(
    user: { id: string; email: string },
    meta?: { ipAddress?: string; userAgent?: string },
  ): Promise<AuthTokens> {
    const sessionId = randomUUID();

    const tokens = await this.generateTokens(user.id, user.email, sessionId);

    await this.createSession({
      id: sessionId,
      userId: user.id,
      refreshToken: tokens.refreshToken,
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
    });

    return tokens;
  }

  async loginWithPassword(
    payload: { email: string; password: string },
    meta?: { ipAddress?: string; userAgent?: string },
  ): Promise<AuthTokens> {
    const user = await this.usersService.findByEmail(payload.email);

    if (!user || !user.password) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isValidPassword = await bcrypt.compare(
      payload.password,
      user.password,
    );

    if (!isValidPassword) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isActive || user.deletedAt) {
      throw new UnauthorizedException('User is inactive');
    }

    return this.login(
      {
        id: user.id,
        email: user.email,
      },
      meta,
    );
  }

  async refresh(
    rawRefreshToken: string,
    meta?: { ipAddress?: string; userAgent?: string },
  ): Promise<AuthTokens> {
    const payload = await this.jwtService
      .verifyAsync<TokenPayload>(rawRefreshToken, {
        secret: this.configService.getOrThrow<string>('jwt.refreshSecret'),
      })
      .catch(() => {
        throw new UnauthorizedException('Invalid refresh token');
      });

    const session = await this.sessionsService.findById(payload.sessionId);

    if (!session || session.userId !== payload.sub) {
      throw new UnauthorizedException('Session not found');
    }

    if (session.expiredAt < new Date()) {
      throw new UnauthorizedException('Refresh token expired');
    }

    const isMatch = await bcrypt.compare(rawRefreshToken, session.refreshToken);

    if (!isMatch) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    await this.sessionsService.revoke(session.id);

    const newSessionId = randomUUID();

    const tokens = await this.generateTokens(
      payload.sub,
      payload.email,
      newSessionId,
    );

    await this.createSession({
      id: newSessionId,
      userId: payload.sub,
      refreshToken: tokens.refreshToken,
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
    });

    return tokens;
  }

  async logout(sessionId: string): Promise<void> {
    await this.sessionsService.revoke(sessionId);
  }

  async logoutAll(userId: string): Promise<void> {
    await this.sessionsService.revokeAll(userId);
  }

  async me(userId: string) {
    const user = await this.usersService.findById(userId);

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      avatar: user.avatar,
      role: user.role,
      provider: user.provider,
      isActive: user.isActive,
      emailVerifiedAt: user.emailVerifiedAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────

  /**
   * Parse string seperti '7d', '24h', '60m' jadi Date expiry.
   * Fallback ke 7 hari jika format tidak dikenali.
   */
  private parseExpiresIn(expiresIn: string): Date {
    const now = new Date();
    const match = expiresIn.match(/^(\d+)(s|m|h|d)$/);

    if (!match) {
      // Fallback aman daripada NaN
      now.setDate(now.getDate() + 7);
      return now;
    }

    const value = parseInt(match[1], 10);
    const unit = match[2];
    const ms = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 }[unit]!;

    return new Date(now.getTime() + value * ms);
  }
}
