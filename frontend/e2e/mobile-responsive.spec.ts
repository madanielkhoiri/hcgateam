import { expect, test } from '@playwright/test';
import { RUTE_STATIS } from './rute-statis';

const DASHBOARD_ROUTES = [
  '/administrasi/csr/dashboard',
  '/administrasi/dokumentasi/dashboard',
  '/administrasi/postingan/dashboard',
  '/civil/electric-kip/dashboard',
  '/civil/tps-3r/dashboard',
  '/ga/housekeeping-indoor/dashboard',
  '/ga/inventory/dashboard-inventory',
  '/ga/inventory/mess/dashboard',
  '/ga/inventory/electric/dashboard',
  '/ga/inventory/civil-electric/dashboard',
  '/ga/transport/dashboard',
  '/ga/transport/tiket/dashboard',
  '/ga/transport/travel/dashboard',
  '/hc/admin/dashboard',
  '/hc/anak-magang/dashboard',
  '/hc/helpdesk/dashboard',
  '/hc/ir/dashboard',
  '/hc/karyawan/dashboard',
  '/hc/mcu/dashboard',
  '/hc/pengaduan/dashboard',
  '/hc/surat-balasan-magang/dashboard',
  '/hc/surat-penolakan-magang/dashboard',
  '/hc/tugas-dinas/dashboard',
];

test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

for (const route of DASHBOARD_ROUTES) {
  test(`${route} menyusun card secara utuh di mobile`, async ({ page }) => {
    const response = await page.goto(route, { waitUntil: 'networkidle' });

    expect(response?.status(), `${route} gagal dibuka`).toBeLessThan(400);
    expect(page.url(), `${route} terlempar ke login`).not.toMatch(/\/login(?:\?|$)/);

    const layout = await page.evaluate(() => {
      return {
        viewportWidth: document.documentElement.clientWidth,
        bodyWidth: document.body.scrollWidth,
        bodyHeight: document.body.getBoundingClientRect().height,
        visibleContent: document.body.innerText.trim().length,
        invalidGrids: Array.from(document.querySelectorAll<HTMLElement>('.dashboard-card-grid')).filter((grid) => {
          const children = Array.from(grid.children) as HTMLElement[];
          const gridRect = grid.getBoundingClientRect();
          return children.some((child) => child.getBoundingClientRect().width > gridRect.width + 1);
        }).length,
      };
    });

    expect(layout.bodyWidth, `${route} melebar keluar viewport`).toBeLessThanOrEqual(layout.viewportWidth + 1);
    expect(layout.bodyHeight, `${route} tidak memiliki area konten`).toBeGreaterThan(0);
    expect(layout.visibleContent, `${route} kehilangan isi teks`).toBeGreaterThan(0);
    expect(layout.invalidGrids, `${route} masih memiliki card yang lebih lebar dari grid`).toBe(0);
  });
}

test('konten dashboard Inventory tidak terjepit di bawah header mobile', async ({ page }) => {
  await page.goto('/ga/inventory/dashboard-inventory', { waitUntil: 'networkidle' });

  const periode = page.getByText('Periode Grafik', { exact: true });
  await expect(periode).toBeVisible();
  await periode.scrollIntoViewIfNeeded();

  const box = await periode.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.width).toBeGreaterThan(0);
});

test('semua halaman statis tetap berada di dalam viewport mobile', async ({ page }) => {
  test.setTimeout(180_000);
  const melebar: string[] = [];

  for (const route of RUTE_STATIS) {
    await page.goto(route, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(80);

    const ukuran = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      halaman: document.body.scrollWidth,
    }));

    if (ukuran.halaman > ukuran.viewport + 1) {
      melebar.push(`${route} (${ukuran.halaman}px > ${ukuran.viewport}px)`);
    }
  }

  expect(melebar, `Halaman melebar keluar viewport:\n${melebar.join('\n')}`).toEqual([]);
});
