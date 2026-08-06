// ==================================================
// FILE: backend/src/main.ts
// FUNGSI: Konfigurasi utama backend HCGA TEAM
// ==================================================

import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'node:path';
import { AppModule } from './app.module';

// ==================================================
// BOOTSTRAP APLIKASI
// ==================================================

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.useStaticAssets(join(process.cwd(), 'uploads'), {
    prefix: '/uploads/',
  });

  // ==================================================
  // PREFIX SEMUA ENDPOINT
  // Contoh: http://localhost:3001/api/auth/login
  // ==================================================

  app.setGlobalPrefix('api');

  // ==================================================
  // IZINKAN FRONTEND NEXT.JS
  // ==================================================

  app.enableCors({
    origin: ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002', 'http://localhost:3011', 'http://localhost:3012'],
    credentials: true,
  });

  // ==================================================
  // VALIDASI DATA REQUEST
  // ==================================================

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // ==================================================
  // JALANKAN BACKEND DI PORT 3001
  // ==================================================

  const port = process.env.PORT ?? 3001;

  await app.listen(port);

  console.log(`HCGA TEAM API berjalan di http://localhost:${port}/api`);
}

// ==================================================
// START APLIKASI
// ==================================================

void bootstrap();

// ==================================================
// SELESAI: backend/src/main.ts
// ==================================================
