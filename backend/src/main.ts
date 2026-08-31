// ==================================================
// FILE: backend/src/main.ts
// FUNGSI: Konfigurasi utama backend HCGA TEAM
// ==================================================

import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import helmet from 'helmet';
import { AppModule } from './app.module';

// ==================================================
// HTTPS LOKAL (opsional, dev) — HANYA nyala kalau env HTTPS_LOKAL=1 di-set
// secara eksplisit (bukan otomatis walau file sertifikatnya ada), supaya
// `npm run start:dev` biasa tetap HTTP seperti biasa dan tidak bentrok
// dengan frontend. Dipakai khusus saat mau tes kamera dari HP (kamera
// cuma boleh diakses browser dari secure context). Aktifkan dengan:
//   HTTPS_LOKAL=1 npm run start:dev
// ==================================================

function muatHttpsOptionsLokal() {
  if (process.env.HTTPS_LOKAL !== '1') {
    return undefined;
  }

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
  // SECURITY HEADERS
  // contentSecurityPolicy & crossOriginEmbedderPolicy dimatikan: backend ini
  // API JSON + file host, bukan penyaji halaman HTML untuk dibuka langsung
  // di browser — CSP/COEP browser tidak relevan di sini dan berisiko salah
  // konfigurasi tanpa manfaat nyata. crossOriginResourcePolicy WAJIB
  // 'cross-origin' (bukan default helmet 'same-origin') karena file di
  // uploads/ (PDF, foto) sengaja di-fetch lintas origin oleh frontend
  // Next.js (lihat komentar di app.useStaticAssets di bawah) — kalau
  // dibiarkan default, browser akan blokir semua preview dokumen.
  // ==================================================

  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );

  // Percaya header X-Forwarded-For dari reverse proxy (mis. Nginx di VPS
  // production) — supaya rate limiting membaca IP asli pengunjung, bukan
  // IP proxy-nya sendiri (yang kalau tidak di-set, semua orang akan
  // dianggap 1 IP yang sama dan saling mengunci rate limit-nya).
  app.set('trust proxy', 1);

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

  // Domain production (mis. https://portal.ppa.co.id) — isi lewat FRONTEND_ORIGIN
  // di .env server (boleh lebih dari satu, dipisah koma) begitu domainnya sudah
  // ditentukan. Tanpa ini, situs production TIDAK BISA diakses sama sekali
  // (browser memblokir CORS-nya), walau backend & database-nya sehat.
  const ORIGIN_PRODUCTION = (process.env.FRONTEND_ORIGIN ?? '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  app.enableCors({
    origin: (origin, callback) => {
      if (
        !origin ||
        ORIGIN_DEV_TETAP.includes(origin) ||
        ORIGIN_LAN_REGEX.test(origin) ||
        ORIGIN_PRODUCTION.includes(origin)
      ) {
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
