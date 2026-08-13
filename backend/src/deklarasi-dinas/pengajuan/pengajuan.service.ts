import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as fs from 'fs/promises';

import { SaldoService } from '../saldo/saldo.service';
import { BuatPengajuanDto } from './dto/buat-pengajuan.dto';
import { UpdateStatusPengajuanDto } from './dto/update-status-pengajuan.dto';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma, Pengajuan } from '@prisma/client';

// <--- fitur service pengajuan STD, RAB, approval FA, notif WA, dan bukti transfer --->
@Injectable()
export class PengajuanService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly saldoService: SaldoService,
  ) {}

  // <--- membuat pengajuan baru dengan file STD dan RAB + notif WA ke FA --->
  async buatPengajuan(
    data: BuatPengajuanDto,
    fileStd: Express.Multer.File | undefined,
    fileRab: Express.Multer.File | undefined,
  ) {
    const idPengguna = Number(data.id_pengguna);

    if (!Number.isInteger(idPengguna) || idPengguna <= 0) {
      throw new BadRequestException('Pengguna wajib dipilih.');
    }

    if (data.jenis_pengajuan === 'PERJALANAN_DINAS' && !fileStd) {
      throw new BadRequestException('File STD wajib diupload untuk Perjalanan Dinas.');
    }

    if (!fileRab) {
      throw new BadRequestException('File RAB wajib diupload.');
    }

    if (!data.jenis_pengajuan) {
      throw new BadRequestException('Jenis pengajuan wajib dipilih.');
    }

    if (
      data.jenis_pengajuan === 'PERJALANAN_DINAS' &&
      (!data.nomor_std || !data.nomor_std.trim())
    ) {
      throw new BadRequestException('Nomor STD wajib diisi untuk Perjalanan Dinas.');
    }

    if (
      data.jenis_pengajuan === 'UANG_OPERASIONAL' &&
      (!data.nomor_rab || !data.nomor_rab.trim())
    ) {
      throw new BadRequestException('Nomor RAB wajib diisi untuk Uang Operasional.');
    }

    const pengguna = await this.prisma.user.findUnique({
      where: {
        id: idPengguna,
      },
    });

    if (!pengguna) {
      throw new NotFoundException('Data karyawan tidak ditemukan.');
    }

    if (!pengguna.isActive) {
      throw new BadRequestException('Akun karyawan tidak aktif.');
    }

    const tanggalPengajuan =
      data.tanggal_pengajuan && data.tanggal_pengajuan.trim()
        ? data.tanggal_pengajuan.trim()
        : new Date().toISOString().slice(0, 10);

    const pengajuan = await this.prisma.pengajuan.create({
      data: {
        idPengguna: pengguna.id,
        nrp: data.nrp && data.nrp.trim() ? data.nrp.trim() : (pengguna.nrp || ''),
        namaPengguna:
          data.nama_pengguna && data.nama_pengguna.trim()
            ? data.nama_pengguna.trim()
            : pengguna.name,
        jenisPengajuan: data.jenis_pengajuan,
        lokasi: data.lokasi && data.lokasi.trim() ? data.lokasi.trim() : null,
        keterangan:
          data.keterangan && data.keterangan.trim()
            ? data.keterangan.trim()
            : null,
        nomorStd:
          data.nomor_std && data.nomor_std.trim()
            ? data.nomor_std.trim()
            : null,
        nomorRab:
          data.nomor_rab && data.nomor_rab.trim()
            ? data.nomor_rab.trim()
            : null,
        namaFileStd: fileStd ? fileStd.filename : null,
        pathFileStd: fileStd ? `/uploads/pengajuan/${fileStd.filename}` : null,
        namaFileRab: fileRab.filename,
        pathFileRab: `/uploads/pengajuan/${fileRab.filename}`,
        nominalTransfer: 0,
        namaFileBuktiTransfer: null,
        pathFileBuktiTransfer: null,
        tanggalTransfer: null,
        idSaldo: null,
        statusPengajuan: 'DIAJUKAN',
        catatanAdmin: null,
        tanggalPengajuan: new Date(tanggalPengajuan),
      }
    });

    /*
     * Saat Admin/Super Admin membuat pengajuan,
     * sistem langsung memberi notifikasi WA ke semua akun FA aktif.
     */
    await this.kirimNotifikasiPengajuanBaruKeFa(pengajuan);

    return pengajuan;
  }
  // <--- end --->

  // <--- mengambil semua pengajuan --->
  async ambilSemuaPengajuan() {
    return this.prisma.pengajuan.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    });
  }
  // <--- end --->

  // <--- mengambil pengajuan berdasarkan pengguna --->
  async ambilPengajuanBerdasarkanPengguna(idPengguna: number) {
    if (!Number.isInteger(idPengguna) || idPengguna <= 0) {
      throw new BadRequestException('ID pengguna tidak valid.');
    }

    return this.prisma.pengajuan.findMany({
      where: {
        idPengguna: idPengguna,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }
  // <--- end --->

  // <--- mengambil detail pengajuan --->
  async ambilPengajuanBerdasarkanId(idPengajuan: number) {
    if (!Number.isInteger(idPengajuan) || idPengajuan <= 0) {
      throw new BadRequestException('ID pengajuan tidak valid.');
    }

    const pengajuan = await this.prisma.pengajuan.findUnique({
      where: {
        id: idPengajuan,
      },
    });

    if (!pengajuan) {
      throw new NotFoundException('Pengajuan tidak ditemukan.');
    }

    return pengajuan;
  }
  // <--- end --->

  // <--- FA setuju/tolak pengajuan --->
  async updateStatusPengajuan(
    idPengajuan: number,
    data: UpdateStatusPengajuanDto,
  ) {
    const pengajuan = await this.ambilPengajuanBerdasarkanId(idPengajuan);

    if (!data.status_pengajuan) {
      throw new BadRequestException('Status pengajuan wajib dipilih.');
    }

    if (pengajuan.statusPengajuan === 'SELESAI') {
      throw new BadRequestException(
        'Pengajuan yang sudah selesai tidak dapat diubah kembali.',
      );
    }

    if (
      pengajuan.statusPengajuan === 'MENUNGGU_TRANSFER' &&
      data.status_pengajuan !== 'MENUNGGU_TRANSFER'
    ) {
      throw new BadRequestException(
        'Pengajuan yang sudah menunggu transfer tidak dapat diubah kembali.',
      );
    }

    if (data.status_pengajuan === 'DITOLAK') {
      if (!data.catatan_admin || !data.catatan_admin.trim()) {
        throw new BadRequestException(
          'Alasan penolakan wajib diisi jika pengajuan ditolak.',
        );
      }

      return this.prisma.pengajuan.update({
        where: { id: idPengajuan },
        data: {
          statusPengajuan: 'DITOLAK',
          catatanAdmin: data.catatan_admin.trim()
        }
      });
    }

    if (data.status_pengajuan === 'MENUNGGU_TRANSFER') {
      if (pengajuan.statusPengajuan !== 'DIAJUKAN') {
        throw new BadRequestException(
          'Hanya pengajuan berstatus Diajukan yang dapat disetujui FA.',
        );
      }

      const catatanUpdate = data.catatan_admin && data.catatan_admin.trim()
        ? data.catatan_admin.trim()
        : 'Pengajuan disetujui oleh FA dan menunggu proses transfer.';

      return this.prisma.pengajuan.update({
        where: { id: idPengajuan },
        data: {
          statusPengajuan: 'MENUNGGU_TRANSFER',
          catatanAdmin: catatanUpdate
        }
      });
    }

    return this.prisma.pengajuan.update({
      where: { id: idPengajuan },
      data: {
        statusPengajuan: data.status_pengajuan,
        catatanAdmin: data.catatan_admin && data.catatan_admin.trim()
          ? data.catatan_admin.trim()
          : null
      }
    });
  }
  // <--- end --->

  // <--- FA upload bukti transfer lalu saldo otomatis masuk ke akun karyawan --->
  async uploadBuktiTransfer(
    idPengajuan: number,
    fileBuktiTransfer: Express.Multer.File | undefined,
    data: {
      nominal_transfer?: string | number;
      tanggal_transfer?: string;
      keterangan?: string;
    },
  ) {
    let pengajuan = await this.ambilPengajuanBerdasarkanId(idPengajuan);

    if (!fileBuktiTransfer) {
      throw new BadRequestException('Bukti transfer wajib diupload.');
    }

    if (pengajuan.statusPengajuan !== 'MENUNGGU_TRANSFER') {
      throw new BadRequestException(
        'Bukti transfer hanya dapat diupload ketika status pengajuan Menunggu Transfer.',
      );
    }

    if (pengajuan.idSaldo) {
      throw new BadRequestException(
        'Pengajuan ini sudah memiliki saldo transfer.',
      );
    }

    const nominalTransfer = Number(data.nominal_transfer);

    if (!Number.isFinite(nominalTransfer) || nominalTransfer <= 0) {
      throw new BadRequestException('Nominal transfer wajib lebih dari 0.');
    }

    const tanggalTransfer =
      data.tanggal_transfer && String(data.tanggal_transfer).trim()
        ? String(data.tanggal_transfer).trim()
        : new Date().toISOString().slice(0, 10);

    const saldo = await this.saldoService.buatSaldo({
      id_pengguna: pengajuan.idPengguna,
      nrp: pengajuan.nrp,
      nama_pengguna: pengajuan.namaPengguna,
      lokasi: pengajuan.lokasi || undefined,
      jenis_saldo: pengajuan.jenisPengajuan,
      nominal_transfer: nominalTransfer,
      tanggal_transfer: tanggalTransfer,
      keterangan:
        data.keterangan && String(data.keterangan).trim()
          ? String(data.keterangan).trim()
          : `Saldo dari pengajuan #${pengajuan.id}`,
      nomor_std: pengajuan.nomorStd || undefined,
    });

    pengajuan = await this.prisma.pengajuan.update({
      where: { id: idPengajuan },
      data: {
        nominalTransfer: nominalTransfer,
        namaFileBuktiTransfer: fileBuktiTransfer.filename,
        pathFileBuktiTransfer: `/uploads/pengajuan/${fileBuktiTransfer.filename}`,
        tanggalTransfer: new Date(tanggalTransfer),
        idSaldo: saldo.id,
        statusPengajuan: 'SELESAI'
      }
    });

    return pengajuan;
  }
  // <--- end --->

  // <--- hapus pengajuan dan file STD/RAB/bukti transfer --->
  async hapusPengajuan(idPengajuan: number) {
    const pengajuan = await this.ambilPengajuanBerdasarkanId(idPengajuan);

    if (
      pengajuan.statusPengajuan === 'MENUNGGU_TRANSFER' ||
      pengajuan.statusPengajuan === 'SELESAI'
    ) {
      throw new BadRequestException(
        'Pengajuan yang sudah masuk proses transfer tidak dapat dihapus.',
      );
    }

    await this.prisma.pengajuan.delete({ where: { id: idPengajuan } });

    if (pengajuan.pathFileStd) {
      await this.hapusFileJikaAda(`.${pengajuan.pathFileStd}`);
    }

    await this.hapusFileJikaAda(`.${pengajuan.pathFileRab}`);

    if (pengajuan.pathFileBuktiTransfer) {
      await this.hapusFileJikaAda(`.${pengajuan.pathFileBuktiTransfer}`);
    }

    return {
      message: 'Pengajuan berhasil dihapus.',
      id_pengajuan: idPengajuan,
    };
  }
  // <--- end --->

  // <--- kirim notifikasi WA pengajuan baru ke akun FA --->
  private async kirimNotifikasiPengajuanBaruKeFa(pengajuan: Pengajuan) {
    const tokenFonnte = process.env.FONNTE_TOKEN || '';

    if (!tokenFonnte) {
      console.log(
        'Notif WA dilewati: FONNTE_TOKEN belum diisi di file .env.',
      );
      return;
    }

    const daftarFa = await this.prisma.user.findMany({
      where: {
        role: 'FA',
        isActive: true,
      },
    });

    const daftarNomor = daftarFa
      .map((fa) => this.normalisasiNomorWa(fa.phoneNumber || ''))
      .filter(Boolean);

    if (daftarNomor.length === 0) {
      console.log(
        'Notif WA dilewati: tidak ada akun FA aktif yang memiliki nomor WA.',
      );
      return;
    }

    const pesan = [
      'PENGAJUAN BARU MASUK',
      '',
      `ID Pengajuan: #${pengajuan.id}`,
      `Nama Karyawan: ${pengajuan.namaPengguna}`,
      `NRP: ${pengajuan.nrp}`,
      `Jenis: ${this.formatJenisPengajuan(pengajuan.jenisPengajuan as any)}`,
      `Lokasi: ${pengajuan.lokasi || '-'}`,
      `Tanggal Pengajuan: ${pengajuan.tanggalPengajuan}`,
      '',
      'Silakan FA melakukan review STD dan RAB pada sistem.',
      'Pilih Setuju untuk melanjutkan transfer, atau Tolak jika pengajuan belum sesuai.',
    ].join('\n');

    await this.kirimWaFonnte(daftarNomor, pesan);
  }
  // <--- end --->

  // <--- helper kirim WA menggunakan Fonnte --->
  private async kirimWaFonnte(daftarNomor: string[], pesan: string) {
    const tokenFonnte = process.env.FONNTE_TOKEN || '';

    if (!tokenFonnte) {
      console.log('Kirim WA dilewati: FONNTE_TOKEN kosong.');
      return;
    }

    if (daftarNomor.length === 0) {
      console.log('Kirim WA dilewati: target nomor kosong.');
      return;
    }

    try {
      const formData = new FormData();

      formData.append('target', daftarNomor.join(','));
      formData.append('message', pesan);
      formData.append('countryCode', '62');

      const response = await fetch('https://api.fonnte.com/send', {
        method: 'POST',
        headers: {
          Authorization: tokenFonnte,
        },
        body: formData,
      });

      const hasil = await response.text();

      console.log('Hasil kirim WA Fonnte:', hasil);
    } catch (error) {
      console.error('Gagal kirim notif WA Fonnte:', error);
    }
  }
  // <--- end --->

  private normalisasiNomorWa(nomor: string) {
    const angka = nomor.replace(/\D/g, '');

    if (!angka) {
      return '';
    }

    if (angka.startsWith('62')) {
      return angka;
    }

    if (angka.startsWith('0')) {
      return `62${angka.slice(1)}`;
    }

    return angka;
  }

  private formatJenisPengajuan(
    jenis: 'PERJALANAN_DINAS' | 'UANG_OPERASIONAL',
  ) {
    if (jenis === 'PERJALANAN_DINAS') {
      return 'Perjalanan Dinas';
    }

    if (jenis === 'UANG_OPERASIONAL') {
      return 'Uang Operasional';
    }

    return jenis;
  }

  private async hapusFileJikaAda(pathFile: string) {
    try {
      await fs.unlink(pathFile);
    } catch {
      // abaikan jika file sudah tidak ada
    }
  }
}
// <--- end --->