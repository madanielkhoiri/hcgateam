import { test, expect } from '@playwright/test';
import { pantauErrorKonsol } from './helpers/auth';
import { RUTE_STATIS } from './rute-statis';

// Smoke test lintas seluruh halaman statis aplikasi (login sebagai superadmin
// yang punya ALL_ACCESS_KEYS — lihat auth.setup.ts). Tujuannya menangkap
// kelas bug yang sudah pernah terjadi nyata di proyek ini: halaman yang lolos
// tsc --noEmit tapi gagal di build/runtime produksi (mis. bug useSearchParams()
// tanpa <Suspense> yang bikin next build gagal total di /civil/project/**).
//
// Ini BUKAN pengganti test alur bisnis (create/update/approve) — itu perlu
// test terpisah per modul kalau mau ditambah nanti. Ini garis pertahanan
// pertama: "apakah halamannya bahkan bisa dibuka tanpa error?"

for (const rute of RUTE_STATIS) {
  test(`halaman ${rute} terbuka tanpa error`, async ({ page }) => {
    const pantauan = pantauErrorKonsol(page);

    const response = await page.goto(rute, { waitUntil: 'networkidle' });

    expect(response, `Navigasi ke ${rute} gagal total`).not.toBeNull();
    expect(response!.status(), `${rute} mengembalikan status HTTP gagal`).toBeLessThan(400);

    // Halaman tidak boleh terlempar balik ke /login (berarti sesi/otorisasi rusak).
    expect(page.url(), `${rute} malah redirect ke /login`).not.toMatch(/\/login(\?|$)/);

    const errorSignifikan = pantauan.errors.filter(
      (pesan) =>
        // Abaikan warning React dev-mode yang tidak relevan dengan kebenaran halaman.
        !pesan.includes('Download the React DevTools'),
    );

    expect(errorSignifikan, `Error konsol di ${rute}:\n${errorSignifikan.join('\n')}`).toEqual([]);
  });
}
