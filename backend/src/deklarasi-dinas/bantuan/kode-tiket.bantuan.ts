// <--- fitur generate kode tiket pengguna --->
export function buatKodeTiketPengguna(
  nrp: string,
  nomorTelepon?: string,
): string {
  const nrpBersih = nrp.replace(/[^0-9]/g, '');

  const teleponBersih = nomorTelepon?.replace(/[^0-9]/g, '') || '';
  const empatDigitAkhir = teleponBersih.slice(-4).padStart(4, '0');

  const karakter = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let kodeAcak = '';

  for (let i = 0; i < 4; i++) {
    kodeAcak += karakter.charAt(Math.floor(Math.random() * karakter.length));
  }

  return `TKT-${kodeAcak}-${nrpBersih}-${empatDigitAkhir}`;
}
// <--- end --->