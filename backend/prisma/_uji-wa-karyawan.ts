import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, GenderKaryawan } from '@prisma/client';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const dept = await prisma.departemen.findFirst({ where: { namaDepartemen: 'Human Capital' } });
  if (!dept) throw new Error('Departemen Human Capital tidak ditemukan');

  const karyawan = await prisma.karyawan.upsert({
    where: { nik: 'UJIWA0001' },
    update: { noTelepon: '081347311842', gender: GenderKaryawan.LAKI_LAKI, statusKerja: 'AKTIF' },
    create: {
      nik: 'UJIWA0001',
      nama: 'Madaniel',
      gender: GenderKaryawan.LAKI_LAKI,
      departemenId: dept.id,
      jabatan: 'Staff Uji Coba',
      noTelepon: '081347311842',
      statusKerja: 'AKTIF',
    },
  });

  console.log(JSON.stringify({ karyawanId: karyawan.id }));
}

main().finally(() => prisma.$disconnect());
