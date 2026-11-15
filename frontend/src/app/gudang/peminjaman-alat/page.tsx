import { redirect } from 'next/navigation';

// Peminjaman Alat sekarang modul GA. Alamat lama diarahkan ke sana.
export default function PeminjamanAlatLama() {
  redirect('/ga/peminjaman-alat/monitoring');
}
