import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface CreateSessionPayload {
  id?: string;
  userId: string;
  refreshToken: string;
  ipAddress?: string;
  userAgent?: string;
  expiredAt: Date;
}

@Injectable()
export class SessionsService {
  constructor(private readonly prisma: PrismaService) {}

  create(payload: CreateSessionPayload) {
    return this.prisma.session.create({
      data: payload,
    });
  }

  findById(id: string) {
    return this.prisma.session.findUnique({
      where: { id },
    });
  }

  findByRefreshToken(refreshToken: string) {
    return this.prisma.session.findFirst({
      where: { refreshToken },
    });
  }

  findAllByUser(userId: string) {
    return this.prisma.session.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  findAllActiveByUser(userId: string) {
    return this.prisma.session.findMany({
      where: {
        userId,
        expiredAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  isExpired(expiredAt: Date): boolean {
    return expiredAt < new Date();
  }

  updateRefreshToken(id: string, newRefreshToken: string, expiredAt: Date) {
    return this.prisma.session.update({
      where: { id },
      data: {
        refreshToken: newRefreshToken,
        expiredAt,
      },
    });
  }

  revoke(id: string) {
    return this.prisma.session.delete({
      where: { id },
    });
  }

  revokeByRefreshToken(refreshToken: string) {
    return this.prisma.session.delete({
      where: { refreshToken },
    });
  }

  revokeAll(userId: string) {
    return this.prisma.session.deleteMany({
      where: { userId },
    });
  }

  cleanupExpired() {
    return this.prisma.session.deleteMany({
      where: {
        expiredAt: { lt: new Date() },
      },
    });
  }
}
