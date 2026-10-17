import { IsBoolean, IsIn, IsNotEmpty, IsString, MaxLength } from 'class-validator';

export const TAHAPAN_PROJECT_TAMBANG = [
  'pengajuanProjectCharter',
  'reviewApprovalAi',
  'pengecekanArea',
  'dokumenProject',
  'kickOffMeeting',
  'pelaksanaan',
  'komisioning',
  'selesai',
] as const;

export type TahapanProjectTambang = (typeof TAHAPAN_PROJECT_TAMBANG)[number];

export class SimpanMonitoringProjectDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(250)
  namaPekerjaan: string;
}

export class UbahTahapanProjectDto {
  @IsIn(TAHAPAN_PROJECT_TAMBANG)
  field: TahapanProjectTambang;

  @IsBoolean()
  value: boolean;
}
