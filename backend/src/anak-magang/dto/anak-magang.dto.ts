// ==================================================
// FILE: backend/src/anak-magang/dto/anak-magang.dto.ts
// FUNGSI: Validasi request Database Anak Magang (R & D)
// ==================================================

import {
  IsDateString,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class BuatAnakMagangDto {
  @IsOptional()
  @IsString()
  @MaxLength(60)
  nrp?: string;

  @IsString()
  @IsNotEmpty({ message: 'Nama wajib diisi' })
  @MaxLength(150)
  nama: string;

  @IsOptional()
  @IsIn(['MALE', 'FEMALE'])
  gender?: 'MALE' | 'FEMALE';

  @IsOptional()
  @IsString()
  @MaxLength(200)
  universitas?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  jurusan?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  maritalStatus?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  agama?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  departemen?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  jabatan?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  posisi?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  tempatLahir?: string;

  @IsOptional()
  @IsDateString()
  tanggalLahir?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  pendidikan?: string;

  @IsOptional()
  @IsDateString()
  tanggalMulai?: string;

  @IsOptional()
  @IsDateString()
  tanggalSelesai?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  noHp?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  noKtp?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  npwp?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  nomorRekening?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  bank?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  namaRekening?: string;

  @IsOptional()
  @IsString()
  alamat?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  site?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5)
  golonganDarah?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  bpjsTk?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  bpjsKesehatan?: string;

  @IsOptional()
  @IsDateString()
  tanggalMcu?: string;

  @IsOptional()
  @IsDateString()
  tanggalPemeriksaan?: string;

  @IsOptional()
  @IsDateString()
  tanggalInduksi?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  ukuranBaju?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  ukuranCelana?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  ukuranSepatu?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  noKk?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  rekomendasi?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  atasanLangsung?: string;

  @IsOptional()
  @IsIn(['AKTIF', 'NONAKTIF'])
  status?: 'AKTIF' | 'NONAKTIF';
}

export class UbahAnakMagangDto extends BuatAnakMagangDto {}
