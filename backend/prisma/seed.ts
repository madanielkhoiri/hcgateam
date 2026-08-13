import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { ALL_ACCESS_KEYS, DEFAULT_GUEST_ACCESS_KEYS } from '../src/access/access.constants';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL tidak ditemukan di file backend/.env');
}

const adapter = new PrismaPg({
  connectionString,
});

const prisma = new PrismaClient({
  adapter,
});

async function main(): Promise<void> {
  const universalPasswordHash = await bcrypt.hash('password123', 12);
  
  await prisma.user.upsert({
    where: {
      username: 'superadmin',
    },
    update: {
      role: UserRole.SUPER_ADMIN,
      isActive: true,
      accessKeys: ALL_ACCESS_KEYS,
      passwordHash: universalPasswordHash,
    },
    create: {
      name: 'Super Administrator',
      username: 'superadmin',
      passwordHash: universalPasswordHash,
      role: UserRole.SUPER_ADMIN,
      isActive: true,
      accessKeys: ALL_ACCESS_KEYS,
    },
  });

  await prisma.user.upsert({
    where: {
      username: 'admin',
    },
    update: {
      role: UserRole.ADMIN,
      isActive: true,
      accessKeys: ALL_ACCESS_KEYS,
      passwordHash: universalPasswordHash,
    },
    create: {
      name: 'Administrator',
      username: 'admin',
      passwordHash: universalPasswordHash,
      role: UserRole.ADMIN,
      isActive: true,
      accessKeys: ALL_ACCESS_KEYS,
    },
  });

  await prisma.user.upsert({
    where: {
      username: 'fa',
    },
    update: {
      role: UserRole.FA,
      isActive: true,
      accessKeys: ALL_ACCESS_KEYS,
      passwordHash: universalPasswordHash,
    },
    create: {
      name: 'Finance & Accounting',
      username: 'fa',
      passwordHash: universalPasswordHash,
      role: UserRole.FA,
      isActive: true,
      accessKeys: ALL_ACCESS_KEYS,
    },
  });

  await prisma.user.upsert({
    where: {
      username: 'karyawan',
    },
    update: {
      role: UserRole.KARYAWAN,
      isActive: true,
      accessKeys: ALL_ACCESS_KEYS,
      passwordHash: universalPasswordHash,
      nrp: '12345678',
    },
    create: {
      name: 'Karyawan Biasa',
      username: 'karyawan',
      nrp: '12345678',
      passwordHash: universalPasswordHash,
      role: UserRole.KARYAWAN,
      isActive: true,
      accessKeys: ALL_ACCESS_KEYS,
    },
  });

  await prisma.user.upsert({
    where: {
      username: 'tamu',
    },
    update: {
      role: UserRole.TAMU,
      isActive: true,
      accessKeys: DEFAULT_GUEST_ACCESS_KEYS,
      passwordHash: universalPasswordHash,
    },
    create: {
      name: 'Tamu Order Pack Meal',
      username: 'tamu',
      passwordHash: universalPasswordHash,
      role: UserRole.TAMU,
      isActive: true,
      accessKeys: DEFAULT_GUEST_ACCESS_KEYS,
    },
  });

  console.log('Akun superadmin, admin, fa, karyawan, dan tamu berhasil dibuat dengan password universal');
}

main()
  .catch((error: unknown) => {
    console.error('Seed gagal:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
