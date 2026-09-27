import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RequireAccessKey } from '../auth/require-access-key.decorator';
import { SuratTugasDinasKaryawanService } from './surat-tugas-dinas-karyawan.service';

type AuthRequest = {
  user: { id: number; nrp?: string | null };
};

@Controller('surat-tugas-dinas-karyawan')
@UseGuards(JwtAuthGuard)
@RequireAccessKey('HC_DEKLARASI')
export class SuratTugasDinasKaryawanController {
  constructor(private readonly service: SuratTugasDinasKaryawanService) {}

  @Get()
  daftar(@Req() request: AuthRequest) {
    return this.service.daftar(request.user);
  }

  @Patch(':id/konfirmasi-advance')
  konfirmasiAdvance(
    @Param('id', ParseIntPipe) id: number,
    @Req() request: AuthRequest,
  ) {
    return this.service.konfirmasiAdvance(id, request.user);
  }
}
