import 'dotenv/config';

import { PrismaPg } from '@prisma/adapter-pg';
import {
  ItemCategory,
  ItemUnit,
  PrismaClient,
} from '@prisma/client';
import { Pool } from 'pg';
import * as path from 'node:path';
import * as XLSX from 'xlsx';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL tidak ditemukan di file .env');
}

const pool = new Pool({
  connectionString,
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

type ImportItem = {
  code: string;
  name: string;
  category: ItemCategory;
  unit: ItemUnit;
};

function normalizeName(value: unknown): string {
  return String(value ?? '')
    .trim()
    .replace(/\s+/g, ' ')
    .toUpperCase();
}

function readItemNames(): string[] {
  const filePath = path.resolve(
    process.cwd(),
    'prisma',
    'nama barang.xlsx',
  );

  const workbook = XLSX.readFile(filePath);
  const firstSheetName = workbook.SheetNames[0];

  if (!firstSheetName) {
    throw new Error('Sheet Excel tidak ditemukan');
  }

  const worksheet = workbook.Sheets[firstSheetName];

  const rows = XLSX.utils.sheet_to_json<Array<unknown>>(
    worksheet,
    {
      header: 1,
      defval: '',
    },
  );

  const allValues = rows
    .flat()
    .map(normalizeName)
    .filter((value) => value.length > 0);

  const headerNames = new Set([
    'NO',
    'NOMOR',
    'NAMA BARANG',
    'BARANG',
    'KODE BARANG',
  ]);

  return allValues.filter(
    (value) => !headerNames.has(value),
  );
}

function createImportItems(
  names: string[],
): ImportItem[] {
  const atkLastIndex = names.findIndex(
    (name) => name === 'TEH SARI WANGI',
  );

  const housekeepingLastIndex = names.findIndex(
    (name) => name === 'PLEDGE SPRAY',
  );

  if (atkLastIndex === -1) {
    throw new Error(
      'TEH SARI WANGI tidak ditemukan dalam Excel',
    );
  }

  if (housekeepingLastIndex === -1) {
    throw new Error(
      'PLEDGE SPRAY tidak ditemukan dalam Excel',
    );
  }

  if (housekeepingLastIndex <= atkLastIndex) {
    throw new Error(
      'Urutan TEH SARI WANGI dan PLEDGE SPRAY tidak sesuai',
    );
  }

  let atkNumber = 0;
  let hsNumber = 0;
  let bjNumber = 0;

  return names.map((name, index) => {
    if (index <= atkLastIndex) {
      atkNumber += 1;

      return {
        code: `ATK-${String(atkNumber).padStart(2, '0')}`,
        name,
        category: ItemCategory.ATK,
        unit: ItemUnit.PC,
      };
    }

    if (index <= housekeepingLastIndex) {
      hsNumber += 1;

      return {
        code: `HS-${String(hsNumber).padStart(2, '0')}`,
        name,
        category: ItemCategory.HOUSEKEEPING,
        unit: ItemUnit.PC,
      };
    }

    bjNumber += 1;

    return {
      code: `BJ-${String(bjNumber).padStart(2, '0')}`,
      name,
      category: ItemCategory.BAJU,
      unit: ItemUnit.PC,
    };
  });
}

async function main() {
  const names = readItemNames();
  const items = createImportItems(names);

  for (const itemData of items) {
    const item = await prisma.item.upsert({
      where: {
        inventoryScope_code: {
          inventoryScope: 'GENERAL',
          code: itemData.code,
        },
      },
      update: {
        name: itemData.name,
        category: itemData.category,
        unit: itemData.unit,
      },
      create: {
        inventoryScope: 'GENERAL',
        code: itemData.code,
        name: itemData.name,
        category: itemData.category,
        unit: itemData.unit,
        isActive: true,
      },
    });

    await prisma.inventoryStock.upsert({
      where: {
        itemId: item.id,
      },
      update: {},
      create: {
        itemId: item.id,
        quantity: 0,
      },
    });
  }

  const atkCount = items.filter(
    (item) => item.category === ItemCategory.ATK,
  ).length;

  const hsCount = items.filter(
    (item) =>
      item.category === ItemCategory.HOUSEKEEPING,
  ).length;

  const bjCount = items.filter(
    (item) => item.category === ItemCategory.BAJU,
  ).length;

  console.log('====================================');
  console.log('IMPORT MASTER BARANG BERHASIL');
  console.log(`ATK          : ${atkCount}`);
  console.log(`HOUSEKEEPING : ${hsCount}`);
  console.log(`BAJU         : ${bjCount}`);
  console.log(`TOTAL        : ${items.length}`);
  console.log('STOK AWAL    : 0');
  console.log('SATUAN AWAL  : PC');
  console.log('====================================');
}

main()
  .catch((error: unknown) => {
    console.error('Import gagal:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
