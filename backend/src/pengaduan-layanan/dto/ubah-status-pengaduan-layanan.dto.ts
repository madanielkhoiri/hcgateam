import { StatusPengaduan } from '@prisma/client';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

/** Aksi admin hanya boleh memindahkan status ke salah satu dari 3 ini — tidak bisa kembali ke MENUNGGU lewat endpoint ini. */
export const STATUS_PENGADUAN_DAPAT_DIUBAH = [
  StatusPengaduan.DISETUJUI,
  StatusPengaduan.DITAHAN,
  StatusPengaduan.DITOLAK,
] as const;

export class UbahStatusPengaduanLayananDto {
  @IsIn(STATUS_PENGADUAN_DAPAT_DIUBAH)
  status: (typeof STATUS_PENGADUAN_DAPAT_DIUBAH)[number];

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  catatanAdmin?: string;
}
