import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import * as fs from 'fs';
import { diskStorage } from 'multer';
import { extname } from 'path';

import { BuatSaldoDto } from './buat-saldo.dto';
import { SaldoService } from './saldo.service';
import { SnakeCaseInterceptor } from '../bantuan/snake-case.interceptor';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';


function pastikanFolderPengembalianAda() {
  const folder = './uploads/pengembalian';

  if (!fs.existsSync(folder)) {
    fs.mkdirSync(folder, {
      recursive: true,
    });
  }

  return folder;
}

function namaFileUnik(prefix: string, namaAsli: string) {
  const ekstensiAsli = extname(namaAsli).toLowerCase();
  const ekstensiAman = ekstensiAsli || '.jpg';

  return `${prefix}-${Date.now()}-${Math.round(
    Math.random() * 1_000_000,
  )}${ekstensiAman}`;
}

function filterFileGambar(
  file: {
    mimetype: string;
  },
  callback: (error: Error | null, acceptFile: boolean) => void,
) {
  const tipeDiizinkan = ['image/jpeg', 'image/png', 'image/webp'];

  if (!tipeDiizinkan.includes(file.mimetype)) {
    return callback(
      new Error('File bukti pengembalian harus berupa JPG, PNG, atau WEBP.'),
      false,
    );
  }

  callback(null, true);
}

// <--- fitur controller saldo karyawan + bukti pengembalian --->
@UseInterceptors(SnakeCaseInterceptor)
@Controller('saldo')
@UseGuards(JwtAuthGuard)
export class SaldoController {
  constructor(private readonly saldoService: SaldoService) {}

  @Post()
  buatSaldo(@Body() data: BuatSaldoDto) {
    return this.saldoService.buatSaldo(data);
  }

  @Get()
  ambilSemuaSaldo() {
    return this.saldoService.ambilSemuaSaldo();
  }

  @Get('pengguna/:idPengguna')
  ambilSaldoBerdasarkanPengguna(@Param('idPengguna') idPengguna: string) {
    return this.saldoService.ambilSaldoBerdasarkanPengguna(Number(idPengguna));
  }

  @Get('pengguna/:idPengguna/aktif')
  ambilSaldoAktifPengguna(@Param('idPengguna') idPengguna: string) {
    return this.saldoService.ambilSaldoAktifPengguna(Number(idPengguna));
  }

  // <--- upload bukti pengembalian saldo sisa oleh karyawan --->
  @Post(':idSaldo/upload-bukti-pengembalian')
  @UseInterceptors(
    FileInterceptor('file_bukti_pengembalian', {
      storage: diskStorage({
        destination: (req, file, callback) => {
          const folder = pastikanFolderPengembalianAda();

          callback(null, folder);
        },

        filename: (req, file, callback) => {
          callback(
            null,
            namaFileUnik('bukti-pengembalian', file.originalname),
          );
        },
      }),

      fileFilter: (req, file, callback) => {
        filterFileGambar(file, callback);
      },

      /*
       * Tidak memakai limit fileSize.
       * Bukti pengembalian tetap auto compress di service.
       */
    }),
  )
  uploadBuktiPengembalian(
    @Param('idSaldo') idSaldo: string,
    @Body('nominal_pengembalian') nominalPengembalian: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.saldoService.uploadBuktiPengembalian(
      Number(idSaldo),
      file,
      Number(nominalPengembalian),
    );
  }
  // <--- end --->

  // <--- admin / FA setujui atau tolak bukti pengembalian --->
  @Patch(':idSaldo/bukti-pengembalian/status')
  ubahStatusBuktiPengembalian(
    @Param('idSaldo') idSaldo: string,
    @Body('status_bukti_pengembalian') statusBuktiPengembalian: string,
    @Body('alasan_bukti_pengembalian_ditolak')
    alasanBuktiPengembalianDitolak?: string,
  ) {
    return this.saldoService.ubahStatusBuktiPengembalian(
      Number(idSaldo),
      statusBuktiPengembalian,
      alasanBuktiPengembalianDitolak,
    );
  }
  // <--- end --->

  @Get(':idSaldo')
  ambilSaldoBerdasarkanId(@Param('idSaldo') idSaldo: string) {
    return this.saldoService.ambilSaldoBerdasarkanId(Number(idSaldo));
  }
}
// <--- end --->