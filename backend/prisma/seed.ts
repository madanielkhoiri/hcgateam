// ==================================================
// FILE: backend/prisma/seed.ts
// FUNGSI: Membuat akun admin awal HCGA TEAM
// ==================================================

import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

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
    update: {},
    create: {
      name: 'Administrator',
      username: 'admin',
      passwordHash,
      role: UserRole.ADMIN,
      isActive: true,
    },
  });

  console.log('Akun admin berhasil dibuat');
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