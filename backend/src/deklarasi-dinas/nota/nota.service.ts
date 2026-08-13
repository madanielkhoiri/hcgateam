import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as fs from 'fs/promises';
import * as path from 'path';

import { SaldoService } from '../saldo/saldo.service';
import { OcrSpaceService } from './ocr-space.service';
import { PrismaService } from '../../prisma/prisma.service';
import { Deklarasi, KategoriNota, Prisma } from '@prisma/client';

declare const require: any;
const sharpModule = require('sharp');
const sharp = sharpModule.default || sharpModule;

type StatusVerifikasiNota =
  | 'BELUM_OCR'
  | 'OCR_SELESAI'
  | 'DIVERIFIKASI'
  | 'DITOLAK';

// <--- fitur service nota deklarasi dengan revisi nota ditolak --->
@Injectable()
export class NotaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly saldoService: SaldoService,
    private readonly ocrSpaceService: OcrSpaceService,
  ) {}

  // <--- mengambil dan memvalidasi deklarasi --->
  private async ambilDeklarasiAtauGagal(idDeklarasi: number) {
    if (!Number.isInteger(idDeklarasi) || idDeklarasi <= 0) {
      throw new BadRequestException('ID deklarasi tidak valid.');
    }

    const deklarasi = await this.prisma.deklarasi.findUnique({
      where: {
        id: idDeklarasi,
      },
    });

    if (!deklarasi) {
      throw new NotFoundException('Deklarasi tidak ditemukan.');
    }

    return deklarasi;
  }
  // <--- end --->

  // <--- mengambil nota atau gagal --->
  private async ambilNotaAtauGagal(idNota: number) {
    if (!Number.isInteger(idNota) || idNota <= 0) {
      throw new BadRequestException('ID nota tidak valid.');
    }

    const nota = await this.prisma.nota.findUnique({
      where: {
        id: idNota,
      },
    });

    if (!nota) {
      throw new NotFoundException('Nota tidak ditemukan.');
    }

    return nota;
  }
  // <--- end --->

  // <--- memastikan deklarasi masih bisa diedit oleh karyawan --->
  private pastikanDeklarasiBisaDiedit(deklarasi: Deklarasi) {
    if (!['DRAFT', 'DITOLAK'].includes(deklarasi.status)) {
      throw new BadRequestException(
        'Nota hanya dapat diubah ketika deklarasi berstatus DRAFT atau DITOLAK.',
      );
    }
  }
  // <--- end --->

  // <--- memastikan deklarasi bisa dikoreksi admin / FA --->
  private pastikanDeklarasiBisaDikoreksi(deklarasi: Deklarasi) {
    if (!['DIAJUKAN', 'DIVERIFIKASI', 'DITOLAK'].includes(deklarasi.status)) {
      throw new BadRequestException(
        'Nota hanya dapat dikoreksi ketika deklarasi sudah diajukan.',
      );
    }
  }
  // <--- end --->

  // <--- memastikan saldo belum selesai --->
  private async pastikanSaldoBelumSelesai(deklarasi: Deklarasi) {
    if (!deklarasi.idSaldo) {
      throw new BadRequestException('Deklarasi belum terhubung dengan saldo.');
    }

    const saldo = await this.saldoService.ambilSaldoBerdasarkanId(
      deklarasi.idSaldo,
    );

    if (saldo.statusSaldo === 'SELESAI') {
      throw new BadRequestException(
        'Saldo sudah selesai. Nota tidak dapat ditambahkan atau dikoreksi lagi.',
      );
    }

    return saldo;
  }
  // <--- end --->

  // <--- validasi kategori nota berdasarkan jenis deklarasi --->
  private validasiKategoriNota(
    deklarasi: Deklarasi,
    kategoriNota: string | undefined | null,
  ): KategoriNota {
    const kategori = String(kategoriNota || '').trim().toUpperCase();

    const kategoriPerjalananDinas: KategoriNota[] = [
      'MAKAN',
      'AKOMODASI',
      'TRANSPORTASI',
      'LAUNDRY',
    ];

    const kategoriDanaOperasional: KategoriNota[] = [
      'DANA_OPERASIONAL_W1',
      'DANA_OPERASIONAL_W2',
      'DANA_OPERASIONAL_BOD',
      'DANA_OPERASIONAL_BYD',
      'DANA_OPERASIONAL_KHUSUS',
    ];

    if (deklarasi.jenisDeklarasi === 'PERJALANAN_DINAS') {
      if (!kategoriPerjalananDinas.includes(kategori as KategoriNota)) {
        throw new BadRequestException(
          'Kategori nota Perjalanan Dinas wajib dipilih: MAKAN, AKOMODASI, TRANSPORTASI, atau LAUNDRY.',
        );
      }

      return kategori as KategoriNota;
    }

    if (deklarasi.jenisDeklarasi === 'UANG_OPERASIONAL') {
      if (!kategoriDanaOperasional.includes(kategori as KategoriNota)) {
        throw new BadRequestException(
          'Kategori nota Dana Operasional wajib dipilih: DANA_OPERASIONAL_W1, DANA_OPERASIONAL_W2, DANA_OPERASIONAL_BOD, DANA_OPERASIONAL_BYD, atau DANA_OPERASIONAL_KHUSUS.',
        );
      }

      return kategori as KategoriNota;
    }

    throw new BadRequestException('Jenis deklarasi tidak valid.');
  }
  // <--- end --->

  // <--- hapus file jika ada --->
  private async hapusFileJikaAda(pathFile: string | null | undefined) {
    if (!pathFile) {
      return;
    }

    try {
      const lokasiFile = pathFile.startsWith('/')
        ? `.${pathFile}`
        : pathFile;

      await fs.unlink(lokasiFile);
    } catch {
      // abaikan jika file sudah tidak ada
    }
  }
  // <--- end --->

  // <--- hapus nota ditolak saat karyawan upload nota revisi --->
  private async hapusNotaDitolakSebagaiRevisi(
    idDeklarasi: number,
    idNotaRevisi?: number,
  ) {
    const daftarNotaDitolak = await this.prisma.nota.findMany({
      where: {
        idDeklarasi: idDeklarasi,
        statusVerifikasi: 'DITOLAK',
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    if (daftarNotaDitolak.length === 0) {
      throw new BadRequestException(
        'Tidak ada nota ditolak yang perlu direvisi.',
      );
    }

    let notaYangDiganti;

    if (Number.isInteger(idNotaRevisi) && Number(idNotaRevisi) > 0) {
      notaYangDiganti = daftarNotaDitolak.find((nota) => {
        return Number(nota.id) === Number(idNotaRevisi);
      });

      if (!notaYangDiganti) {
        throw new BadRequestException(
          'Nota revisi yang dipilih tidak valid atau bukan status DITOLAK.',
        );
      }
    } else {
      if (daftarNotaDitolak.length > 1) {
        throw new BadRequestException(
          'Ada lebih dari satu nota ditolak. Pilih nota yang akan direvisi.',
        );
      }

      notaYangDiganti = daftarNotaDitolak[0];
    }

    await this.hapusFileJikaAda(notaYangDiganti.pathFile);

    await this.prisma.nota.delete({ where: { id: notaYangDiganti.id } });
  }
  // <--- end --->

  // <--- kompres foto nota menjadi JPG kualitas 75%, jika gagal tetap pakai file asli --->
  private async kompresFotoNota(file: Express.Multer.File) {
    if (!file || !file.path) {
      throw new BadRequestException('File nota wajib diunggah.');
    }

    const lokasiAsli = file.path;
    const folderFile = path.dirname(lokasiAsli);
    const namaFileTanpaExt = path.parse(file.filename).name;
    const namaFileJpg = `${namaFileTanpaExt}.jpg`;

    const lokasiFinal = path.join(folderFile, namaFileJpg);
    const lokasiSementara = path.join(
      folderFile,
      `${namaFileTanpaExt}-compressed-${Date.now()}.jpg`,
    );

    try {
      await sharp(lokasiAsli)
        .rotate()
        .resize({
          width: 1600,
          withoutEnlargement: true,
        })
        .jpeg({
          quality: 75,
          mozjpeg: true,
        })
        .toFile(lokasiSementara);

      try {
        await fs.unlink(lokasiAsli);
      } catch {
        // abaikan jika file asli tidak ada
      }

      await fs.rename(lokasiSementara, lokasiFinal);

      file.filename = namaFileJpg;
      file.path = lokasiFinal;
      file.mimetype = 'image/jpeg';

      console.log('Foto nota berhasil dikompres:', {
        nama_file: file.filename,
        path_file: file.path,
        quality: 75,
      });

      return file;
    } catch (error) {
      try {
        await fs.unlink(lokasiSementara);
      } catch {
        // abaikan jika file sementara tidak ada
      }

      console.error('Kompres foto nota gagal, file asli tetap dipakai:', error);

      return file;
    }
  }
  // <--- end --->

  // <--- menyimpan upload nota satu per satu + revisi mengganti nota ditolak --->
  async simpanNotaUpload(
    idDeklarasi: number,
    file: Express.Multer.File,
    kategoriNota: string,
    idNotaRevisi?: number,
    barangJasa?: string,
    picSettlement?: string,
    keteranganSettlement?: string,
    jumlahItemSettlement?: number,
  ) {
    const deklarasi = await this.ambilDeklarasiAtauGagal(idDeklarasi);

    this.pastikanDeklarasiBisaDiedit(deklarasi);

    await this.pastikanSaldoBelumSelesai(deklarasi);

    if (!file) {
      throw new BadRequestException('File nota wajib diunggah.');
    }
    const kategoriFinal = this.validasiKategoriNota(deklarasi, kategoriNota);

    const jumlahItemSettlementFinal = Math.max(
      1,
      Math.floor(Number(jumlahItemSettlement || 1)),
    );

    /*
     * PENTING:
     * Kalau deklarasi sedang DITOLAK, upload nota baru dianggap sebagai revisi.
     * Maka nota lama yang statusnya DITOLAK diganti dengan nota baru.
     */
    if (deklarasi.status === 'DITOLAK' || Number(idNotaRevisi || 0) > 0) {
      await this.hapusNotaDitolakSebagaiRevisi(idDeklarasi, idNotaRevisi);
    }

    const fileKompres = await this.kompresFotoNota(file);

    let hasilOcrText = 'OCR otomatis gagal. Silakan isi nominal manual.';
    let nominalOcr = 0;
    let statusVerifikasi: StatusVerifikasiNota = 'BELUM_OCR';

    try {
      const lokasiFile = fileKompres.path.replace(/\\/g, '/');

      const hasilOcr = await this.ocrSpaceService.bacaNota(lokasiFile);

      hasilOcrText = hasilOcr.hasil_ocr_text;

      nominalOcr = Number(hasilOcr.nominal_ocr || 0);

      statusVerifikasi = nominalOcr > 0 ? 'OCR_SELESAI' : 'BELUM_OCR';
    } catch (error) {
      console.error('OCR.space gagal:', error);
    }

    const notaTersimpan = await this.prisma.nota.create({
      data: {
        idDeklarasi: idDeklarasi,
        kategoriNota: kategoriFinal,
        barangJasa:
          barangJasa && String(barangJasa).trim()
            ? String(barangJasa).trim()
            : null,
        picSettlement:
          picSettlement && String(picSettlement).trim()
            ? String(picSettlement).trim()
            : null,
        keteranganSettlement:
          keteranganSettlement && String(keteranganSettlement).trim()
            ? String(keteranganSettlement).trim()
            : null,
        jumlahItemSettlement: jumlahItemSettlementFinal,
        namaFile: fileKompres.filename,
        pathFile: `/uploads/nota/${fileKompres.filename}`,
        hasilOcrText: hasilOcrText,
        nominalOcr: nominalOcr,
        nominalFinal: nominalOcr,
        apakahDikoreksi: false,
        alasanKoreksi: null,
        statusVerifikasi: statusVerifikasi,
      }
    });

    await this.hitungUlangTotalDeklarasiDanSaldo(idDeklarasi);

    return notaTersimpan;
  }
  // <--- end --->

  // <--- mengambil nota berdasarkan deklarasi --->
  async ambilNotaBerdasarkanDeklarasi(idDeklarasi: number) {
    await this.ambilDeklarasiAtauGagal(idDeklarasi);

    return this.prisma.nota.findMany({
      where: {
        idDeklarasi: idDeklarasi,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
  }
  // <--- end --->

  // <--- koreksi manual nominal OCR --->
  async isiNominalOcrSementara(idNota: number, nominal: number) {
    if (!Number.isFinite(nominal) || nominal <= 0) {
      throw new BadRequestException('Nominal harus diisi lebih dari 0.');
    }

    const nota = await this.ambilNotaAtauGagal(idNota);

    const deklarasi = await this.ambilDeklarasiAtauGagal(nota.idDeklarasi);

    /*
     * Koreksi OCR manual boleh sebelum deklarasi selesai final.
     * Karyawan dapat koreksi saat DRAFT/DITOLAK.
     * Admin/FA dapat koreksi saat DIAJUKAN/DIVERIFIKASI/DITOLAK.
     */
    if (
      !['DRAFT', 'DITOLAK', 'DIAJUKAN', 'DIVERIFIKASI'].includes(
        deklarasi.status,
      )
    ) {
      throw new BadRequestException(
        'Koreksi OCR manual tidak dapat dilakukan setelah deklarasi disetujui final.',
      );
    }

    await this.pastikanSaldoBelumSelesai(deklarasi);

    const notaTersimpan = await this.prisma.nota.update({
      where: { id: idNota },
      data: {
        hasilOcrText: nota.hasilOcrText || 'Nominal dikoreksi manual oleh pengguna.',
        nominalOcr: nominal,
        nominalFinal: nominal,
        apakahDikoreksi: true,
        alasanKoreksi: 'Koreksi manual nominal OCR',
        statusVerifikasi: 'OCR_SELESAI',
      }
    });

    await this.hitungUlangTotalDeklarasiDanSaldo(nota.idDeklarasi);

    return notaTersimpan;
  }
  // <--- end --->

  // <--- admin / FA setujui atau tolak nota per gambar --->
  async ubahStatusNota(
    idNota: number,
    statusVerifikasi: string,
    alasanKoreksi?: string,
  ) {
    let nota = await this.ambilNotaAtauGagal(idNota);

    const deklarasi = await this.ambilDeklarasiAtauGagal(nota.idDeklarasi);

    this.pastikanDeklarasiBisaDikoreksi(deklarasi);

    await this.pastikanSaldoBelumSelesai(deklarasi);

    const statusFinal = String(statusVerifikasi || '')
      .trim()
      .toUpperCase() as StatusVerifikasiNota;

    const daftarStatusDiizinkan: StatusVerifikasiNota[] = [
      'OCR_SELESAI',
      'DIVERIFIKASI',
      'DITOLAK',
    ];

    if (!daftarStatusDiizinkan.includes(statusFinal)) {
      throw new BadRequestException(
        'Status nota tidak valid. Gunakan OCR_SELESAI, DIVERIFIKASI, atau DITOLAK.',
      );
    }

    let updateData: Prisma.NotaUpdateInput = {};

    if (statusFinal === 'DITOLAK') {
      const alasan = String(alasanKoreksi || '').trim();

      if (!alasan) {
        throw new BadRequestException('Alasan penolakan nota wajib diisi.');
      }

      updateData.statusVerifikasi = 'DITOLAK';
      updateData.alasanKoreksi = alasan;
      updateData.apakahDikoreksi = true;

      await this.prisma.deklarasi.update({
        where: { id: deklarasi.id },
        data: { status: 'DITOLAK' }
      });
    }

    if (statusFinal === 'DIVERIFIKASI') {
      if (Number(nota.nominalFinal || 0) <= 0) {
        throw new BadRequestException(
          'Nota belum memiliki nominal final. Koreksi nominal terlebih dahulu.',
        );
      }

      updateData.statusVerifikasi = 'DIVERIFIKASI';
      updateData.alasanKoreksi = null;
    }

    if (statusFinal === 'OCR_SELESAI') {
      updateData.statusVerifikasi = 'OCR_SELESAI';
      updateData.alasanKoreksi = null;
    }

    const notaTersimpan = await this.prisma.nota.update({
      where: { id: idNota },
      data: updateData
    });

    await this.hitungUlangTotalDeklarasiDanSaldo(nota.idDeklarasi);

    return notaTersimpan;
  }
  // <--- end --->

  // <--- menghitung total deklarasi dan saldo terkait, nota ditolak tidak dihitung --->
  async hitungUlangTotalDeklarasiDanSaldo(idDeklarasi: number) {
    const deklarasi = await this.ambilDeklarasiAtauGagal(idDeklarasi);

    const daftarNota = await this.prisma.nota.findMany({
      where: {
        idDeklarasi: idDeklarasi,
      },
    });

    const totalNominal = daftarNota.reduce((total, nota) => {
      if (nota.statusVerifikasi === 'DITOLAK') {
        return total;
      }

      return total + Number(nota.nominalFinal || 0);
    }, 0);

    await this.prisma.deklarasi.update({
      where: { id: idDeklarasi },
      data: { totalNominal: totalNominal }
    });

    if (deklarasi.idSaldo) {
      await this.saldoService.hitungUlangSaldo(
        deklarasi.idSaldo,
        totalNominal,
      );
    }

    return await this.prisma.deklarasi.findUnique({ where: { id: idDeklarasi } });
  }
  // <--- end --->

  // <--- menghapus nota --->
  async hapusNota(idNota: number) {
    const nota = await this.ambilNotaAtauGagal(idNota);

    const deklarasi = await this.ambilDeklarasiAtauGagal(nota.idDeklarasi);

    this.pastikanDeklarasiBisaDiedit(deklarasi);

    await this.pastikanSaldoBelumSelesai(deklarasi);

    const idDeklarasi = nota.idDeklarasi;

    await this.prisma.nota.delete({ where: { id: idNota } });

    await this.hapusFileJikaAda(nota.pathFile);

    await this.hitungUlangTotalDeklarasiDanSaldo(idDeklarasi);

    return {
      message: 'Nota berhasil dihapus.',
      id_nota: idNota,
      id_deklarasi: idDeklarasi,
    };
  }
  // <--- end --->
}
// <--- end --->