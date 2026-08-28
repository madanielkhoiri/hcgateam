// ==================================================
// FILE: backend/src/main.ts
// FUNGSI: Konfigurasi utama backend HCGA TEAM
// ==================================================

import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { AppModule } from './app.module';

// ==================================================
// HTTPS LOKAL (opsional, dev) — kalau backend\..\certs\dev-{key,cert}.pem
// ada, backend jalan pakai HTTPS self-signed supaya bisa dites di HP
// (kamera cuma boleh diakses browser dari secure context). Tidak wajib
// ada — kalau filenya tidak ditemukan, backend tetap jalan HTTP biasa.
// ==================================================

function muatHttpsOptionsLokal() {
  const keyPath = join(process.cwd(), '..', 'certs', 'dev-key.pem');
  const certPath = join(process.cwd(), '..', 'certs', 'dev-cert.pem');

  if (!existsSync(keyPath) || !existsSync(certPath)) {
    return undefined;
  }

  return {
    key: readFileSync(keyPath),
    cert: readFileSync(certPath),
  };
}

// ==================================================
// BOOTSTRAP APLIKASI
// ==================================================

async function bootstrap() {
  const httpsOptions = muatHttpsOptionsLokal();

  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    ...(httpsOptions ? { httpsOptions } : {}),
  });

  // ==================================================
  // PREFIX SEMUA ENDPOINT
  // Contoh: http://localhost:3001/api/auth/login
  // ==================================================

  app.setGlobalPrefix('api');

  // ==================================================
  // IZINKAN FRONTEND NEXT.JS
  // ==================================================

  const ORIGIN_DEV_TETAP = [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:3002',
    'http://localhost:3011',
    'http://localhost:3012',
    'https://localhost:3000',
    'https://localhost:3001',
  ];

  // Regex jaringan lokal (192.168.x.x / 10.x.x.x / 172.16-31.x.x), http maupun
  // https (HTTPS self-signed dev), supaya HP di WiFi yang sama bisa akses dev
  // server lewat IP LAN komputer saat testing.
  const ORIGIN_LAN_REGEX = /^https?:\/\/(192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}):\d{2,5}$/;

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin || ORIGIN_DEV_TETAP.includes(origin) || ORIGIN_LAN_REGEX.test(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error('Origin tidak diizinkan oleh CORS'));
    },
    credentials: true,
  });

  // Static file harus didaftarkan setelah CORS. PDF.js mengambil dokumen
  // uploads lewat fetch lintas origin (frontend :3000 -> backend :3001).
  app.useStaticAssets(join(process.cwd(), 'uploads'), {
    prefix: '/api/uploads/',
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
  // Port ini hanya boleh digunakan oleh satu proses backend pada saat yang sama.
  // ==================================================

  const port = Number(process.env.PORT ?? 3001);

  await app.listen(port);

  const skema = httpsOptions ? 'https' : 'http';
  console.log(`HCGA TEAM API berjalan di ${skema}://localhost:${port}/api`);
}

// ==================================================
// START APLIKASI
// ==================================================

void bootstrap();

// ==================================================
// SELESAI: backend/src/main.ts
// ==================================================
