// ==================================================
// FILE: backend/prisma/seed.ts
// FUNGSI: Membuat akun admin awal HCGA TEAM
// ==================================================

import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { ALL_ACCESS_KEYS, DEFAULT_GUEST_ACCESS_KEYS } from '../src/access/access.constants';

// ==================================================
// CEK DATABASE URL
// ==================================================

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL tidak ditemukan di file backend/.env');
}

// ==================================================
// KONFIGURASI PRISMA 7
// ==================================================

const adapter = new PrismaPg({
  connectionString,
});

const prisma = new PrismaClient({
  adapter,
});

// ==================================================
// PROSES MEMBUAT ADMIN
// ==================================================

async function main(): Promise<void> {
  const passwordHash = await bcrypt.hash('Admin123!', 12);

  await prisma.user.upsert({
    where: {
      username: 'admin',
    },
    update: {
      role: UserRole.ADMIN,
      isActive: true,
      accessKeys: ALL_ACCESS_KEYS,
    },
    create: {
      name: 'Administrator',
      username: 'admin',
      passwordHash,
      role: UserRole.ADMIN,
      isActive: true,
      accessKeys: ALL_ACCESS_KEYS,
    },
  });

  const guestPasswordHash = await bcrypt.hash('Tamu123!', 12);

  await prisma.user.upsert({
    where: {
      username: 'tamu',
    },
    update: {
      role: UserRole.TAMU,
      isActive: true,
      accessKeys: DEFAULT_GUEST_ACCESS_KEYS,
    },
    create: {
      name: 'Tamu Order Pack Meal',
      username: 'tamu',
      passwordHash: guestPasswordHash,
      role: UserRole.TAMU,
      isActive: true,
      accessKeys: DEFAULT_GUEST_ACCESS_KEYS,
    },
  });

  console.log('Akun admin dan akun TAMU berhasil dibuat');
}

// ==================================================
// JALANKAN SEED
// ==================================================

main()
  .catch((error: unknown) => {
    console.error('Seed gagal:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

// ==================================================
// SELESAI: backend/prisma/seed.ts
// ==================================================