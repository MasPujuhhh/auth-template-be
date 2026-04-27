import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

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
