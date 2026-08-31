import { defineConfig, devices } from '@playwright/test';

// ==================================================
// FILE: frontend/playwright.config.ts
// FUNGSI: Konfigurasi E2E smoke test — mengetes aplikasi SUNGGUHAN
// (backend NestJS + frontend Next.js jalan beneran, browser sungguhan)
// untuk menangkap bug integrasi/build yang tidak kelihatan dari
// unit test atau tsc --noEmit (contoh nyata: bug Suspense yang bikin
// next build produksi gagal total, baru ketahuan lewat testing manual).
//
// PRASYARAT sebelum menjalankan `npm run test:e2e`:
// 1. Database backend sudah di-migrate + di-seed (akun superadmin/owner/
//    karyawan dengan password "password123" — lihat backend/prisma/seed.ts).
// 2. Backend sudah di-build (`npm run build` di folder backend) kalau mau
//    testing lawan build produksi asli (disarankan, sama seperti CI).
// ==================================================

const FRONTEND_PORT = 3000;
const BACKEND_PORT = 3001;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  timeout: 30_000,

  use: {
    baseURL: `http://localhost:${FRONTEND_PORT}`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'setup',
      testMatch: /auth\.setup\.ts/,
    },
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'e2e/.auth/superadmin.json',
      },
      dependencies: ['setup'],
      testIgnore: /auth\.setup\.ts|login\.spec\.ts/,
    },
    {
      // login.spec.ts butuh sesi BELUM login — dites sebagai project terpisah
      // tanpa storageState, tidak bergantung pada project 'setup'.
      name: 'chromium-tanpa-sesi',
      use: { ...devices['Desktop Chrome'] },
      testMatch: /login\.spec\.ts/,
    },
  ],

  // Otomatis nyalakan backend + frontend kalau belum jalan (dipakai CI dan
  // developer lokal yang belum start manual). reuseExistingServer supaya
  // developer yang sudah punya `npm run dev`/`npm run start:dev` jalan
  // tidak perlu restart tiap kali menjalankan test.
  webServer: [
    {
      command: 'npm run start:prod --prefix ../backend',
      url: `http://localhost:${BACKEND_PORT}/api`,
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
      stdout: 'pipe',
      stderr: 'pipe',
    },
    {
      command: 'npm run start',
      url: `http://localhost:${FRONTEND_PORT}`,
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
      stdout: 'pipe',
      stderr: 'pipe',
    },
  ],
});
