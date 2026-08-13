import { UseInterceptors, Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';

import { BuatPenggunaDto } from './dto/buat-pengguna.dto';
import { EditPenggunaDto } from './dto/edit-pengguna.dto';
import { PenggunaService } from './pengguna.service';
import { SnakeCaseInterceptor } from '../bantuan/snake-case.interceptor';


// <--- fitur controller manajemen pengguna --->
@UseInterceptors(SnakeCaseInterceptor)
@Controller('pengguna')
export class PenggunaController {
  constructor(private readonly penggunaService: PenggunaService) {}

  @Post()
  buatPengguna(@Body() data: BuatPenggunaDto) {
    return this.penggunaService.buatPengguna(data);
  }

  @Get()
  ambilSemuaPengguna() {
    return this.penggunaService.ambilSemuaPengguna();
  }

  @Get(':id')
  ambilPenggunaBerdasarkanId(@Param('id') id: string) {
    return this.penggunaService.ambilPenggunaBerdasarkanId(Number(id));
  }

  @Patch(':id')
  editPengguna(@Param('id') id: string, @Body() data: EditPenggunaDto) {
    return this.penggunaService.editPengguna(Number(id), data);
  }

  @Patch(':id/status')
  ubahStatusPengguna(
    @Param('id') id: string,
    @Body() data: { aktif: boolean },
  ) {
    return this.penggunaService.ubahStatusPengguna(Number(id), data.aktif);
  }
}
// <--- end --->