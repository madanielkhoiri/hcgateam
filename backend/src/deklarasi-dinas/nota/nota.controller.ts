import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import * as fs from 'fs';
import { diskStorage } from 'multer';
import { extname } from 'path';

import { NotaService } from './nota.service';
import { SnakeCaseInterceptor } from '../bantuan/snake-case.interceptor';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';


function pastikanFolderNotaAda() {
  const folder = './uploads/nota';

  if (!fs.existsSync(folder)) {
    fs.mkdirSync(folder, {
      recursive: true,
    });
  }

  return folder;
}

// <--- fitur controller upload nota deklarasi + koreksi per nota --->
@UseInterceptors(SnakeCaseInterceptor)
@Controller('nota')
@UseGuards(JwtAuthGuard)
export class NotaController {
  constructor(private readonly notaService: NotaService) {}

  // <--- menyimpan nominal OCR sementara / koreksi manual --->
  @Post('ocr-sementara/:idNota')
  isiNominalOcrSementara(
    @Param('idNota') idNota: string,
    @Body('nominal') nominal: number,
  ) {
    return this.notaService.isiNominalOcrSementara(
      Number(idNota),
      Number(nominal),
    );
  }
  // <--- end --->

  // <--- update status nota per gambar: setujui / tolak --->
  @Patch(':idNota/status')
  ubahStatusNota(
    @Param('idNota') idNota: string,
    @Body('status_verifikasi') statusVerifikasi: string,
    @Body('alasan_koreksi') alasanKoreksi: string | undefined,
    @Req() req: any,
  ) {
    return this.notaService.ubahStatusNota(
      Number(idNota),
      statusVerifikasi,
      alasanKoreksi,
      req.user,
    );
  }
  // <--- end --->

  // <--- upload gambar nota satu per satu + kategori nota, tanpa batas MB dari kode aplikasi --->
  @Post('upload/:idDeklarasi')
  @UseInterceptors(
    FileInterceptor('file_nota', {
      storage: diskStorage({
        destination: (req, file, callback) => {
          const folder = pastikanFolderNotaAda();

          callback(null, folder);
        },

        filename: (req, file, callback) => {
          const ekstensiAsli = extname(file.originalname).toLowerCase();
          const ekstensiAman = ekstensiAsli || '.jpg';

          const namaUnik = `${Date.now()}-${Math.round(
            Math.random() * 1_000_000,
          )}${ekstensiAman}`;

          callback(null, namaUnik);
        },
      }),

      fileFilter: (req, file, callback) => {
        const tipeDiizinkan = ['image/jpeg', 'image/png', 'image/webp'];

        if (!tipeDiizinkan.includes(file.mimetype)) {
          return callback(
            new Error('File nota harus berupa JPG, PNG, atau WEBP.'),
            false,
          );
        }

        callback(null, true);
      },

      /*
       * Tidak memakai limit fileSize.
       * Upload nota tidak dibatasi MB dari kode aplikasi.
       * Foto tetap dikompres di NotaService.
       */
    }),
  )
  uploadNota(
    @Param('idDeklarasi') idDeklarasi: string,
    @Body('kategori_nota') kategoriNota: string,
    @Body('id_nota_revisi') idNotaRevisi: string,
    @Body('barang_jasa') barangJasa: string,
    @Body('pic_settlement') picSettlement: string,
    @Body('keterangan_settlement') keteranganSettlement: string,
    @Body('jumlah_item_settlement') jumlahItemSettlement: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.notaService.simpanNotaUpload(
      Number(idDeklarasi),
      file,
      kategoriNota,
      Number(idNotaRevisi || 0),
      barangJasa,
      picSettlement,
      keteranganSettlement,
      Number(jumlahItemSettlement || 1),
    );
  }
  // <--- end --->

  // <--- mengambil nota deklarasi --->
  @Get('deklarasi/:idDeklarasi')
  ambilNotaBerdasarkanDeklarasi(@Param('idDeklarasi') idDeklarasi: string) {
    return this.notaService.ambilNotaBerdasarkanDeklarasi(Number(idDeklarasi));
  }
  // <--- end --->

  // <--- menghapus nota --->
  @Delete(':idNota')
  hapusNota(@Param('idNota') idNota: string) {
    return this.notaService.hapusNota(Number(idNota));
  }
  // <--- end --->
}
// <--- end --->