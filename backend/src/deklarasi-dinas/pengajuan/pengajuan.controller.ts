import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UploadedFile,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import {
  FileFieldsInterceptor,
  FileInterceptor,
} from '@nestjs/platform-express';
import * as fs from 'fs';
import { diskStorage } from 'multer';
import { extname } from 'path';

import { BuatPengajuanDto } from './dto/buat-pengajuan.dto';
import { UpdateStatusPengajuanDto } from './dto/update-status-pengajuan.dto';
import { PengajuanService } from './pengajuan.service';
import { SnakeCaseInterceptor } from '../bantuan/snake-case.interceptor';


function pastikanFolderPengajuanAda() {
  const folder = './uploads/pengajuan';

  if (!fs.existsSync(folder)) {
    fs.mkdirSync(folder, {
      recursive: true,
    });
  }

  return folder;
}

function namaFileUnik(namaField: string, namaAsli: string) {
  const ekstensiAsli = extname(namaAsli).toLowerCase();
  const ekstensiAman = ekstensiAsli || '.pdf';

  return `${namaField}-${Date.now()}-${Math.round(
    Math.random() * 1_000_000,
  )}${ekstensiAman}`;
}

function filterFileDokumenDanGambar(
  file: any,
  callback: (error: Error | null, acceptFile: boolean) => void,
) {
  const tipeDiizinkan = [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ];

  if (!tipeDiizinkan.includes(file.mimetype)) {
    return callback(
      new Error(
        'File harus berupa PDF, JPG, PNG, WEBP, DOC, DOCX, XLS, atau XLSX.',
      ),
      false,
    );
  }

  callback(null, true);
}

// <--- fitur controller pengajuan STD, RAB, dan bukti transfer --->
@UseInterceptors(SnakeCaseInterceptor)
@Controller('pengajuan')
export class PengajuanController {
  constructor(private readonly pengajuanService: PengajuanService) {}

  // <--- membuat pengajuan baru dengan upload file STD dan RAB --->
  @Post()
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        {
          name: 'file_std',
          maxCount: 1,
        },
        {
          name: 'file_rab',
          maxCount: 1,
        },
      ],
      {
        storage: diskStorage({
          destination: (req, file, callback) => {
            const folder = pastikanFolderPengajuanAda();

            callback(null, folder);
          },

          filename: (req, file, callback) => {
            callback(
              null,
              namaFileUnik(file.fieldname || 'file', file.originalname),
            );
          },
        }),

        fileFilter: (req, file, callback) => {
          filterFileDokumenDanGambar(file, callback);
        },

        /*
         * Tidak memakai limit fileSize.
         * Upload STD/RAB tidak dibatasi MB dari kode aplikasi.
         */
      },
    ),
  )
  buatPengajuan(
    @Body() data: BuatPengajuanDto,
    @UploadedFiles()
    files: {
      file_std?: Express.Multer.File[];
      file_rab?: Express.Multer.File[];
    },
  ) {
    const fileStd = files.file_std?.[0];
    const fileRab = files.file_rab?.[0];

    return this.pengajuanService.buatPengajuan(data, fileStd, fileRab);
  }
  // <--- end --->

  // <--- FA upload bukti transfer dan otomatis membuat saldo karyawan --->
  @Post(':idPengajuan/upload-bukti-transfer')
  @UseInterceptors(
    FileInterceptor('bukti_transfer', {
      storage: diskStorage({
        destination: (req, file, callback) => {
          const folder = pastikanFolderPengajuanAda();

          callback(null, folder);
        },

        filename: (req, file, callback) => {
          callback(
            null,
            namaFileUnik('bukti-transfer', file.originalname),
          );
        },
      }),

      fileFilter: (req, file, callback) => {
        filterFileDokumenDanGambar(file, callback);
      },

      /*
       * Tidak memakai limit fileSize.
       * Upload bukti transfer tidak dibatasi MB dari kode aplikasi.
       */
    }),
  )
  uploadBuktiTransfer(
    @Param('idPengajuan') idPengajuan: string,
    @Body()
    data: {
      nominal_transfer?: string | number;
      tanggal_transfer?: string;
      keterangan?: string;
    },
    @UploadedFile() fileBuktiTransfer: Express.Multer.File,
  ) {
    return this.pengajuanService.uploadBuktiTransfer(
      Number(idPengajuan),
      fileBuktiTransfer,
      data,
    );
  }
  // <--- end --->

  // <--- mengambil semua pengajuan --->
  @Get()
  ambilSemuaPengajuan() {
    return this.pengajuanService.ambilSemuaPengajuan();
  }
  // <--- end --->

  // <--- mengambil pengajuan berdasarkan pengguna --->
  @Get('pengguna/:idPengguna')
  ambilPengajuanBerdasarkanPengguna(@Param('idPengguna') idPengguna: string) {
    return this.pengajuanService.ambilPengajuanBerdasarkanPengguna(
      Number(idPengguna),
    );
  }
  // <--- end --->

  // <--- mengambil detail pengajuan --->
  @Get(':idPengajuan')
  ambilPengajuanBerdasarkanId(@Param('idPengajuan') idPengajuan: string) {
    return this.pengajuanService.ambilPengajuanBerdasarkanId(
      Number(idPengajuan),
    );
  }
  // <--- end --->

  // <--- update status pengajuan --->
  @Patch(':idPengajuan/status')
  updateStatusPengajuan(
    @Param('idPengajuan') idPengajuan: string,
    @Body() data: UpdateStatusPengajuanDto,
  ) {
    return this.pengajuanService.updateStatusPengajuan(
      Number(idPengajuan),
      data,
    );
  }
  // <--- end --->

  // <--- hapus pengajuan --->
  @Delete(':idPengajuan')
  hapusPengajuan(@Param('idPengajuan') idPengajuan: string) {
    return this.pengajuanService.hapusPengajuan(Number(idPengajuan));
  }
  // <--- end --->
}
// <--- end --->