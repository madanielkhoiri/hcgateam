// ==================================================
// FILE: backend/src/surat-tugas-dinas/surat-tugas-dinas.service.ts
// FUNGSI: CRUD + alur persetujuan 2 tahap Surat Tugas Dinas (R & D).
// Tidak ada pemilihan penyetuju saat membuat surat - siapapun cukup
// mengisi form, lalu SH menyetujui dulu (tanda tangan SH tercetak),
// baru PJO menyetujui (tanda tangan PJO tercetak, surat final).
// ==================================================

import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, StatusSuratTugas, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { hasilHalaman, paramHalaman } from '../common/pagination.util';
import { sapaanKaryawan } from '../common/sapaan.util';
import { WhatsappService } from '../whatsapp/whatsapp.service';
import {
  BuatSuratTugasDinasDto,
  TolakSuratTugasDinasDto,
} from './dto/surat-tugas-dinas.dto';
import { SuratTugasDinasPdfService } from './surat-tugas-dinas-pdf.service';

type AktorSurat = {
  id: number;
  role: UserRole;
};

const SURAT_INCLUDE = {
  karyawan: { orderBy: { urutan: 'asc' } },
  dibuatOleh: { select: { id: true, name: true, role: true } },
  disetujuiShOleh: { select: { id: true, name: true, role: true } },
  disetujuiPjoOleh: { select: { id: true, name: true, role: true } },
  suratTugasAsal: {
    select: { id: true, nomor: true, keteranganTugas: true },
  },
} satisfies Prisma.SuratTugasDinasInclude;

@Injectable()
export class SuratTugasDinasService {
  private readonly logger = new Logger(SuratTugasDinasService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly pdf: SuratTugasDinasPdfService,
    private readonly whatsapp: WhatsappService,
  ) {}

  private isAdmin(aktor: AktorSurat): boolean {
    return aktor.role === UserRole.ADMIN || aktor.role === UserRole.SUPER_ADMIN;
  }

  /** Section Head, PJO, & Admin/Admin HC melihat seluruh surat, bukan cuma buatan sendiri. */
  private bolehLihatSemua(aktor: AktorSurat): boolean {
    return (
      this.isAdmin(aktor) ||
      aktor.role === UserRole.SECTION_HEAD ||
      aktor.role === UserRole.PJO
    );
  }

  /** Tahap SH: role Section Head yang berwenang. Tahap PJO: role PJO yang berwenang. */
  private bolehSetujuiTahap(
    aktor: AktorSurat,
    status: StatusSuratTugas,
  ): boolean {
    if (this.isAdmin(aktor)) {
      return true;
    }

    if (status === StatusSuratTugas.MENUNGGU_SH) {
      return aktor.role === UserRole.SECTION_HEAD;
    }

    if (status === StatusSuratTugas.MENUNGGU_PJO) {
      return aktor.role === UserRole.PJO;
    }

    return false;
  }

  async daftar(
    aktor: AktorSurat,
    status?: string,
    halamanRaw?: string,
    ukuranHalamanRaw?: string,
    bulan?: number,
    tahun?: number,
    cari?: string,
  ) {
    const statusValid = (Object.values(StatusSuratTugas) as string[]).includes(
      status ?? '',
    )
      ? (status as StatusSuratTugas)
      : undefined;

    // Filter bulan/tahun dipindah ke sini (dulu di frontend, cuma memfilter
    // baris yang sudah termuat) supaya tetap benar walau daftarnya dipaginate.
    // Pilih bulan tanpa tahun dianggap tahun berjalan (default paling wajar).
    const tahunEfektif =
      tahun ?? (bulan ? new Date().getUTCFullYear() : undefined);
    const rentangTanggalMulai = tahunEfektif
      ? {
          gte: new Date(Date.UTC(tahunEfektif, bulan ? bulan - 1 : 0, 1)),
          lt: bulan
            ? new Date(Date.UTC(tahunEfektif, bulan, 1))
            : new Date(Date.UTC(tahunEfektif + 1, 0, 1)),
        }
      : undefined;

    const where: Prisma.SuratTugasDinasWhereInput = {
      ...(statusValid ? { status: statusValid } : {}),
      ...(this.bolehLihatSemua(aktor) ? {} : { dibuatOlehId: aktor.id }),
      ...(rentangTanggalMulai ? { tanggalMulai: rentangTanggalMulai } : {}),
      ...(cari
        ? {
            OR: [
              { nomor: { contains: cari, mode: 'insensitive' } },
              { tujuanLokasi: { contains: cari, mode: 'insensitive' } },
              {
                karyawan: {
                  some: {
                    OR: [
                      { nama: { contains: cari, mode: 'insensitive' } },
                      { nrp: { contains: cari, mode: 'insensitive' } },
                    ],
                  },
                },
              },
            ],
          }
        : {}),
    };
    const param = paramHalaman(halamanRaw, ukuranHalamanRaw);

    const [data, total] = await Promise.all([
      this.prisma.suratTugasDinas.findMany({
        where,
        include: SURAT_INCLUDE,
        orderBy: { createdAt: 'desc' },
        skip: param.skip,
        take: param.take,
      }),
      this.prisma.suratTugasDinas.count({ where }),
    ]);

    return hasilHalaman(data, total, param);
  }

  async detail(id: number, aktor: AktorSurat) {
    const surat = await this.ambilAtauGagal(id);

    if (!this.bolehLihatSemua(aktor) && surat.dibuatOlehId !== aktor.id) {
      throw new ForbiddenException('Anda tidak dapat mengakses surat ini');
    }

    return surat;
  }

  async pilihanAkomodasi(cari?: string) {
    const surat = await this.prisma.suratTugasDinas.findMany({
      where: {
        status: StatusSuratTugas.DISETUJUI,
        denganAkomodasi: false,
        ...(cari
          ? {
              OR: [
                { nomor: { contains: cari, mode: 'insensitive' } },
                {
                  keteranganTugas: {
                    contains: cari,
                    mode: 'insensitive',
                  },
                },
                {
                  karyawan: {
                    some: {
                      OR: [
                        { nrp: { contains: cari, mode: 'insensitive' } },
                        { nama: { contains: cari, mode: 'insensitive' } },
                      ],
                    },
                  },
                },
              ],
            }
          : {}),
      },
      select: {
        id: true,
        nomor: true,
        tujuanLokasi: true,
        tanggalMulai: true,
        tanggalSelesai: true,
        keteranganTugas: true,
        karyawan: {
          orderBy: { urutan: 'asc' },
          select: {
            nrp: true,
            nama: true,
            departemen: true,
            jabatan: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    return surat
      .flatMap((item) =>
        item.karyawan.map((karyawan) => ({
          suratTugasId: item.id,
          nomorSurat: item.nomor,
          tujuanLokasi: item.tujuanLokasi,
          tanggalMulai: item.tanggalMulai,
          tanggalSelesai: item.tanggalSelesai,
          keteranganTugas: item.keteranganTugas,
          ...karyawan,
        })),
      )
      .filter((item) => {
        if (!cari) {
          return true;
        }

        const kata = cari.toLocaleLowerCase('id-ID');
        return [
          item.nrp,
          item.nama,
          item.keteranganTugas,
          item.nomorSurat,
        ].some((nilai) => nilai.toLocaleLowerCase('id-ID').includes(kata));
      })
      .slice(0, 20);
  }

  /** Cetak ulang PDF dari data yang sudah ada, tanpa mengubah status. */
  async cetakUlangManual(id: number, aktor: AktorSurat) {
    await this.detail(id, aktor);
    return this.cetakUlang(id);
  }

  async buat(dto: BuatSuratTugasDinasDto, aktor: AktorSurat) {
    const nomor = dto.nomor.trim();
    const denganAkomodasi = dto.denganAkomodasi === true;

    const duplikat = await this.prisma.suratTugasDinas.findUnique({
      where: { nomor },
    });

    if (duplikat) {
      throw new BadRequestException('Nomor surat sudah digunakan');
    }

    let tujuanLokasi = dto.tujuanLokasi.trim();
    let tanggalMulai = new Date(dto.tanggalMulai);
    let tanggalSelesai = new Date(dto.tanggalSelesai);
    let keteranganTugas = dto.keteranganTugas.trim();
    let suratTugasAsalId: number | null = null;
    let karyawanTerpilih = dto.karyawan;

    if (denganAkomodasi) {
      if (!dto.suratTugasAsalId) {
        throw new BadRequestException(
          'Pilih karyawan dari Surat Tugas Dinas yang sudah disetujui',
        );
      }

      const suratAsal = await this.prisma.suratTugasDinas.findFirst({
        where: {
          id: dto.suratTugasAsalId,
          denganAkomodasi: false,
          status: StatusSuratTugas.DISETUJUI,
        },
        include: { karyawan: true },
      });

      if (!suratAsal) {
        throw new BadRequestException(
          'Surat Tugas Dinas asal tidak ditemukan atau belum disetujui penuh',
        );
      }

      const nrpUnik = new Set(dto.karyawan.map((item) => item.nrp.trim()));
      if (nrpUnik.size !== dto.karyawan.length) {
        throw new BadRequestException('Karyawan pada STD Akomodasi duplikat');
      }

      const karyawanAsal = new Map(
        suratAsal.karyawan.map((item) => [item.nrp, item]),
      );
      const tidakTerdaftar = [...nrpUnik].filter(
        (nrp) => !karyawanAsal.has(nrp),
      );

      if (tidakTerdaftar.length > 0) {
        throw new BadRequestException(
          `Karyawan ${tidakTerdaftar.join(', ')} tidak terdaftar pada Surat Tugas Dinas asal`,
        );
      }

      suratTugasAsalId = suratAsal.id;
      tujuanLokasi = suratAsal.tujuanLokasi;
      tanggalMulai = suratAsal.tanggalMulai;
      tanggalSelesai = suratAsal.tanggalSelesai;
      keteranganTugas = suratAsal.keteranganTugas;
      karyawanTerpilih = dto.karyawan.map((item) => {
        const sumber = karyawanAsal.get(item.nrp.trim())!;
        return {
          ...item,
          nrp: sumber.nrp,
          nama: sumber.nama,
          departemen: sumber.departemen,
          jabatan: sumber.jabatan,
        };
      });
    }

    if (tanggalSelesai < tanggalMulai) {
      throw new BadRequestException(
        'Tanggal selesai tidak boleh sebelum tanggal mulai',
      );
    }

    const durasiHari =
      Math.floor(
        (tanggalSelesai.getTime() - tanggalMulai.getTime()) /
          (24 * 60 * 60 * 1000),
      ) + 1;
    const laundryTersedia = denganAkomodasi && durasiHari >= 3;
    const jumlahAkomodasi = denganAkomodasi
      ? karyawanTerpilih.reduce(
          (total, item) =>
            total +
            (item.uangPerjalananNominal ?? 0) +
            (item.akomodasiNominal ?? 0) +
            (laundryTersedia ? (item.laundryNominal ?? 0) : 0),
          0,
        )
      : 0;
    const totalPerKategori = (
      kategori: 'uangPerjalananNominal' | 'akomodasiNominal' | 'laundryNominal',
    ) => {
      if (!denganAkomodasi) {
        return null;
      }

      if (kategori === 'laundryNominal' && !laundryTersedia) {
        return null;
      }

      const total = karyawanTerpilih.reduce(
        (jumlah, item) => jumlah + (item[kategori] ?? 0),
        0,
      );
      return total || null;
    };

    const dibuat = await this.prisma.suratTugasDinas.create({
      data: {
        nomor,
        denganAkomodasi,
        suratTugasAsalId,
        tujuanLokasi,
        tanggalMulai,
        tanggalSelesai,
        keteranganTugas,
        penginapanHotel: denganAkomodasi
          ? dto.penginapanHotel?.trim() || null
          : null,
        bantuanTransportasi: denganAkomodasi
          ? dto.bantuanTransportasi?.trim() || null
          : null,
        rutePerjalanan: denganAkomodasi
          ? dto.rutePerjalanan?.trim() || null
          : null,
        uangPerjalananNominal: totalPerKategori('uangPerjalananNominal'),
        uangPerjalananKeterangan: null,
        akomodasiNominal: totalPerKategori('akomodasiNominal'),
        akomodasiKeterangan: null,
        laundryNominal: totalPerKategori('laundryNominal'),
        laundryKeterangan: null,
        jumlahAkomodasi,
        dibuatOlehId: aktor.id,
        status: StatusSuratTugas.MENUNGGU_SH,
        karyawan: {
          create: karyawanTerpilih.map((item, index) => ({
            urutan: index + 1,
            nrp: item.nrp.trim(),
            nama: item.nama.trim(),
            departemen: item.departemen.trim(),
            jabatan: item.jabatan.trim(),
            uangPerjalananNominal: denganAkomodasi
              ? (item.uangPerjalananNominal ?? null)
              : null,
            uangPerjalananKeterangan: null,
            akomodasiNominal: denganAkomodasi
              ? (item.akomodasiNominal ?? null)
              : null,
            akomodasiKeterangan: null,
            laundryNominal: laundryTersedia
              ? (item.laundryNominal ?? null)
              : null,
            laundryKeterangan: null,
            frekuensiMakan: denganAkomodasi ? durasiHari * 3 : null,
            ruteTransportasiLokal: denganAkomodasi
              ? item.ruteTransportasiLokal?.trim() || null
              : null,
          })),
        },
      },
      include: SURAT_INCLUDE,
    });

    return this.cetakUlang(dibuat.id);
  }

  async setujui(id: number, aktor: AktorSurat) {
    const surat = await this.ambilAtauGagal(id);
    this.wajibBolehSetujuiTahap(aktor, surat.status);
    const persetujuanFinal = surat.status === StatusSuratTugas.MENUNGGU_PJO;

    if (surat.status === StatusSuratTugas.MENUNGGU_SH) {
      await this.prisma.suratTugasDinas.update({
        where: { id },
        data: {
          status: StatusSuratTugas.MENUNGGU_PJO,
          disetujuiShOlehId: aktor.id,
          disetujuiShPada: new Date(),
        },
      });
    } else if (surat.status === StatusSuratTugas.MENUNGGU_PJO) {
      await this.prisma.suratTugasDinas.update({
        where: { id },
        data: {
          status: StatusSuratTugas.DISETUJUI,
          disetujuiPjoOlehId: aktor.id,
          disetujuiPjoPada: new Date(),
        },
      });
    } else {
      throw new BadRequestException('Surat sudah diproses sebelumnya');
    }

    const hasil = await this.cetakUlang(id);

    if (persetujuanFinal) {
      await this.kirimNotifikasiDisetujuiKeKaryawan(hasil);
    }

    return hasil;
  }

  async tolak(id: number, dto: TolakSuratTugasDinasDto, aktor: AktorSurat) {
    const surat = await this.ambilAtauGagal(id);
    this.wajibBolehSetujuiTahap(aktor, surat.status);

    if (
      surat.status !== StatusSuratTugas.MENUNGGU_SH &&
      surat.status !== StatusSuratTugas.MENUNGGU_PJO
    ) {
      throw new BadRequestException('Surat sudah diproses sebelumnya');
    }

    await this.prisma.suratTugasDinas.update({
      where: { id },
      data: {
        status: StatusSuratTugas.DITOLAK,
        alasanTolak: dto.alasan.trim(),
      },
    });

    return this.cetakUlang(id);
  }

  private wajibBolehSetujuiTahap(
    aktor: AktorSurat,
    status: StatusSuratTugas,
  ): void {
    if (!this.bolehSetujuiTahap(aktor, status)) {
      const tahap =
        status === StatusSuratTugas.MENUNGGU_SH ? 'Section Head (SH)' : 'PJO';

      throw new ForbiddenException(
        `Hanya ${tahap} yang dapat memproses surat pada tahap ini`,
      );
    }
  }

  private async ambilAtauGagal(id: number) {
    const surat = await this.prisma.suratTugasDinas.findUnique({
      where: { id },
      include: SURAT_INCLUDE,
    });

    if (!surat) {
      throw new NotFoundException('Surat tugas dinas tidak ditemukan');
    }

    return surat;
  }

  private async cetakUlang(id: number) {
    const surat = await this.prisma.suratTugasDinas.findUniqueOrThrow({
      where: { id },
      include: SURAT_INCLUDE,
    });

    const filePdf = await this.pdf.buatFile(surat);

    return this.prisma.suratTugasDinas.update({
      where: { id },
      data: { filePdf },
      include: SURAT_INCLUDE,
    });
  }

  private async kirimNotifikasiDisetujuiKeKaryawan(
    surat: Prisma.SuratTugasDinasGetPayload<{
      include: typeof SURAT_INCLUDE;
    }>,
  ): Promise<void> {
    if (!surat.karyawan?.length) {
      return;
    }

    try {
      const nrp = [...new Set(surat.karyawan.map((item) => item.nrp))];
      const dataKaryawan = await this.prisma.karyawan.findMany({
        where: { nik: { in: nrp } },
        select: {
          nik: true,
          nama: true,
          gender: true,
          noTelepon: true,
          akun: { select: { phoneNumber: true } },
        },
      });
      const dataPerNrp = new Map(
        dataKaryawan.map((item) => [item.nik, item] as const),
      );
      const formatTanggal = (tanggal: Date) =>
        new Intl.DateTimeFormat('id-ID', {
          day: '2-digit',
          month: 'long',
          year: 'numeric',
        }).format(tanggal);
      const urlPdf = surat.filePdf
        ? this.whatsapp.urlPublikLampiran(surat.filePdf)
        : null;
      const lampiran = urlPdf
        ? {
            url: urlPdf,
            namaFile: `Surat Tugas Dinas ${surat.nomor}.pdf`,
          }
        : undefined;

      await Promise.allSettled(
        surat.karyawan.map(async (penerima) => {
          const master = dataPerNrp.get(penerima.nrp);
          const nomor = master?.noTelepon || master?.akun?.phoneNumber;

          if (!nomor?.trim()) {
            this.logger.warn(
              `Notif STD ${surat.nomor} dilewati untuk NRP ${penerima.nrp}: nomor WA kosong.`,
            );
            return;
          }

          const pesan = [
            '*SURAT TUGAS DINAS DISETUJUI*',
            '',
            `Halo ${sapaanKaryawan(master?.gender)} ${penerima.nama},`,
            'Surat Tugas Dinas Anda telah mendapatkan persetujuan lengkap.',
            '',
            `Nomor: ${surat.nomor}`,
            `Tujuan/Lokasi: ${surat.tujuanLokasi}`,
            `Tanggal: ${formatTanggal(surat.tanggalMulai)} - ${formatTanggal(surat.tanggalSelesai)}`,
            `Keterangan: ${surat.keteranganTugas}`,
            '',
            urlPdf
              ? 'PDF Surat Tugas Dinas terlampir pada pesan ini.'
              : 'Silakan buka HCGA CONNECT untuk melihat PDF Surat Tugas Dinas.',
          ].join('\n');

          await this.whatsapp.kirim(nomor, pesan, lampiran, 'HC');
        }),
      );
    } catch (error) {
      this.logger.error(
        `Gagal menyiapkan notif WA STD ${surat.nomor}: ${(error as Error).message}`,
      );
    }
  }
}
