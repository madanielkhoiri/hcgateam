import { GRUP_LAPORAN, GRUP_TERKELOLA, susunDataTps3r } from './tps3r-rincian';

describe('susunDataTps3r', () => {
  it('total kategori = jumlah rincian; rincian kosong (null) dihitung 0', () => {
    const data = susunDataTps3r(
      { organikMakanan: 239, organikTaman: null, reuseKertas: 534, reusePlastik: 114, reuseLainnya: 76, beratResidu: 30 },
      GRUP_LAPORAN,
      ['beratResidu'],
    );
    expect(data).toMatchObject({
      organikMakanan: 239,
      organikTaman: null,
      beratOrganik: 239,
      beratReuse: 724,
      beratRecycle: 0,
      beratResidu: 30,
    });
  });

  it('data lama: rincian tidak dikirim -> total lama tidak diubah', () => {
    const lama = { beratOrganik: 50, beratReuse: 20, beratRecycle: 10, beratResidu: 5 };
    const data = susunDataTps3r({ beratResidu: 7 }, GRUP_LAPORAN, ['beratResidu'], lama);
    expect(data).toEqual({ beratResidu: 7 });
  });

  it('ubah sebagian rincian: rincian lain diambil dari data lama', () => {
    const lama = { organikMakanan: 10, organikTaman: 5, beratOrganik: 15 };
    const data = susunDataTps3r({ organikTaman: 8 }, GRUP_LAPORAN, ['beratResidu'], lama);
    expect(data).toEqual({ organikTaman: 8, beratOrganik: 18 });
  });

  it('penanganan: anorganik masuk beratRecycle dan beratReuse di-nol-kan', () => {
    const data = susunDataTps3r(
      { tanganiKompos: 12, tanganiTpsNavaraha: 40, tanganiBankSampah: 5.5, beratResidu: 3 },
      GRUP_TERKELOLA,
      ['beratReuse', 'beratResidu'],
    );
    expect(data).toMatchObject({ beratOrganik: 12, beratRecycle: 45.5, beratReuse: 0, beratResidu: 3 });
  });
});
