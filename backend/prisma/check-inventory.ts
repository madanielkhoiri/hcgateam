import 'dotenv/config';

import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL tidak ditemukan');
}

const pool = new Pool({
  connectionString,
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      username: true,
      role: true,
      isActive: true,
    },
  });

  const itemCount = await prisma.item.count();
  const stockCount = await prisma.inventoryStock.count();
  const stockInCount = await prisma.stockIn.count();
  const stockOutCount = await prisma.stockOut.count();

  console.log('====================================');
  console.log('USER LOGIN');
  console.table(users);

  console.log('====================================');
  console.log('TABEL INVENTORY');
  console.log(`Master Barang : ${itemCount}`);
  console.log(`Stok Barang   : ${stockCount}`);
  console.log(`Barang Masuk  : ${stockInCount}`);
  console.log(`Barang Keluar : ${stockOutCount}`);
  console.log('====================================');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
