import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

import { buatKodeDeklarasi } from '../bantuan/kode-deklarasi.bantuan';
import { wajibPenyetujuDeklarasi } from '../bantuan/deklarasi-akses.bantuan';
import { DatabaseSettlementService } from '../database-settlement/database-settlement.service';
import { BuatDeklarasiDto } from './dto/buat-deklarasi.dto';
import { EditDeklarasiDto } from './dto/edit-deklarasi.dto';
import { UbahStatusDeklarasiDto } from './dto/ubah-status-deklarasi.dto';
import { Prisma, UserRole } from '@prisma/client';

// <--- fitur service deklarasi perjalanan dinas --->
@Injectable()
export class DeklarasiService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly databaseSettlementService: DatabaseSettlementService,
  ) {}

  // <--- membuat deklarasi manual lama, tetap dipertahankan untuk kompatibilitas --->
  async buatDeklarasi(data: BuatDeklarasiDto) {
    const idPengguna = Number(data.id_pengguna);
    const idSaldo = Number(data.id_saldo);

    if (!Number.isInteger(idPengguna) || idPengguna <= 0) {
      throw new BadRequestException('ID pengguna tidak valid.');
    }

    if (!Number.isInteger(idSaldo) || idSaldo <= 0) {
      throw new BadRequestException('Saldo wajib dipilih.');
    }

    const saldo = await this.prisma.saldo.findUnique({
      where: {
        id: idSaldo,
      },
    });

    if (!saldo) {
      throw new NotFoundException('Saldo yang dipilih tidak ditemukan.');
    }

    if (Number(saldo.idPengguna) !== idPengguna) {
      throw new BadRequestException(
        'Saldo tersebut bukan milik pengguna ini.',
      );
    }

    if (saldo.jenisSaldo !== data.jenis_deklarasi) {
      throw new BadRequestException(
        'Jenis saldo tidak sesuai dengan jenis deklarasi.',
      );
    }

    if (saldo.statusSaldo === 'SELESAI') {
      throw new BadRequestException(
        'Saldo ini sudah selesai dan tidak dapat digunakan lagi.',
      );
    }

    const deklarasiDenganSaldoSama = await this.prisma.deklarasi.findFirst({
      where: {
        idSaldo: idSaldo,
      },
    });

    if (deklarasiDenganSaldoSama) {
      throw new BadRequestException(
        `Saldo ini sudah digunakan oleh deklarasi ${deklarasiDenganSaldoSama.kodeDeklarasi}.`,
      );
    }

    const nrp = data.nrp.trim();
    const namaPengguna = data.nama_pengguna.trim();
    const lokasi = data.lokasi.trim();
    const keterangan = data.keterangan.trim();

    if (!nrp) {
      throw new BadRequestException('NRP wajib diisi.');
    }

    if (!namaPengguna) {
      throw new BadRequestException('Nama pengguna wajib diisi.');
    }

    if (!lokasi) {
      throw new BadRequestException('Lokasi wajib diisi.');
    }

    if (!keterangan) {
      throw new BadRequestException('Keterangan wajib diisi.');
    }

    return this.prisma.deklarasi.create({
      data: {
        kodeDeklarasi: buatKodeDeklarasi(),
        idPengguna: idPengguna,
        idSaldo: idSaldo,
        nrp,
        namaPengguna: namaPengguna,
        jenisDeklarasi: data.jenis_deklarasi,
        tanggalKegiatan: new Date(data.tanggal_kegiatan),
        lokasi,
        keterangan,
        totalNominal: 0,
        status: 'DRAFT',
      }
    });
  }
  // <--- end --->

  // <--- mengambil semua deklarasi --->
  async ambilSemuaDeklarasi() {
    return this.prisma.deklarasi.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    });
  }
  // <--- end --->

  // <--- mengambil deklarasi pengguna --->
  async ambilDeklarasiBerdasarkanPengguna(idPengguna: number) {
    return this.prisma.deklarasi.findMany({
      where: {
        idPengguna: idPengguna,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }
  // <--- end --->

  // <--- mengambil detail deklarasi --->
  async ambilDetailDeklarasi(id: number) {
    const deklarasi = await this.prisma.deklarasi.findUnique({
      where: {
        id,
      },
    });

    if (!deklarasi) {
      throw new NotFoundException('Deklarasi tidak ditemukan.');
    }

    return deklarasi;
  }
  // <--- end --->

  // <--- mengedit data deklarasi --->
  async editDeklarasi(idDeklarasi: number, data: EditDeklarasiDto) {
    const deklarasi = await this.prisma.deklarasi.findUnique({
      where: {
        id: idDeklarasi,
      },
    });

    if (!deklarasi) {
      throw new NotFoundException('Deklarasi tidak ditemukan.');
    }

    if (!['DRAFT', 'DITOLAK'].includes(deklarasi.status)) {
      throw new BadRequestException(
        'Deklarasi hanya dapat diedit ketika berstatus DRAFT atau DITOLAK.',
      );
    }

    const lokasi = data.lokasi.trim();
    const keterangan = data.keterangan.trim();

    if (!data.tanggal_kegiatan) {
      throw new BadRequestException('Tanggal kegiatan wajib diisi.');
    }

    if (!lokasi) {
      throw new BadRequestException('Lokasi wajib diisi.');
    }

    if (!keterangan) {
      throw new BadRequestException('Keterangan wajib diisi.');
    }

    let statusUpdate = deklarasi.status;
    if (deklarasi.status === 'DITOLAK') {
      statusUpdate = 'DRAFT';
    }

    return this.prisma.deklarasi.update({
      where: { id: idDeklarasi },
      data: {
        tanggalKegiatan: new Date(data.tanggal_kegiatan),
        lokasi,
        keterangan,
        status: statusUpdate,
      }
    });
  }
  // <--- end --->

  // <--- karyawan mengajukan / mengajukan ulang deklarasi tanpa menutup saldo --->
  async ajukanDeklarasi(idDeklarasi: number) {
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

    if (!['DRAFT', 'DITOLAK'].includes(deklarasi.status)) {
      throw new BadRequestException(
        'Deklarasi hanya dapat diajukan ketika status DRAFT atau DITOLAK.',
      );
    }

    if (!deklarasi.idSaldo) {
      throw new BadRequestException('Deklarasi belum memiliki saldo.');
    }

    if (Number(deklarasi.totalNominal || 0) <= 0) {
      throw new BadRequestException(
        'Minimal harus ada satu nota sebelum deklarasi diajukan.',
      );
    }

    const saldo = await this.prisma.saldo.findUnique({
      where: {
        id: deklarasi.idSaldo,
      },
    });

    if (!saldo) {
      throw new NotFoundException('Saldo tidak ditemukan.');
    }

    if (saldo.statusSaldo === 'SELESAI') {
      throw new BadRequestException(
        'Saldo sudah selesai. Deklarasi tidak dapat diajukan ulang.',
      );
    }

    return this.prisma.deklarasi.update({
      where: { id: idDeklarasi },
      data: {
        status: 'DIAJUKAN'
      }
    });
  }
  // <--- end --->

  // <--- update status saldo berdasarkan hasil akhir deklarasi --->
  private async updateStatusSaldoSetelahDeklarasiDisetujui(
    idSaldo: number | null,
  ) {
    if (!idSaldo) {
      return null;
    }

    const saldo = await this.prisma.saldo.findUnique({
      where: {
        id: idSaldo,
      },
    });

    if (!saldo) {
      throw new NotFoundException('Saldo tidak ditemukan.');
    }

    const sisaSaldo = Number(saldo.sisaSaldo || 0);

    /*
     * Jika sisa > 0:
     * karyawan wajib upload bukti pengembalian.
     *
     * Jika sisa = 0:
     * saldo langsung selesai.
     *
     * Jika sisa < 0:
     * saldo minus, tidak perlu upload bukti pengembalian,
     * tapi tetap terdata sebagai MELEBIHI_NOMINAL.
     */
    let updateData: Prisma.SaldoUpdateInput = {};

    if (sisaSaldo > 0) {
      updateData.statusSaldo = 'MENUNGGU_PENGEMBALIAN';

      if (
        !saldo.statusBuktiPengembalian ||
        saldo.statusBuktiPengembalian === 'DISETUJUI'
      ) {
        updateData.statusBuktiPengembalian = 'BELUM_UPLOAD';
      }

      updateData.alasanBuktiPengembalianDitolak = null;
      updateData.tanggalVerifikasiPengembalian = null;
    } else if (sisaSaldo === 0) {
      updateData.statusSaldo = 'SELESAI';
      updateData.statusBuktiPengembalian = 'BELUM_UPLOAD';
      updateData.alasanBuktiPengembalianDitolak = null;
    } else {
      updateData.statusSaldo = 'MELEBIHI_NOMINAL';
      updateData.statusBuktiPengembalian = 'BELUM_UPLOAD';
      updateData.alasanBuktiPengembalianDitolak = null;
    }

    return this.prisma.saldo.update({
      where: { id: idSaldo },
      data: updateData
    });
  }
  // <--- end --->

  // <--- update status saldo saat deklarasi ditolak agar tetap aktif untuk revisi --->
  private async updateStatusSaldoSaatDeklarasiDitolak(idSaldo: number | null) {
    if (!idSaldo) {
      return null;
    }

    const saldo = await this.prisma.saldo.findUnique({
      where: {
        id: idSaldo,
      },
    });

    if (!saldo) {
      throw new NotFoundException('Saldo tidak ditemukan.');
    }

    const sisaSaldo = Number(saldo.sisaSaldo || 0);
    const totalPenggunaan = Number(saldo.totalPenggunaan || 0);
    
    let nextStatus = saldo.statusSaldo;

    if (sisaSaldo < 0) {
      nextStatus = 'MELEBIHI_NOMINAL';
    } else if (sisaSaldo === 0) {
      nextStatus = 'PAS';
    } else if (totalPenggunaan > 0 && sisaSaldo > 0) {
      nextStatus = 'ADA_SISA';
    } else {
      nextStatus = 'AKTIF';
    }

    return this.prisma.saldo.update({
      where: { id: idSaldo },
      data: {
        statusSaldo: nextStatus
      }
    });
  }
  // <--- end --->

  // <--- mengubah status deklarasi: khusus Admin/Admin HC/Section Head --->
  async ubahStatusDeklarasi(
    idDeklarasi: number,
    data: UbahStatusDeklarasiDto,
    aktor: { role: UserRole },
  ) {
    wajibPenyetujuDeklarasi(aktor.role);

    let deklarasi = await this.prisma.deklarasi.findUnique({
      where: {
        id: idDeklarasi,
      },
    });

    if (!deklarasi) {
      throw new NotFoundException('Deklarasi tidak ditemukan.');
    }

    if (data.status === 'DIVERIFIKASI') {
      if (deklarasi.status !== 'DIAJUKAN') {
        throw new BadRequestException(
          'Hanya deklarasi DIAJUKAN yang dapat diverifikasi.',
        );
      }

      deklarasi = await this.prisma.deklarasi.update({
        where: { id: idDeklarasi },
        data: { status: 'DIVERIFIKASI' }
      });
    }

    if (data.status === 'DISETUJUI') {
      if (!['DIAJUKAN', 'DIVERIFIKASI'].includes(deklarasi.status)) {
        throw new BadRequestException(
          'Hanya deklarasi DIAJUKAN atau DIVERIFIKASI yang dapat disetujui.',
        );
      }

      deklarasi = await this.prisma.deklarasi.update({
        where: { id: idDeklarasi },
        data: { status: 'DISETUJUI' }
      });

      await this.updateStatusSaldoSetelahDeklarasiDisetujui(
        deklarasi.idSaldo,
      );

      await this.databaseSettlementService.sinkronkanDariDeklarasi(deklarasi);
    }

    if (data.status === 'DITOLAK') {
      if (!['DIAJUKAN', 'DIVERIFIKASI'].includes(deklarasi.status)) {
        throw new BadRequestException(
          'Hanya deklarasi DIAJUKAN atau DIVERIFIKASI yang dapat ditolak.',
        );
      }

      const alasan = data.alasan_ditolak?.trim();

      if (!alasan) {
        throw new BadRequestException('Alasan penolakan wajib diisi.');
      }

      const keteranganUpdate = `${deklarasi.keterangan}\n\nALASAN DITOLAK: ${alasan}`;

      deklarasi = await this.prisma.deklarasi.update({
        where: { id: idDeklarasi },
        data: {
          status: 'DITOLAK',
          keterangan: keteranganUpdate
        }
      });

      await this.updateStatusSaldoSaatDeklarasiDitolak(deklarasi.idSaldo);
    }

    return deklarasi;
  }
  // <--- end --->

  // <--- ringkasan dashboard admin --->
  async ambilRingkasanAdmin() {
    const daftarDeklarasi = await this.prisma.deklarasi.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    });

    const totalDeklarasi = daftarDeklarasi.length;

    const totalDraft = daftarDeklarasi.filter(
      (deklarasi) => deklarasi.status === 'DRAFT',
    ).length;

    const totalDiajukan = daftarDeklarasi.filter(
      (deklarasi) => deklarasi.status === 'DIAJUKAN',
    ).length;

    const totalDiverifikasi = daftarDeklarasi.filter(
      (deklarasi) => deklarasi.status === 'DIVERIFIKASI',
    ).length;

    const totalDisetujui = daftarDeklarasi.filter(
      (deklarasi) => deklarasi.status === 'DISETUJUI',
    ).length;

    const totalDitolak = daftarDeklarasi.filter(
      (deklarasi) => deklarasi.status === 'DITOLAK',
    ).length;

    const totalPenggunaan = daftarDeklarasi.reduce((total, deklarasi) => {
      return total + Number(deklarasi.totalNominal || 0);
    }, 0);

    return {
      total_deklarasi: totalDeklarasi,

      total_draft: totalDraft,

      total_diajukan: totalDiajukan,

      total_diverifikasi: totalDiverifikasi,

      total_disetujui: totalDisetujui,

      total_ditolak: totalDitolak,

      total_penggunaan: totalPenggunaan,

      daftar_deklarasi: daftarDeklarasi,
    };
  }
  // <--- end --->
}
// <--- end --->