import { UseInterceptors, Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';

import { BuatDeklarasiDto } from './dto/buat-deklarasi.dto';
import { DeklarasiService } from './deklarasi.service';
import { EditDeklarasiDto } from './dto/edit-deklarasi.dto';
import { UbahStatusDeklarasiDto } from './dto/ubah-status-deklarasi.dto';
import { SnakeCaseInterceptor } from '../bantuan/snake-case.interceptor';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';


// <--- fitur controller deklarasi perjalanan dinas --->
@UseInterceptors(SnakeCaseInterceptor)
@Controller('deklarasi')
@UseGuards(JwtAuthGuard)
export class DeklarasiController {
  constructor(private readonly deklarasiService: DeklarasiService) {}

  @Post()
  buatDeklarasi(@Body() data: BuatDeklarasiDto) {
    return this.deklarasiService.buatDeklarasi(data);
  }

  @Get()
  ambilSemuaDeklarasi() {
    return this.deklarasiService.ambilSemuaDeklarasi();
  }

  @Get('admin/ringkasan')
  ambilRingkasanAdmin() {
    return this.deklarasiService.ambilRingkasanAdmin();
  }

  @Get('pengguna/:idPengguna')
  ambilDeklarasiBerdasarkanPengguna(@Param('idPengguna') idPengguna: string) {
    return this.deklarasiService.ambilDeklarasiBerdasarkanPengguna(
      Number(idPengguna),
    );
  }

  @Get(':id')
  ambilDetailDeklarasi(@Param('id') id: string) {
    return this.deklarasiService.ambilDetailDeklarasi(Number(id));
  }

  @Patch(':idDeklarasi/edit')
  editDeklarasi(
    @Param('idDeklarasi') idDeklarasi: string,
    @Body() data: EditDeklarasiDto,
  ) {
    return this.deklarasiService.editDeklarasi(Number(idDeklarasi), data);
  }

  @Patch(':idDeklarasi/ajukan')
  ajukanDeklarasi(@Param('idDeklarasi') idDeklarasi: string) {
    return this.deklarasiService.ajukanDeklarasi(Number(idDeklarasi));
  }

  @Patch(':idDeklarasi/status')
  ubahStatusDeklarasi(
    @Param('idDeklarasi') idDeklarasi: string,
    @Body() data: UbahStatusDeklarasiDto,
  ) {
    return this.deklarasiService.ubahStatusDeklarasi(
      Number(idDeklarasi),
      data,
    );
  }
}
// <--- end --->