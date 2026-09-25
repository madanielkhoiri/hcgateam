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
import { pecahPenyakit } from '../mcu-penyakit.util';

export type PeriodePenyakit = 'TAHUN' | 'BULAN';

type BarisKasusPenyakit = {
  penyakit: string | null;
  tanggalSubmit: Date;
  hasilMcu: { jadwalMcu: { karyawanId: number } };
};

/** Hitung penyakit terbanyak dari sekumpulan rekomendasi FU: jumlah = karyawan unik yang mengidap. */
function hitungPenyakit(baris: BarisKasusPenyakit[]) {
  const perPenyakit = new Map<string, { nama: string; karyawan: Set<number> }>();
  const semuaKaryawan = new Set<number>();

  for (const item of baris) {
    const karyawanId = item.hasilMcu.jadwalMcu.karyawanId;
    const nama = pecahPenyakit(item.penyakit);

    if (nama.length === 0) {
      continue;
    }

    semuaKaryawan.add(karyawanId);

    for (const n of nama) {
      const entri = perPenyakit.get(n.toLowerCase()) ?? { nama: n, karyawan: new Set<number>() };
      entri.karyawan.add(karyawanId);
      perPenyakit.set(n.toLowerCase(), entri);
    }
  }

  const totalKasus = semuaKaryawan.size;
  const daftar = Array.from(perPenyakit.values())
    .map((entri) => ({
      nama: entri.nama,
      jumlah: entri.karyawan.size,
      persen: totalKasus > 0 ? Math.round((entri.karyawan.size / totalKasus) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.jumlah - a.jumlah || a.nama.localeCompare(b.nama));

  return { totalKasus, daftar };
}

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

  /** Tren jumlah jadwal MCU per bulan (tahun berjalan) + breakdown status rekomendasi, untuk dashboard modul. */
  async trenDanStatus() {
    const tahun = hariIni().getUTCFullYear();
    const awal = new Date(Date.UTC(tahun, 0, 1));
    const akhir = new Date(Date.UTC(tahun + 1, 0, 1));

    const [jadwal, fit, followUp] = await Promise.all([
      this.prisma.jadwalMcu.findMany({
        where: { tanggalMcu: { gte: awal, lt: akhir } },
        select: { tanggalMcu: true },
      }),
      this.prisma.rekomendasiMcu.count({
        where: {
          status: StatusRekomendasi.FIT,
          tanggalSubmit: { gte: awal, lt: akhir },
        },
      }),
      this.prisma.rekomendasiMcu.count({
        where: {
          status: StatusRekomendasi.FOLLOW_UP,
          tanggalSubmit: { gte: awal, lt: akhir },
        },
      }),
    ]);

    const totalPerBulan = Array.from({ length: 12 }, () => 0);

    for (const row of jadwal) {
      totalPerBulan[row.tanggalMcu.getUTCMonth()] += 1;
    }

    return {
      tahun,
      trenBulanan: totalPerBulan.map((total, index) => ({
        bulan: index + 1,
        total,
      })),
      statusRekomendasi: { fit, followUp },
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

  /**
   * Rekap penyakit penyebab Follow Up (diisi Dokter di rekomendasi) — penyakit
   * terbanyak per tahun atau per bulan, plus rincian per bulan (mode TAHUN)
   * atau per hari (mode BULAN). Satu karyawan dihitung sekali per penyakit di
   * periode yang sama walau FU-nya berulang. Data medis: pemanggil wajib HC/Dokter.
   */
  async penyakitTerbanyak(periode: PeriodePenyakit, tahun: number, bulan?: number) {
    const awal =
      periode === 'BULAN'
        ? new Date(Date.UTC(tahun, (bulan ?? 1) - 1, 1))
        : new Date(Date.UTC(tahun, 0, 1));
    const akhir =
      periode === 'BULAN'
        ? new Date(Date.UTC(tahun, bulan ?? 1, 1))
        : new Date(Date.UTC(tahun + 1, 0, 1));

    const [baris, rentangData] = await Promise.all([
      this.prisma.rekomendasiMcu.findMany({
        where: {
          status: StatusRekomendasi.FOLLOW_UP,
          penyakit: { not: null },
          tanggalSubmit: { gte: awal, lt: akhir },
        },
        select: {
          penyakit: true,
          tanggalSubmit: true,
          hasilMcu: { select: { jadwalMcu: { select: { karyawanId: true } } } },
        },
        orderBy: { tanggalSubmit: 'asc' },
      }),
      this.prisma.rekomendasiMcu.aggregate({
        where: { status: StatusRekomendasi.FOLLOW_UP, penyakit: { not: null } },
        _min: { tanggalSubmit: true },
        _max: { tanggalSubmit: true },
      }),
    ]);

    const utama = hitungPenyakit(baris);

    const jumlahRincian =
      periode === 'BULAN'
        ? new Date(Date.UTC(tahun, bulan ?? 1, 0)).getUTCDate()
        : 12;

    const rincian = Array.from({ length: jumlahRincian }, (_, index) => {
      const kunci = index + 1;
      const hasil = hitungPenyakit(
        baris.filter((item) =>
          periode === 'BULAN'
            ? item.tanggalSubmit.getUTCDate() === kunci
            : item.tanggalSubmit.getUTCMonth() + 1 === kunci,
        ),
      );

      return {
        kunci,
        totalKasus: hasil.totalKasus,
        teratas: hasil.daftar[0]
          ? { nama: hasil.daftar[0].nama, jumlah: hasil.daftar[0].jumlah }
          : null,
      };
    });

    const tahunSekarang = new Date().getUTCFullYear();
    const tahunAwal = rentangData._min.tanggalSubmit?.getUTCFullYear() ?? tahunSekarang;
    const tahunAkhir = Math.max(
      rentangData._max.tanggalSubmit?.getUTCFullYear() ?? tahunSekarang,
      tahunSekarang,
    );

    return {
      periode,
      tahun,
      bulan: periode === 'BULAN' ? bulan ?? 1 : null,
      totalKasus: utama.totalKasus,
      penyakit: utama.daftar,
      rincian,
      tahunTersedia: Array.from(
        { length: tahunAkhir - tahunAwal + 1 },
        (_, index) => tahunAkhir - index,
      ),
    };
  }

  /** History lengkap satu karyawan: seluruh siklus MCU sampai FIT. Nama penyakit hanya untuk HC/Dokter. */
  async historyKaryawan(karyawanId: number, bolehLihatPenyakit = false) {
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

    const riwayat = bolehLihatPenyakit
      ? karyawan.jadwalMcu
      : karyawan.jadwalMcu.map((jadwal) =>
          jadwal.hasilMcu
            ? {
                ...jadwal,
                hasilMcu: {
                  ...jadwal.hasilMcu,
                  rekomendasi: jadwal.hasilMcu.rekomendasi.map((rekom) => ({
                    ...rekom,
                    penyakit: null,
                  })),
                },
              }
            : jadwal,
        );

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
      riwayat,
    };
  }
}
