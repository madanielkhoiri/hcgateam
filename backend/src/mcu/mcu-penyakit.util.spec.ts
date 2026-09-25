import { pecahPenyakit } from './mcu-penyakit.util';

describe('pecahPenyakit', () => {
  it('mengembalikan array kosong untuk isian kosong/null/undefined', () => {
    expect(pecahPenyakit(null)).toEqual([]);
    expect(pecahPenyakit(undefined)).toEqual([]);
    expect(pecahPenyakit('   ')).toEqual([]);
  });

  it('satu penyakit apa adanya (spasi berlebih dirapikan)', () => {
    expect(pecahPenyakit('  Diabetes   Melitus ')).toEqual(['Diabetes Melitus']);
  });

  it('memecah beberapa penyakit dipisah koma, titik koma, atau baris baru', () => {
    expect(pecahPenyakit('Hipertensi, Kolesterol; Asam Urat\nAnemia')).toEqual([
      'Hipertensi',
      'Kolesterol',
      'Asam Urat',
      'Anemia',
    ]);
  });

  it('membuang duplikat tanpa peduli huruf besar/kecil, memakai penulisan pertama', () => {
    expect(pecahPenyakit('Hipertensi, HIPERTENSI, hipertensi')).toEqual(['Hipertensi']);
  });

  it('mengabaikan pemisah berurutan dan bagian kosong', () => {
    expect(pecahPenyakit(',, Anemia ,;')).toEqual(['Anemia']);
  });
});
