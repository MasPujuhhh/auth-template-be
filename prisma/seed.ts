import 'dotenv/config';
import * as bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({
  adapter,
});

async function main() {
  const password = await bcrypt.hash('Password123!', 10);

  const admin = await prisma.user.upsert({
    where: {
      email: 'admin@mail.com',
    },
    update: {},
    create: {
      email: 'admin@mail.com',
      name: 'Super Admin',
      password,
      provider: 'LOCAL',
      role: 'ADMIN',
      isActive: true,
    },
  });

  const user = await prisma.user.upsert({
    where: {
      email: 'user@mail.com',
    },
    update: {},
    create: {
      email: 'user@mail.com',
      name: 'Puguh User',
      password,
      provider: 'LOCAL',
      role: 'USER',
      isActive: true,
    },
  });

  console.log('Seed completed');
  console.log({ admin, user });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
