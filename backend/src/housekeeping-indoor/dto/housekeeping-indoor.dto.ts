// ==================================================
// FILE: backend/src/housekeeping-indoor/dto/housekeeping-indoor.dto.ts
// FUNGSI: DTO modul Housekeeping Indoor
// ==================================================

import { IsIn, IsNotEmpty, IsString } from 'class-validator';
import { LokasiHousekeepingIndoor } from '@prisma/client';

export const LOKASI_HOUSEKEEPING_INDOOR: LokasiHousekeepingIndoor[] = [
  'OFFICE',
  'PLANT',
  'CSA_GIBSON',
  'VIEW_POINT',
  'CSA_MONTE_BARU',
  'CSA_MONTE_BARU_SUPPORT',
];

export const LABEL_LOKASI_HOUSEKEEPING_INDOOR: Record<LokasiHousekeepingIndoor, string> = {
  OFFICE: 'Office',
  PLANT: 'Plant',
  CSA_GIBSON: 'CSA Gibson',
  VIEW_POINT: 'View Point',
  CSA_MONTE_BARU: 'CSA Monte Baru',
  CSA_MONTE_BARU_SUPPORT: 'CSA Monte Baru & CSA Support',
};

export class BuatHousekeepingIndoorDto {
  @IsIn(LOKASI_HOUSEKEEPING_INDOOR)
  lokasi: LokasiHousekeepingIndoor;

  @IsString()
  @IsNotEmpty()
  namaPetugas: string;
}
