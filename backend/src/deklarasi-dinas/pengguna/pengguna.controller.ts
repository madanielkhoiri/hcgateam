import { Controller, Get, Param, UseGuards, UseInterceptors } from '@nestjs/common';

import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { PenggunaService } from './pengguna.service';
import { SnakeCaseInterceptor } from '../bantuan/snake-case.interceptor';

// <--- fitur controller manajemen pengguna --->
// Read-only: dipakai Laporan & Pengajuan Deklarasi Dinas untuk resolve
// nama/nrp karyawan. Pembuatan/ubah akun lewat Manajemen Akun (HC).
@UseInterceptors(SnakeCaseInterceptor)
@Controller('pengguna')
@UseGuards(JwtAuthGuard)
export class PenggunaController {
  constructor(private readonly penggunaService: PenggunaService) {}

  @Get()
  ambilSemuaPengguna() {
    return this.penggunaService.ambilSemuaPengguna();
  }

  @Get(':id')
  ambilPenggunaBerdasarkanId(@Param('id') id: string) {
    return this.penggunaService.ambilPenggunaBerdasarkanId(Number(id));
  }
}
// <--- end --->
