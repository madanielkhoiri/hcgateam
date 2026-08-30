import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as fs from 'fs/promises';
import * as path from 'path';

import { buatKodeDeklarasi } from '../bantuan/kode-deklarasi.bantuan';
import { wajibPenyetujuDeklarasi } from '../bantuan/deklarasi-akses.bantuan';
import { BuatSaldoDto } from './buat-saldo.dto';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma, Saldo, Deklarasi, UserRole } from '@prisma/client';

declare const require: any;
const sharpModule = require('sharp');
const sharp = sharpModule.default || sharpModule;

type StatusBuktiPengembalian = 'DISETUJUI' | 'DITOLAK';

// <--- fitur service saldo karyawan + auto deklarasi aktif + bukti pengembalian --->
@Injectable()
export class SaldoService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  // <--- membuat saldo transfer baru dan otomatis membuat deklarasi DRAFT di belakang layar --->
  async buatSaldo(data: BuatSaldoDto) {
    const idPengguna = Number(data.id_pengguna);
    const nominalTransfer = Number(data.nominal_transfer);

    if (!Number.isFinite(idPengguna) || idPengguna <= 0) {
      throw new BadRequestException('Pengguna wajib dipilih.');
    }

    if (!Number.isFinite(nominalTransfer) || nominalTransfer <= 0) {
      throw new BadRequestException('Nominal transfer wajib lebih dari 0.');
    }

    if (!data.jenis_saldo) {
      throw new BadRequestException('Jenis saldo wajib dipilih.');
    }

    if (!data.tanggal_transfer) {
      throw new BadRequestException('Tanggal transfer wajib diisi.');
    }

    const saldo = await this.prisma.saldo.create({
      data: {
        idPengguna: idPengguna,
        nrp: data.nrp ? data.nrp.trim() : '',
        namaPengguna: data.nama_pengguna ? data.nama_pengguna.trim() : '',
        lokasi: data.lokasi ? data.lokasi.trim() : null,
        jenisSaldo: data.jenis_saldo,
        nominalTransfer: nominalTransfer,
        totalPenggunaan: 0,
        sisaSaldo: nominalTransfer,
        tanggalTransfer: new Date(data.tanggal_transfer),
        keterangan: data.keterangan ? data.keterangan.trim() : null,
        nomorStd:
          data.nomor_std && data.nomor_std.trim()
            ? data.nomor_std.trim()
            : null,
        statusSaldo: 'AKTIF',
        namaFileBuktiPengembalian: null,
        pathFileBuktiPengembalian: null,
        statusBuktiPengembalian: 'BELUM_UPLOAD',
        alasanBuktiPengembalianDitolak: null,
        tanggalUploadBuktiPengembalian: null,
        tanggalVerifikasiPengembalian: null,
      }
    });

    const deklarasiAktif = await this.pastikanDeklarasiSaldoAda(saldo);

    return {
      ...saldo,
      id_deklarasi_aktif: deklarasiAktif.id,
      kode_deklarasi_aktif: deklarasiAktif.kodeDeklarasi,
      status_deklarasi_aktif: deklarasiAktif.status,
    };
  }
  // <--- end --->

  // <--- otomatis membuat deklarasi DRAFT jika saldo belum punya deklarasi --->
  private async pastikanDeklarasiSaldoAda(saldo: Saldo) {
    const deklarasiAda = await this.prisma.deklarasi.findFirst({
      where: {
        idSaldo: saldo.id,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (deklarasiAda) {
      return deklarasiAda;
    }

    const tanggalKegiatan =
      saldo.tanggalTransfer || new Date();

    const deklarasi = await this.prisma.deklarasi.create({
      data: {
        kodeDeklarasi: buatKodeDeklarasi(),
        idPengguna: saldo.idPengguna,
        idSaldo: saldo.id,
        nrp: saldo.nrp || '',
        namaPengguna: saldo.namaPengguna || '',
        jenisDeklarasi: saldo.jenisSaldo,
        tanggalKegiatan: new Date(tanggalKegiatan),
        lokasi: saldo.lokasi || '-',
        keterangan: saldo.keterangan || 'Deklarasi otomatis dari saldo transfer FA',
        nomorStd: saldo.nomorStd || null,
        totalNominal: 0,
        status: 'DRAFT',
      }
    });

    return deklarasi;
  }
  // <--- end --->

  // <--- kompres bukti pengembalian saldo menjadi JPG kualitas 75% --->
  private async kompresBuktiPengembalian(file: Express.Multer.File) {
    if (!file || !file.path) {
      throw new BadRequestException('File bukti pengembalian wajib diunggah.');
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

      console.log('Bukti pengembalian berhasil dikompres:', {
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

      console.error(
        'Kompres bukti pengembalian gagal, file asli tetap dipakai:',
        error,
      );

      return file;
    }
  }
  // <--- end --->

  // <--- mengambil semua transaksi saldo --->
  async ambilSemuaSaldo() {
    return this.prisma.saldo.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    });
  }
  // <--- end --->

  // <--- mengambil semua saldo pengguna --->
  async ambilSaldoBerdasarkanPengguna(idPengguna: number) {
    return this.prisma.saldo.findMany({
      where: {
        idPengguna: idPengguna,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }
  // <--- end --->

  // <--- mengambil saldo aktif pengguna + id deklarasi aktif untuk upload nota dari dashboard --->
  async ambilSaldoAktifPengguna(idPengguna: number) {
    const daftarSaldo = await this.prisma.saldo.findMany({
      where: {
        idPengguna: idPengguna,
      },
      orderBy: [
        { tanggalTransfer: 'desc' },
        { createdAt: 'desc' },
      ],
    });

    /*
     * Saldo aktif adalah semua yang belum SELESAI.
     * MENUNGGU_PENGEMBALIAN tetap tampil karena karyawan wajib upload bukti pengembalian.
     * MELEBIHI_NOMINAL tetap tampil sebagai data minus, tapi nanti frontend menghitungnya terpisah.
     */
    const daftarAktif = daftarSaldo.filter((saldo) => {
      return saldo.statusSaldo !== 'SELESAI';
    });

    const hasil: any[] = [];

    for (const saldo of daftarAktif) {
      const deklarasiAktif = await this.pastikanDeklarasiSaldoAda(saldo);

      hasil.push({
        ...saldo,
        id_deklarasi_aktif: deklarasiAktif.id,
        kode_deklarasi_aktif: deklarasiAktif.kodeDeklarasi,
        status_deklarasi_aktif: deklarasiAktif.status,
      });
    }

    return hasil;
  }
  // <--- end --->

  // <--- mengambil saldo berdasarkan ID --->
  async ambilSaldoBerdasarkanId(idSaldo: number) {
    const saldo = await this.prisma.saldo.findUnique({
      where: {
        id: idSaldo,
      },
    });

    if (!saldo) {
      throw new NotFoundException('Saldo tidak ditemukan.');
    }

    return saldo;
  }
  // <--- end --->

  // <--- menghitung ulang saldo satu deklarasi, minus diperbolehkan --->
  async hitungUlangSaldo(idSaldo: number, totalPenggunaan: number) {
    const saldo = await this.prisma.saldo.findUnique({
      where: {
        id: idSaldo,
      },
    });

    if (!saldo) {
      throw new NotFoundException('Saldo tidak ditemukan.');
    }

    if (saldo.statusSaldo === 'SELESAI') {
      return saldo;
    }

    const nominalTransfer = Number(saldo.nominalTransfer || 0);
    const totalPakai = Math.max(Number(totalPenggunaan || 0), 0);
    const sisaSaldo = nominalTransfer - totalPakai;

    let nextStatus = saldo.statusSaldo;
    let nextBuktiStatus = saldo.statusBuktiPengembalian;

    /*
     * Minus boleh.
     * Total sisa saldo di frontend nanti hanya menghitung AKTIF, ADA_SISA,
     * dan MENUNGGU_PENGEMBALIAN yang sisanya positif.
     */
    if (saldo.statusSaldo === 'MENUNGGU_PENGEMBALIAN') {
      if (sisaSaldo > 0) {
        nextStatus = 'MENUNGGU_PENGEMBALIAN';
      } else if (sisaSaldo === 0) {
        nextStatus = 'PAS';
        nextBuktiStatus = 'BELUM_UPLOAD';
      } else {
        nextStatus = 'MELEBIHI_NOMINAL';
        nextBuktiStatus = 'BELUM_UPLOAD';
      }
    } else if (sisaSaldo < 0) {
      nextStatus = 'MELEBIHI_NOMINAL';
      nextBuktiStatus = 'BELUM_UPLOAD';
    } else if (sisaSaldo === 0) {
      nextStatus = 'PAS';
      nextBuktiStatus = 'BELUM_UPLOAD';
    } else if (totalPakai > 0 && sisaSaldo > 0) {
      nextStatus = 'ADA_SISA';
    } else {
      nextStatus = 'AKTIF';
    }

    return this.prisma.saldo.update({
      where: { id: idSaldo },
      data: {
        totalPenggunaan: totalPakai,
        sisaSaldo: sisaSaldo,
        statusSaldo: nextStatus,
        statusBuktiPengembalian: nextBuktiStatus
      }
    });
  }
  // <--- end --->

  // <--- upload bukti pengembalian saldo sisa oleh karyawan --->
  async uploadBuktiPengembalian(
    idSaldo: number,
    file: Express.Multer.File,
    nominalPengembalianInput: number = 0,
  ) {
    const saldo = await this.ambilSaldoBerdasarkanId(idSaldo);

    if (saldo.statusSaldo !== 'MENUNGGU_PENGEMBALIAN') {
      throw new BadRequestException(
        'Bukti pengembalian hanya dapat diupload ketika status saldo MENUNGGU_PENGEMBALIAN.',
      );
    }

    const sisaSaldo = Number(saldo.sisaSaldo || 0);
    const nominalPengembalian = Number(nominalPengembalianInput || 0);

    if (sisaSaldo <= 0) {
      throw new BadRequestException(
        'Saldo ini tidak memiliki sisa yang perlu dikembalikan.',
      );
    }

    if (!Number.isFinite(nominalPengembalian) || nominalPengembalian <= 0) {
      throw new BadRequestException(
        'Nominal pengembalian wajib diisi lebih dari 0.',
      );
    }

    if (!file) {
      throw new BadRequestException('File bukti pengembalian wajib diunggah.');
    }

    const fileFinal = await this.kompresBuktiPengembalian(file);

    if (saldo.pathFileBuktiPengembalian) {
      try {
        await fs.unlink(`.${saldo.pathFileBuktiPengembalian}`);
      } catch {
        // abaikan file lama yang tidak ditemukan
      }
    }

    return this.prisma.saldo.update({
      where: { id: idSaldo },
      data: {
        nominalPengembalian: nominalPengembalian,
        namaFileBuktiPengembalian: fileFinal.filename,
        pathFileBuktiPengembalian: `/uploads/pengembalian/${fileFinal.filename}`,
        statusBuktiPengembalian: 'DIAJUKAN',
        alasanBuktiPengembalianDitolak: null,
        tanggalUploadBuktiPengembalian: new Date(),
        tanggalVerifikasiPengembalian: null
      }
    });
  }
  // <--- end --->

  // <--- khusus Admin/Admin HC/Section Head setujui atau tolak bukti pengembalian --->
  async ubahStatusBuktiPengembalian(
    idSaldo: number,
    statusBukti: string,
    alasanDitolak: string | undefined,
    aktor: { role: UserRole },
  ) {
    wajibPenyetujuDeklarasi(aktor.role);

    const saldo = await this.ambilSaldoBerdasarkanId(idSaldo);

    const statusFinal = String(statusBukti || '')
      .trim()
      .toUpperCase() as StatusBuktiPengembalian;

    if (!['DISETUJUI', 'DITOLAK'].includes(statusFinal)) {
      throw new BadRequestException(
        'Status bukti pengembalian tidak valid. Gunakan DISETUJUI atau DITOLAK.',
      );
    }

    if (saldo.statusSaldo !== 'MENUNGGU_PENGEMBALIAN') {
      throw new BadRequestException(
        'Bukti pengembalian hanya dapat dikoreksi ketika saldo MENUNGGU_PENGEMBALIAN.',
      );
    }

    if (!saldo.pathFileBuktiPengembalian) {
      throw new BadRequestException(
        'Bukti pengembalian belum diupload oleh karyawan.',
      );
    }

    if (statusFinal === 'DITOLAK') {
      const alasan = String(alasanDitolak || '').trim();

      if (!alasan) {
        throw new BadRequestException('Alasan penolakan bukti wajib diisi.');
      }

      return this.prisma.saldo.update({
        where: { id: idSaldo },
        data: {
          statusBuktiPengembalian: 'DITOLAK',
          alasanBuktiPengembalianDitolak: alasan,
          tanggalVerifikasiPengembalian: new Date()
        }
      });
    }

    /*
     * Setelah bukti pengembalian disetujui Admin / FA,
     * saldo baru benar-benar selesai dan hilang dari Saldo Aktif.
     */
    return this.prisma.saldo.update({
      where: { id: idSaldo },
      data: {
        statusBuktiPengembalian: 'DISETUJUI',
        alasanBuktiPengembalianDitolak: null,
        tanggalVerifikasiPengembalian: new Date(),
        statusSaldo: 'SELESAI'
      }
    });
  }
  // <--- end --->

  // <--- mengunci saldo manual jika memang diperlukan admin / FA --->
  async selesaikanSaldo(idSaldo: number) {
    return this.prisma.saldo.update({
      where: { id: idSaldo },
      data: {
        statusSaldo: 'SELESAI'
      }
    });
  }
  // <--- end --->
}
// <--- end --->