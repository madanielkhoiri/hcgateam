import type { PortalUser } from '@/lib/access-control';

/** Database Karyawan & QR, Master Alat, dan Riwayat inspeksi hanya untuk Admin. */
export function isAdminPeminjaman(user: PortalUser | null) {
  return user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';
}
