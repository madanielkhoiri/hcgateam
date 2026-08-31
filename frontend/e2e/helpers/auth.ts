import { Page, expect } from '@playwright/test';

// Akun seed (backend/prisma/seed.ts) — password universal khusus data dev/CI,
// BUKAN password produksi sungguhan.
export const AKUN_SEED = {
  superadmin: { username: 'superadmin', password: 'password123' },
  admin: { username: 'admin', password: 'password123' },
  owner: { username: 'owner', password: 'password123' },
  karyawan: { username: 'karyawan', password: 'password123' },
} as const;

export type PeranSeed = keyof typeof AKUN_SEED;

/** Login lewat form sungguhan (bukan set cookie manual) supaya alur auth ikut teruji. */
export async function login(page: Page, peran: PeranSeed): Promise<void> {
  const akun = AKUN_SEED[peran];

  await page.goto('/login');
  await page.fill('input[placeholder="Masukkan username Anda"]', akun.username);
  await page.fill('input[placeholder="Masukkan password Anda"]', akun.password);
  // "Ingat saya" wajib dicentang: tanpa ini token disimpan ke sessionStorage,
  // yang TIDAK ikut tersimpan oleh page.context().storageState() (Playwright
  // hanya menangkap localStorage + cookies, bukan sessionStorage) — akibatnya
  // sesi login tidak akan terbawa ke test lain yang reuse storageState ini.
  await page.check('input[type="checkbox"]');
  await Promise.all([
    page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 15_000 }),
    page.click('button[type="submit"], button:has-text("Masuk")'),
  ]);
}

/** Pastikan halaman tidak melempar error runtime React/JS yang tidak tertangani. */
export function pantauErrorKonsol(page: Page): { errors: string[] } {
  const state = { errors: [] as string[] };

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      state.errors.push(`[console] ${msg.text()}`);
    }
  });
  page.on('pageerror', (err) => {
    state.errors.push(`[pageerror] ${err.message}`);
  });

  return state;
}

export async function expectTidakAdaErrorKonsol(errors: string[]): Promise<void> {
  expect(errors, `Ditemukan error konsol:\n${errors.join('\n')}`).toEqual([]);
}
