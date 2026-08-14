// ==================================================
// FILE: backend/src/mcu/dashboard/mcu-dashboard.service.ts
// FUNGSI: Ringkasan alur, durasi proses, dan history MCU
// Referensi: Bagian 4.9 & 4.11 alur-workflow-mcu-periodik-v3.md
// ==================================================

import { Injectable, NotFoundException } from '@nestjs/common';
import {
  StatusFollowUp,
  StatusInduksiUlang,
  StatusKerja,
  StatusPendaftaran,
  StatusRekomendasi,
  StatusReview,
  StatusSuratPengantar,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { durasiHari, hariIni } from '../mcu-date.util';

@Injectable()
export class McuDashboardService {
  constructor(private readonly prisma: PrismaService) {}

  /** Angka ringkas per tahap alur untuk kartu dashboard. */
  async ringkasan() {
    const acuan = hariIni();

    const [
      karyawanAktif,
      jatuhTempo,
      jadwalDraft,
      jadwalTerkunci,
      suratDraft,
      hasilMenungguReview,
      rekomendasiFit,
      rekomendasiFu,
      belumDiteruskan,
      fuBerjalan,
      fuTerlambat,
      induksiMenunggu,
      induksiTerjadwal,
      dirumahkan,
    ] = await Promise.all([
      this.prisma.karyawan.count({ where: { statusKerja: StatusKerja.AKTIF } }),
      this.prisma.karyawan.count({
        where: {
          statusKerja: StatusKerja.AKTIF,
          tanggalMcuBerikutnya: { not: null, lte: acuan },
          jadwalMcu: {
            none: {
              statusPendaftaran: {
                in: [StatusPendaftaran.DRAFT, StatusPendaftaran.TERKUNCI],
              },
            },
          },
        },
      }),
      this.prisma.jadwalMcu.count({
        where: { statusPendaftaran: StatusPendaftaran.DRAFT },
      }),
      this.prisma.jadwalMcu.count({
        where: { statusPendaftaran: StatusPendaftaran.TERKUNCI },
      }),
      this.prisma.suratPengantar.count({
        where: { status: StatusSuratPengantar.DRAFT },
      }),
      this.prisma.hasilMcu.count({
        where: {
          statusReview: { in: [StatusReview.MENUNGGU, StatusReview.DIREVIEW] },
        },
      }),
      this.prisma.rekomendasiMcu.count({
        where: { status: StatusRekomendasi.FIT },
      }),
      this.prisma.rekomendasiMcu.count({
        where: { status: StatusRekomendasi.FOLLOW_UP },
      }),
      this.prisma.rekomendasiMcu.count({
        where: { diteruskanKeKaryawanAt: null },
      }),
      this.prisma.followUp.count({
        where: {
          status: {
            in: [
              StatusFollowUp.MENUNGGU_TANGGAL,
              StatusFollowUp.TERJADWAL,
              StatusFollowUp.TERLAKSANA,
            ],
          },
        },
      }),
      this.prisma.followUp.count({
        where: {
          OR: [
            { status: StatusFollowUp.TERLAMBAT_RESCHEDULE },
            {
              batasWaktuFu: { not: null, lt: acuan },
              status: {
                in: [StatusFollowUp.MENUNGGU_TANGGAL, StatusFollowUp.TERJADWAL],
              },
            },
          ],
        },
      }),
      this.prisma.induksiUlang.count({
        where: { status: StatusInduksiUlang.MENUNGGU },
      }),
      this.prisma.induksiUlang.count({
        where: { status: StatusInduksiUlang.TERJADWAL },
      }),
      this.prisma.karyawan.count({
        where: { statusKerja: StatusKerja.DIRUMAHKAN },
      }),
    ]);

    return {
      karyawanAktif,
      karyawanDirumahkan: dirumahkan,
      reminderJatuhTempo: jatuhTempo,
      jadwalDraft,
      jadwalTerkunci,
      suratMenungguKirim: suratDraft,
      hasilMenungguReview,
      rekomendasiFit,
      rekomendasiFollowUp: rekomendasiFu,
      rekomendasiBelumDiteruskan: belumDiteruskan,
      followUpBerjalan: fuBerjalan,
      followUpTerlambat: fuTerlambat,
      induksiMenunggu,
      induksiTerjadwal,
    };
  }

  /**
   * Durasi tiap tahapan proses (Bagian 4.9) untuk 50 kasus terakhir.
   */
  async durasiProses() {
    const jadwal = await this.prisma.jadwalMcu.findMany({
      where: { hasilMcu: { isNot: null } },
      include: {
        karyawan: { select: { id: true, nik: true, nama: true } },
        departemen: { select: { namaDepartemen: true } },
        suratPengantar: { select: { tanggalTerbit: true } },
        hasilMcu: {
          include: {
            rekomendasi: {
              orderBy: { tanggalSubmit: 'asc' },
              include: {
                followUp: {
                  include: {
                    hasilFollowUp: { orderBy: { tanggalSubmit: 'asc' } },
                  },
                },
                induksiUlang: { select: { tanggalDaftar: true } },
              },
            },
          },
        },
      },
      orderBy: { tanggalMcu: 'desc' },
      take: 50,
    });

    return jadwal.map((item) => {
      const hasil = item.hasilMcu;
      const rekomPertama = hasil?.rekomendasi[0] ?? null;
      const rekomFit =
        hasil?.rekomendasi.find(
          (rekom) => rekom.status === StatusRekomendasi.FIT,
        ) ?? null;
      const followUp = rekomPertama?.followUp ?? null;
      const hasilFuPertama = followUp?.hasilFollowUp[0] ?? null;

      return {
        jadwalId: item.id,
        karyawan: item.karyawan,
        departemen: item.departemen.namaDepartemen,
        tanggalMcu: item.tanggalMcu,
        jenisMcu: item.jenisMcu,

        // Pendaftaran -> Surat Pengantar
        pendaftaranKeSurat: durasiHari(
          item.createdAt,
          item.suratPengantar?.tanggalTerbit ?? null,
        ),

        // Pelaksanaan -> Upload Hasil
        pelaksanaanKeUpload: durasiHari(
          item.tanggalMcu,
          hasil?.tanggalUpload ?? null,
        ),

        // Upload Hasil -> Rekomendasi
        uploadKeRekomendasi: durasiHari(
          hasil?.tanggalUpload ?? null,
          rekomPertama?.tanggalSubmit ?? null,
        ),

        // Rekomendasi -> Diteruskan ke Karyawan
        rekomendasiKeKaryawan: durasiHari(
          rekomPertama?.tanggalSubmit ?? null,
          rekomPertama?.diteruskanKeKaryawanAt ?? null,
        ),

        // Rekom FU -> Karyawan Pilih Tanggal
        rekomFuKePilihTanggal: durasiHari(
          rekomPertama?.tanggalSubmit ?? null,
          followUp?.tanggalPilihanKaryawan ?? null,
        ),

        // FU Terlaksana -> Submit Hasil
        fuKeSubmitHasil: durasiHari(
          followUp?.tanggalPilihanKaryawan ?? null,
          hasilFuPertama?.tanggalSubmit ?? null,
        ),

        // FIT -> Pendaftaran Induksi Ulang
        fitKeInduksi: durasiHari(
          rekomFit?.tanggalSubmit ?? null,
          rekomFit?.induksiUlang?.tanggalDaftar ?? null,
        ),

        // Total siklus FU (batas 2 bulan)
        totalSiklusFu: durasiHari(
          item.tanggalMcu,
          followUp?.ditutupAt ?? rekomFit?.tanggalSubmit ?? null,
        ),

        jumlahSiklus: hasil?.rekomendasi.length ?? 0,
        statusAkhir:
          hasil?.rekomendasi[hasil.rekomendasi.length - 1]?.status ?? null,
      };
    });
  }

  /** History lengkap satu karyawan: seluruh siklus MCU sampai FIT. */
  async historyKaryawan(karyawanId: number) {
    const karyawan = await this.prisma.karyawan.findUnique({
      where: { id: karyawanId },
      include: {
        departemen: { select: { id: true, namaDepartemen: true } },
        jadwalMcu: {
          include: {
            klinik: { select: { id: true, namaKlinik: true } },
            suratPengantar: {
              select: {
                id: true,
                nomorSurat: true,
                tanggalTerbit: true,
                status: true,
              },
            },
            hasilMcu: {
              include: {
                rekomendasi: {
                  include: {
                    dokter: { select: { id: true, name: true } },
                    followUp: {
                      include: {
                        hasilFollowUp: {
                          orderBy: { tanggalSubmit: 'asc' },
                          select: {
                            id: true,
                            tanggalSubmit: true,
                            statusReview: true,
                            tipePengunggah: true,
                            fileDihapusAt: true,
                          },
                        },
                      },
                    },
                    induksiUlang: {
                      select: {
                        id: true,
                        status: true,
                        tanggalDaftar: true,
                        tanggalPelaksanaan: true,
                      },
                    },
                  },
                  orderBy: { siklusKe: 'asc' },
                },
              },
            },
          },
          orderBy: { tanggalMcu: 'desc' },
        },
      },
    });

    if (!karyawan) {
      throw new NotFoundException('Karyawan tidak ditemukan');
    }

    const seluruhRekomendasi = karyawan.jadwalMcu.flatMap(
      (jadwal) => jadwal.hasilMcu?.rekomendasi ?? [],
    );

    return {
      karyawan: {
        id: karyawan.id,
        nik: karyawan.nik,
        nama: karyawan.nama,
        jabatan: karyawan.jabatan,
        departemen: karyawan.departemen,
        statusKerja: karyawan.statusKerja,
        statusKesehatanDirumahkan: karyawan.statusKesehatanDirumahkan,
        tanggalMcuTerakhir: karyawan.tanggalMcuTerakhir,
        tanggalMcuExpired: karyawan.tanggalMcuExpired,
        tanggalMcuBerikutnya: karyawan.tanggalMcuBerikutnya,
      },
      statistik: {
        totalJadwal: karyawan.jadwalMcu.length,
        totalRekomendasi: seluruhRekomendasi.length,
        totalSiklusFollowUp: seluruhRekomendasi.filter(
          (rekom) => rekom.status === StatusRekomendasi.FOLLOW_UP,
        ).length,
        totalFit: seluruhRekomendasi.filter(
          (rekom) => rekom.status === StatusRekomendasi.FIT,
        ).length,
      },
      riwayat: karyawan.jadwalMcu,
    };
  }
}
