import { test as setup } from '@playwright/test';
import { login } from './helpers/auth';

const SUPERADMIN_STATE = 'e2e/.auth/superadmin.json';

setup('login sebagai superadmin', async ({ page }) => {
  await login(page, 'superadmin');
  await page.context().storageState({ path: SUPERADMIN_STATE });
});
