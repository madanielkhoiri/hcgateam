import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import {
  ALL_ACCESS_KEYS,
  DEFAULT_GUEST_ACCESS_KEYS,
  sanitizeAccessKeys,
} from '../src/access/access.constants';

const CIVIL_PROJECT_ACCESS_KEYS = sanitizeAccessKeys([
  'CIVIL_PROJECT_TENDER',
  'CIVIL_PROJECT_KONTRAK',
]);

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
      accessKeys: ['HC'],
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
      accessKeys: ['HC'],
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

  await prisma.user.upsert({
    where: {
      username: 'owner',
    },
    update: {
      role: UserRole.OWNER,
      isActive: true,
      accessKeys: CIVIL_PROJECT_ACCESS_KEYS,
      passwordHash: universalPasswordHash,
    },
    create: {
      name: 'Owner e-ProM',
      username: 'owner',
      passwordHash: universalPasswordHash,
      role: UserRole.OWNER,
      isActive: true,
      accessKeys: CIVIL_PROJECT_ACCESS_KEYS,
    },
  });

  const vendorDemo = await prisma.vendor.upsert({
    where: { id: 1 },
    update: {
      namaVendor: 'PT Vendor Contoh e-ProM',
    },
    create: {
      namaVendor: 'PT Vendor Contoh e-ProM',
      email: 'vendor-demo@eprom.test',
    },
  });

  await prisma.user.upsert({
    where: {
      username: 'vendor',
    },
    update: {
      role: UserRole.VENDOR,
      isActive: true,
      accessKeys: CIVIL_PROJECT_ACCESS_KEYS,
      passwordHash: universalPasswordHash,
      vendorId: vendorDemo.id,
    },
    create: {
      name: 'Vendor Demo',
      username: 'vendor',
      passwordHash: universalPasswordHash,
      role: UserRole.VENDOR,
      isActive: true,
      accessKeys: CIVIL_PROJECT_ACCESS_KEYS,
      vendorId: vendorDemo.id,
    },
  });

  const driverDemo = await prisma.driver.upsert({
    where: { id: 1 },
    update: {
      nama: 'Driver Demo',
    },
    create: {
      nama: 'Driver Demo',
      noTelepon: '081200000000',
    },
  });

  await prisma.user.upsert({
    where: {
      username: 'driver',
    },
    update: {
      role: UserRole.DRIVER,
      isActive: true,
      accessKeys: [],
      passwordHash: universalPasswordHash,
      driverId: driverDemo.id,
    },
    create: {
      name: 'Driver Demo',
      username: 'driver',
      passwordHash: universalPasswordHash,
      role: UserRole.DRIVER,
      isActive: true,
      accessKeys: [],
      driverId: driverDemo.id,
    },
  });

  await prisma.user.upsert({
    where: {
      username: 'elektrik',
    },
    update: {
      role: UserRole.ELEKTRIK,
      isActive: true,
      accessKeys: [],
      passwordHash: universalPasswordHash,
    },
    create: {
      name: 'Elektrik Demo',
      username: 'elektrik',
      passwordHash: universalPasswordHash,
      role: UserRole.ELEKTRIK,
      isActive: true,
      accessKeys: [],
    },
  });

  console.log('Akun superadmin, admin, fa, karyawan, tamu, owner, vendor, driver, dan elektrik berhasil dibuat dengan password universal');
}

main()
  .catch((error: unknown) => {
    console.error('Seed gagal:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
