import { test, expect } from '@playwright/test';
import { login } from './helpers/auth';

test.describe('Login', () => {
  test('menolak kredensial salah dan menampilkan pesan error', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[placeholder="Masukkan username Anda"]', 'superadmin');
    await page.fill('input[placeholder="Masukkan password Anda"]', 'password-salah');
    await page.click('button[type="submit"], button:has-text("Masuk")');

    await expect(page.getByText('Username / NRP / Email atau password salah')).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);
  });

  test('berhasil login dan diarahkan keluar dari halaman login', async ({ page }) => {
    await login(page, 'superadmin');

    await expect(page).not.toHaveURL(/\/login$/);
  });
});
