import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthProvider } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  findByEmail(email: string) {
    return this.prisma.user.findFirst({
      where: {
        email,
        deletedAt: null,
      },
    });
  }

  findById(id: string) {
    return this.prisma.user.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    });
  }

  async create(payload: {
    email: string;
    password?: string;
    name?: string;
    provider: AuthProvider;
    providerId?: string;
    avatar?: string;
  }) {
    return this.prisma.user.create({
      data: {
        email: payload.email,
        password: payload.password,
        name: payload.name,
        provider: payload.provider,
        providerId: payload.providerId,
        avatar: payload.avatar,
      },
    });
  }

  createOAuthUser(payload: {
    email: string;
    name?: string;
    avatar?: string;
    provider: 'GOOGLE' | 'GITHUB' | 'FACEBOOK';
    providerId: string;
  }) {
    return this.prisma.user.create({
      data: payload,
    });
  }

  updateOAuthUser(
    id: string,
    payload: {
      name?: string;
      avatar?: string;
      providerId?: string;
    },
  ) {
    return this.prisma.user.update({
      where: { id },
      data: payload,
    });
  }

  softDelete(id: string) {
    return this.prisma.user.update({
      where: { id },
      data: {
        isActive: false,
        deletedAt: new Date(),
      },
    });
  }
}
