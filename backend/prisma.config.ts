// ==================================================
// FILE: backend/prisma.config.ts
// FUNGSI: Konfigurasi Prisma CLI
// ==================================================

import 'dotenv/config';
import { defineConfig, env } from 'prisma/config';

// ==================================================
// KONFIGURASI PRISMA
// ==================================================

export default defineConfig({
  schema: 'prisma/schema.prisma',

  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },

  datasource: {
    url: env('DATABASE_URL'),
  },
});

// ==================================================
// SELESAI: backend/prisma.config.ts
// ==================================================