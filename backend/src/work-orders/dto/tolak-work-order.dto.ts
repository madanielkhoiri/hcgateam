// ==================================================
// FILE: backend/src/work-orders/dto/tolak-work-order.dto.ts
// FUNGSI: Validasi alasan penolakan approval Work Order
// ==================================================

import { IsNotEmpty, IsString } from 'class-validator';

export class TolakWorkOrderDto {
  @IsString()
  @IsNotEmpty({ message: 'Alasan penolakan wajib diisi' })
  alasan: string;
}
