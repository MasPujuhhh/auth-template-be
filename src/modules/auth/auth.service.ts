import {
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

// type JwtExpiresIn = `${number}${'s' | 'm' | 'h' | 'd'}`;

// export interface AuthTokens {
//   accessToken: string;
//   refreshToken: string;
// }

// export interface TokenPayload {
//   sub: string;
//   email: string;
// }

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

  async login(
    user: { id: string; email: string },
    meta?: { ipAddress?: string; userAgent?: string },
  ): Promise<AuthTokens> {
    const sessionId = crypto.randomUUID();

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
    // BUG FIX 2: Verifikasi JWT dulu sebelum cari session di DB
    // Kalau token palsu/expired, langsung throw tanpa query DB
    const payload = await this.jwtService
      .verifyAsync<TokenPayload>(rawRefreshToken, {
        secret: this.configService.getOrThrow<string>('jwt.refreshSecret'),
      })
      .catch(() => {
        throw new UnauthorizedException('Invalid refresh token');
      });

    // BUG FIX 3: Cari session by userId, bukan findAllByUser (yang sebelumnya
    // tidak dipanggil karena missing argument dan parentheses — bug kritis)
    const sessions = await this.sessionsService.findAllByUser(payload.sub);

    if (!sessions.length) {
      throw new UnauthorizedException('Session not found');
    }

    // BUG FIX 4: Promise.any bisa throw AggregateError jika semua reject —
    // sudah ada .catch(() => null) tapi tetap lebih aman pakai for...of
    // agar tidak ada silent error
    let matchedSession: (typeof sessions)[number] | null = null;

    for (const session of sessions) {
      // BUG FIX 5: Lewati session yang sudah expired sebelum bcrypt.compare
      if (session.expiredAt < new Date()) continue;

      const isMatch = await bcrypt.compare(
        rawRefreshToken,
        session.refreshToken,
      );
      if (isMatch) {
        matchedSession = session;
        break;
      }
    }

    if (!matchedSession) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Rotate: hapus sesi lama, buat sesi baru
    await this.sessionsService.revoke(matchedSession.id);

    const newSessionId = crypto.randomUUID();
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
    if (!user) throw new UnauthorizedException('User not found');
    return user;
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
