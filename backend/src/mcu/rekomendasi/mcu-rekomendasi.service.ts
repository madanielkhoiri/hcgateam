// ==================================================
// FILE: backend/src/mcu/rekomendasi/mcu-rekomendasi.service.ts
// FUNGSI: Review Dokter, rekomendasi FIT/FU, surat rujukan FU,
//         dan penerusan rekomendasi ke Dept/Karyawan
// Referensi: Bagian 4.5 & 4.6 alur-workflow-mcu-periodik-v3.md
// ==================================================

import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { IsEnum, IsInt, IsOptional, IsString } from 'class-validator';
import {
  Prisma,
  StatusFollowUp,
  StatusRekomendasi,
  StatusReview,
  TipeNotifikasiMcu,
  UserRole,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { McuAksesService } from '../common/mcu-akses.service';
import { AktorMcu } from '../common/mcu-aktor';
import { McuFileService } from '../common/mcu-file.service';
import { BULAN_RETENSI_DOKUMEN } from '../mcu.constants';
import { tambahBulan } from '../mcu-date.util';
import { McuNotifikasiService } from '../notifikasi/mcu-notifikasi.service';

// ==================================================
// DTO
// ==================================================

export class SubmitRekomendasiDto {
  @IsEnum(StatusRekomendasi)
  status: StatusRekomendasi;

  @IsOptional()
  @IsString()
  catatanMedisTerbatas?: string;

  /** Path file PDF rekomendasi hasil upload endpoint dokumen. */
  @IsOptional()
  @IsString()
  filePdfRekomendasi?: string;

  /** Wajib bila status FU: surat rujukan yang diterbitkan Dokter. */
  @IsOptional()
  @IsString()
  suratRujukanFu?: string;

  /** Dipakai saat review ulang hasil FU. */
  @IsOptional()
  @IsInt()
  hasilFollowUpAsalId?: number;
}

const REKOMENDASI_INCLUDE = {
  hasilMcu: {
    include: {
      jadwalMcu: {
        include: {
          karyawan: {
            select: {
              id: true,
              nik: true,
              nama: true,
              email: true,
              akunId: true,
              departemenId: true,
            },
          },
          departemen: {
            select: {
              id: true,
              namaDepartemen: true,
              adminAkunId: true,
              adminAkun: { select: { id: true, email: true } },
            },
          },
        },
      },
    },
  },
  dokter: { select: { id: true, name: true } },
  followUp: {
    select: {
      id: true,
      status: true,
      batasWaktuFu: true,
      tanggalPilihanKaryawan: true,
      siklusKe: true,
    },
  },
  induksiUlang: { select: { id: true, status: true } },
} satisfies Prisma.RekomendasiMcuInclude;

@Injectable()
export class McuRekomendasiService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly akses: McuAksesService,
    private readonly berkas: McuFileService,
    private readonly notifikasi: McuNotifikasiService,
  ) {}

  async daftar(filter: {
    status?: StatusRekomendasi;
    karyawanId?: number;
    belumDiteruskan?: boolean;
  }) {
    return this.prisma.rekomendasiMcu.findMany({
      where: {
        ...(filter.status ? { status: filter.status } : {}),
        ...(filter.karyawanId
          ? { hasilMcu: { jadwalMcu: { karyawanId: filter.karyawanId } } }
          : {}),
        ...(filter.belumDiteruskan ? { diteruskanKeKaryawanAt: null } : {}),
      },
      include: REKOMENDASI_INCLUDE,
      orderBy: { tanggalSubmit: 'desc' },
    });
  }

  async detail(id: number) {
    const rekomendasi = await this.prisma.rekomendasiMcu.findUnique({
      where: { id },
      include: REKOMENDASI_INCLUDE,
    });

    if (!rekomendasi) {
      throw new NotFoundException('Rekomendasi tidak ditemukan');
    }

    return rekomendasi;
  }

  /** Antrean hasil MCU yang menunggu keputusan Dokter. */
  async antreanReview() {
    return this.prisma.hasilMcu.findMany({
      where: {
        statusReview: { in: [StatusReview.MENUNGGU, StatusReview.DIREVIEW] },
      },
      include: {
        jadwalMcu: {
          include: {
            karyawan: { select: { id: true, nik: true, nama: true } },
            departemen: { select: { id: true, namaDepartemen: true } },
          },
        },
      },
      orderBy: { tanggalUpload: 'asc' },
    });
  }

  /**
   * Dokter submit rekomendasi FIT atau FU.
   * Bila FU, surat rujukan Dokter wajib dilampirkan dan
   * record FOLLOW_UP otomatis dibuat (biaya selalu mandiri).
   */
  async submit(hasilMcuId: number, dto: SubmitRekomendasiDto, aktor: AktorMcu) {
    this.akses.wajibPeran(aktor, UserRole.DOKTER);

    const hasil = await this.prisma.hasilMcu.findUnique({
      where: { id: hasilMcuId },
      include: {
        jadwalMcu: { include: { karyawan: true, departemen: true } },
        rekomendasi: { orderBy: { siklusKe: 'desc' }, take: 1 },
      },
    });

    if (!hasil) {
      throw new NotFoundException('Hasil MCU tidak ditemukan');
    }

    if (dto.status === StatusRekomendasi.FOLLOW_UP && !dto.suratRujukanFu) {
      throw new BadRequestException(
        'Surat rujukan FU wajib diterbitkan Dokter untuk rekomendasi Follow Up',
      );
    }

    const siklusKe = (hasil.rekomendasi[0]?.siklusKe ?? 0) + 1;
    const sekarang = new Date();

    const rekomendasi = await this.prisma.$transaction(async (tx) => {
      const dibuat = await tx.rekomendasiMcu.create({
        data: {
          hasilMcuId: hasil.id,
          hasilFollowUpAsalId: dto.hasilFollowUpAsalId ?? null,
          dokterId: aktor.id,
          status: dto.status,
          catatanMedisTerbatas: dto.catatanMedisTerbatas?.trim() || null,
          filePdfRekomendasi: dto.filePdfRekomendasi ?? null,
          suratRujukanFu: dto.suratRujukanFu ?? null,
          nomorSuratRujukan:
            dto.status === StatusRekomendasi.FOLLOW_UP
              ? this.nomorSuratRujukan(hasil.jadwalMcu.karyawan.nik, siklusKe)
              : null,
          siklusKe,
          tanggalSubmit: sekarang,
          retensiHapusAt: tambahBulan(sekarang, BULAN_RETENSI_DOKUMEN),
        },
        include: REKOMENDASI_INCLUDE,
      });

      await tx.hasilMcu.update({
        where: { id: hasil.id },
        data: { statusReview: StatusReview.SELESAI },
      });

      // Hasil FU yang direview ulang ikut ditandai selesai.
      if (dto.hasilFollowUpAsalId) {
        const hasilFu = await tx.hasilFollowUp.update({
          where: { id: dto.hasilFollowUpAsalId },
          data: { statusReview: StatusReview.SELESAI },
          select: { followUpId: true },
        });

        // FIT menutup siklus FU asal; masih FU berarti loop berlanjut.
        if (dto.status === StatusRekomendasi.FIT) {
          await tx.followUp.update({
            where: { id: hasilFu.followUpId },
            data: { status: StatusFollowUp.SELESAI, ditutupAt: sekarang },
          });
        }
      }

      // Rekomendasi FU langsung melahirkan record Follow Up.
      if (dto.status === StatusRekomendasi.FOLLOW_UP) {
        await tx.followUp.create({
          data: {
            rekomendasiId: dibuat.id,
            karyawanId: hasil.jadwalMcu.karyawanId,
            status: StatusFollowUp.MENUNGGU_TANGGAL,
            siklusKe,
          },
        });
      }

      return dibuat;
    });

    // Visibilitas rekomendasi: HC dan Admin Dept (Bagian 4.5 poin 5).
    const label = dto.status === StatusRekomendasi.FIT ? 'FIT' : 'Follow Up';
    const isi = {
      tipe: TipeNotifikasiMcu.REKOMENDASI_FIT_FU,
      refTabel: 'rekomendasi_mcu',
      refId: rekomendasi.id,
      judul: `Rekomendasi ${label}: ${hasil.jadwalMcu.karyawan.nama}`,
      pesan:
        `Dokter menerbitkan rekomendasi ${label} untuk ` +
        `${hasil.jadwalMcu.karyawan.nama} (NIK ${hasil.jadwalMcu.karyawan.nik}).` +
        (dto.status === StatusRekomendasi.FOLLOW_UP
          ? ' Surat rujukan FU sudah tersedia.'
          : ' Silakan lanjutkan pendaftaran induksi ulang.'),
    };

    const target = [
      ...(await this.notifikasi.penerimaPeran(UserRole.HC)),
      {
        penerimaId: hasil.jadwalMcu.departemen.adminAkunId,
        penerimaEmail: null,
      },
    ].filter((item) => item.penerimaId);

    await this.notifikasi.kirimBanyak(
      target.flatMap((item) => this.notifikasi.duaKanal({ ...isi, ...item })),
    );

    return rekomendasi;
  }

  /**
   * Admin Dept meneruskan rekomendasi ke karyawan.
   * Karyawan hanya melihat status FIT/FU, bukan catatan medis lengkap.
   */
  async teruskanKeKaryawan(id: number, aktor: AktorMcu) {
    this.akses.wajibPeran(aktor, UserRole.ADMIN_DEPT, UserRole.HC);

    const rekomendasi = await this.detail(id);
    const karyawan = rekomendasi.hasilMcu.jadwalMcu.karyawan;

    await this.akses.wajibDepartemenSendiri(aktor, karyawan.departemenId);

    if (rekomendasi.diteruskanKeKaryawanAt) {
      throw new BadRequestException(
        'Rekomendasi ini sudah diteruskan ke karyawan',
      );
    }

    const sekarang = new Date();

    const diperbarui = await this.prisma.rekomendasiMcu.update({
      where: { id },
      data: {
        diteruskanKeDeptAt: rekomendasi.diteruskanKeDeptAt ?? sekarang,
        diteruskanKeKaryawanAt: sekarang,
        diteruskanOlehId: aktor.id,
      },
      include: REKOMENDASI_INCLUDE,
    });

    const fit = diperbarui.status === StatusRekomendasi.FIT;

    await this.notifikasi.kirimBanyak(
      this.notifikasi.duaKanal({
        tipe: TipeNotifikasiMcu.REKOMENDASI_FIT_FU,
        refTabel: 'rekomendasi_mcu',
        refId: diperbarui.id,
        judul: `Hasil MCU Anda: ${fit ? 'FIT' : 'Follow Up'}`,
        pesan: fit
          ? 'Anda dinyatakan FIT. Proses dilanjutkan ke pendaftaran induksi ulang K3.'
          : 'Anda perlu menjalani Follow Up. Surat rujukan dari Dokter sudah tersedia, ' +
            'silakan pilih tanggal FU pada menu Follow Up sesuai batas waktu dari HC.',
        penerimaId: karyawan.akunId,
        penerimaEmail: karyawan.email,
      }),
    );

    return diperbarui;
  }

  /** Ringkasan yang aman dilihat karyawan: status saja, tanpa catatan medis. */
  async rekomendasiKaryawan(aktor: AktorMcu) {
    const karyawan = await this.akses.karyawanDariAkun(aktor);

    if (!karyawan) {
      throw new NotFoundException(
        'Akun ini belum tertaut ke data karyawan manapun',
      );
    }

    const daftar = await this.prisma.rekomendasiMcu.findMany({
      where: {
        hasilMcu: { jadwalMcu: { karyawanId: karyawan.id } },
        diteruskanKeKaryawanAt: { not: null },
      },
      select: {
        id: true,
        status: true,
        siklusKe: true,
        tanggalSubmit: true,
        diteruskanKeKaryawanAt: true,
        suratRujukanFu: true,
        nomorSuratRujukan: true,
        followUp: {
          select: {
            id: true,
            status: true,
            batasWaktuFu: true,
            tanggalPilihanKaryawan: true,
          },
        },
        hasilMcu: {
          select: {
            jadwalMcu: { select: { tanggalMcu: true, jenisMcu: true } },
          },
        },
      },
      orderBy: { tanggalSubmit: 'desc' },
    });

    return { karyawan, rekomendasi: daftar };
  }

  /** Buka surat rujukan FU; boleh diakses karyawan pemiliknya. */
  async pathSuratRujukan(id: number, aktor: AktorMcu) {
    const rekomendasi = await this.detail(id);

    if (!rekomendasi.suratRujukanFu) {
      throw new NotFoundException(
        'Rekomendasi ini tidak memiliki surat rujukan',
      );
    }

    const peran = this.akses.peranAktor(aktor);
    const petugas: UserRole[] = [
      UserRole.HC,
      UserRole.DOKTER,
      UserRole.ADMIN_DEPT,
    ];
    const bolehLintas = peran.some((item) => petugas.includes(item));

    if (!bolehLintas) {
      const karyawan = await this.akses.karyawanDariAkun(aktor);

      if (karyawan?.id !== rekomendasi.hasilMcu.jadwalMcu.karyawanId) {
        throw new NotFoundException('Surat rujukan tidak ditemukan');
      }
    }

    return this.berkas.resolveAbsolut(rekomendasi.suratRujukanFu);
  }

  private nomorSuratRujukan(nik: string, siklus: number): string {
    const tahun = new Date().getUTCFullYear();
    return `RJK/${nik}/${siklus}/${tahun}`;
  }
}
