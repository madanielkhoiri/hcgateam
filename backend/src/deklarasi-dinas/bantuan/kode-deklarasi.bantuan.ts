// <--- fitur bantuan membuat kode deklarasi unik --->
export function buatKodeDeklarasi(): string {
  const tanggal = new Date();

  const tahun = tanggal
    .getFullYear()
    .toString();

  const bulan = String(
    tanggal.getMonth() + 1,
  ).padStart(2, '0');

  const hari = String(
    tanggal.getDate(),
  ).padStart(2, '0');

  const karakter =
    'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

  let kodeAcak = '';

  for (
    let index = 0;
    index < 5;
    index += 1
  ) {
    kodeAcak +=
      karakter[
        Math.floor(
          Math.random() *
            karakter.length,
        )
      ];
  }

  return `DKL-${tahun}${bulan}${hari}-${kodeAcak}`;
}
// <--- end --->