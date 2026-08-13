import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsString,
  Min,
} from 'class-validator';

// <--- fitur dto buat deklarasi --->
export class BuatDeklarasiDto {
  @IsNotEmpty({
    message: 'ID pengguna wajib diisi.',
  })
  @IsInt({
    message: 'ID pengguna tidak valid.',
  })
  id_pengguna!: number;

  /*
   * Saldo wajib dipilih.
   * Satu saldo hanya boleh terhubung ke satu deklarasi.
   */
  @IsNotEmpty({
    message: 'Saldo wajib dipilih.',
  })
  @IsInt({
    message: 'ID saldo tidak valid.',
  })
  @Min(1, {
    message: 'ID saldo tidak valid.',
  })
  id_saldo!: number;

  @IsNotEmpty({
    message: 'NRP wajib diisi.',
  })
  @IsString({
    message: 'NRP tidak valid.',
  })
  nrp!: string;

  @IsNotEmpty({
    message: 'Nama pengguna wajib diisi.',
  })
  @IsString({
    message: 'Nama pengguna tidak valid.',
  })
  nama_pengguna!: string;

  @IsNotEmpty({
    message: 'Jenis deklarasi wajib dipilih.',
  })
  @IsEnum(
    ['PERJALANAN_DINAS', 'UANG_OPERASIONAL'],
    {
      message: 'Jenis deklarasi tidak valid.',
    },
  )
  jenis_deklarasi!:
    | 'PERJALANAN_DINAS'
    | 'UANG_OPERASIONAL';

  @IsNotEmpty({
    message: 'Tanggal kegiatan wajib diisi.',
  })
  @IsString({
    message: 'Tanggal kegiatan tidak valid.',
  })
  tanggal_kegiatan!: string;

  @IsNotEmpty({
    message: 'Lokasi wajib diisi.',
  })
  @IsString({
    message: 'Lokasi tidak valid.',
  })
  lokasi!: string;

  @IsNotEmpty({
    message: 'Keterangan wajib diisi.',
  })
  @IsString({
    message: 'Keterangan tidak valid.',
  })
  keterangan!: string;

  /*
   * Deklarasi baru selalu mulai dari nol.
   * Field tetap tersedia untuk kompatibilitas,
   * tetapi nilai akhirnya dibatasi minimal nol.
   */
  @IsNumber(
    {},
    {
      message: 'Total nominal tidak valid.',
    },
  )
  @Min(0, {
    message: 'Total nominal tidak boleh negatif.',
  })
  total_nominal: number = 0;
}
// <--- end --->