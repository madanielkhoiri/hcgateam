import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WhatsappService } from '../whatsapp/whatsapp.service';
import * as XLSX from 'xlsx';

type BarisImportKwitansi = {
  nrp: string;
  namaExcel: string;
  namaDatabase: string | null;
  karyawanId: number | null;
  jumlah: number;
  jumlahKwitansi: number;
  cocok: boolean;
};

@Injectable()
export class KwitansiObatService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly whatsapp: WhatsappService,
  ) {}

  async daftarKaryawan(cari?: string) {
    return this.prisma.karyawan.findMany({
      where: {
        ...(cari
          ? {
              OR: [
                { nama: { contains: cari, mode: 'insensitive' } },
                { nik: { contains: cari, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      select: {
        id: true,
        nik: true,
        nama: true,
        gender: true,
        noTelepon: true,
      },
      orderBy: [{ nama: 'asc' }, { nik: 'asc' }],
    });
  }

  async previewImport(file: Buffer) {
    let workbook: XLSX.WorkBook;
    try {
      workbook = XLSX.read(file, { type: 'buffer' });
    } catch {
      throw new BadRequestException('File Excel tidak dapat dibaca');
    }

    const sheet = workbook.Sheets['Template HO'];
    if (!sheet) {
      throw new BadRequestException('Sheet "Template HO" tidak ditemukan');
    }

    const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
      header: 1,
      defval: null,
      raw: true,
    });
    const normalisasiHeader = (value: unknown) =>
      String(value ?? '')
        .trim()
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, ' ')
        .trim();
    const headerIndex = rows.findIndex((row) => {
      const header = row.map(normalisasiHeader);
      return (
        header.includes('NRP') &&
        header.includes('NAMA KARYAWAN') &&
        header.some((item) => item === 'JUMLAH RP' || item === 'JUMLAH')
      );
    });
    if (headerIndex < 0) {
      throw new BadRequestException(
        'Header NRP, NAMA KARYAWAN, dan JUMLAH (Rp.) tidak ditemukan',
      );
    }

    const header = rows[headerIndex].map(normalisasiHeader);
    const nrpIndex = header.indexOf('NRP');
    const namaIndex = header.indexOf('NAMA KARYAWAN');
    const jumlahIndex = header.findIndex(
      (item) => item === 'JUMLAH RP' || item === 'JUMLAH',
    );
    const gabungan = new Map<
      string,
      { nrp: string; namaExcel: string; jumlah: number; jumlahKwitansi: number }
    >();

    for (const row of rows.slice(headerIndex + 1)) {
      const nrp = String(row[nrpIndex] ?? '')
        .trim()
        .replace(/\.0+$/, '');
      const namaExcel = String(row[namaIndex] ?? '').trim();
      const jumlahMentah = row[jumlahIndex];
      const jumlah =
        typeof jumlahMentah === 'number'
          ? jumlahMentah
          : Number(String(jumlahMentah ?? '').replace(/[^0-9.-]/g, ''));
      if (!nrp && !namaExcel && !jumlahMentah) continue;
      if (!nrp || !namaExcel || !Number.isFinite(jumlah) || jumlah <= 0)
        continue;

      const sebelumnya = gabungan.get(nrp);
      gabungan.set(nrp, {
        nrp,
        namaExcel: sebelumnya?.namaExcel ?? namaExcel,
        jumlah: (sebelumnya?.jumlah ?? 0) + Math.round(jumlah),
        jumlahKwitansi: (sebelumnya?.jumlahKwitansi ?? 0) + 1,
      });
    }

    if (!gabungan.size) {
      throw new BadRequestException(
        'Tidak ada data kwitansi yang valid pada sheet Template HO',
      );
    }

    const karyawan = await this.prisma.karyawan.findMany({
      where: { nik: { in: [...gabungan.keys()] } },
      select: { id: true, nik: true, nama: true },
    });
    const perNrp = new Map(karyawan.map((item) => [item.nik, item] as const));
    const data: BarisImportKwitansi[] = [...gabungan.values()].map((item) => {
      const master = perNrp.get(item.nrp);
      return {
        ...item,
        namaDatabase: master?.nama ?? null,
        karyawanId: master?.id ?? null,
        cocok: Boolean(master),
      };
    });

    return {
      sheet: 'Template HO',
      totalBaris: data.reduce((total, item) => total + item.jumlahKwitansi, 0),
      totalKaryawan: data.length,
      totalCocok: data.filter((item) => item.cocok).length,
      totalTidakCocok: data.filter((item) => !item.cocok).length,
      totalNominal: data
        .filter((item) => item.cocok)
        .reduce((total, item) => total + item.jumlah, 0),
      data,
    };
  }

  async importMassal(
    dto: {
      data?: Array<{
        nrp?: string;
        status?: 'DISETUJUI' | 'DITRANSFER';
        nominal?: number;
      }>;
      kirimNotifikasi?: boolean;
    },
    dibuatOlehId: number,
  ) {
    const input = Array.isArray(dto.data) ? dto.data : [];
    const dataPerNrp = new Map<
      string,
      { status: 'DISETUJUI' | 'DITRANSFER'; nominal?: number }
    >();
    for (const item of input) {
      const nrp = String(item.nrp ?? '').trim();
      const status = item.status;
      const nominal = Math.round(Number(item.nominal));
      if (!nrp || (status !== 'DISETUJUI' && status !== 'DITRANSFER')) continue;
      if (
        status === 'DITRANSFER' &&
        (!Number.isFinite(nominal) || nominal <= 0)
      ) {
        throw new BadRequestException(
          `Nominal transfer wajib diisi untuk NRP ${nrp}`,
        );
      }
      dataPerNrp.set(nrp, {
        status,
        ...(status === 'DITRANSFER' ? { nominal } : {}),
      });
    }
    if (!dataPerNrp.size)
      throw new BadRequestException('Tidak ada data valid untuk disimpan');

    const karyawan = await this.prisma.karyawan.findMany({
      where: { nik: { in: [...dataPerNrp.keys()] } },
      select: {
        id: true,
        nik: true,
        nama: true,
        gender: true,
        noTelepon: true,
        akun: { select: { phoneNumber: true } },
      },
    });
    if (!karyawan.length)
      throw new BadRequestException('NRP tidak cocok dengan Database Karyawan');

    await this.prisma.kwitansiObatNotifikasi.createMany({
      data: karyawan.map((item) => {
        const nilai = dataPerNrp.get(item.nik)!;
        return {
          karyawanId: item.id,
          status: nilai.status,
          nominal: nilai.status === 'DITRANSFER' ? nilai.nominal : undefined,
          dibuatOlehId,
        };
      }),
    });

    let terkirim = 0;
    let gagal = 0;
    let tanpaNomor = 0;
    if (dto.kirimNotifikasi) {
      const hasil = await Promise.allSettled(
        karyawan.map(async (item) => {
          const nomor = item.noTelepon || item.akun?.phoneNumber;
          if (!nomor?.trim()) {
            tanpaNomor += 1;
            return;
          }
          const nilai = dataPerNrp.get(item.nik)!;
          const sapaan =
            item.gender === 'LAKI_LAKI'
              ? 'Bapak'
              : item.gender === 'PEREMPUAN'
                ? 'Ibu'
                : 'Bapak/Ibu';
          const pesan =
            nilai.status === 'DITRANSFER'
              ? [
                  '*KWITANSI OBAT DITRANSFER*',
                  '',
                  `Yth. ${sapaan} *${item.nama}*,`,
                  '',
                  'Penggantian biaya kwitansi obat Anda telah ditransfer.',
                  '',
                  `*Jumlah:* Rp ${nilai.nominal!.toLocaleString('id-ID')}`,
                  '',
                  'Silakan periksa rekening Anda. Jika membutuhkan informasi lebih lanjut, hubungi tim HC.',
                  '',
                  'Terima kasih.',
                ].join('\n')
              : [
                  '*KWITANSI OBAT DISETUJUI*',
                  '',
                  `Yth. ${sapaan} *${item.nama}*,`,
                  '',
                  'Pengajuan kwitansi obat Anda telah disetujui dan sedang diproses untuk pembayaran.',
                  '',
                  'Notifikasi berikutnya akan dikirim setelah dana ditransfer.',
                  '',
                  'Terima kasih.',
                ].join('\n');
          const sukses = await this.whatsapp.kirim(
            nomor,
            pesan,
            undefined,
            'HC',
          );
          if (sukses) terkirim += 1;
          else gagal += 1;
        }),
      );
      gagal += hasil.filter((item) => item.status === 'rejected').length;
    }

    return {
      tersimpan: karyawan.length,
      tidakDitemukan: dataPerNrp.size - karyawan.length,
      notifikasi: dto.kirimNotifikasi ? { terkirim, gagal, tanpaNomor } : null,
    };
  }

  async daftar() {
    const logs = await this.prisma.kwitansiObatNotifikasi.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    const ids = [...new Set(logs.map((item) => item.karyawanId))];
    const employees = await this.prisma.karyawan.findMany({
      where: { id: { in: ids } },
      select: {
        id: true,
        nama: true,
        nik: true,
        gender: true,
        noTelepon: true,
      },
    });
    const byId = new Map(employees.map((item) => [item.id, item]));
    return logs.map((item) => ({
      ...item,
      karyawan: byId.get(item.karyawanId) ?? null,
    }));
  }

  async buat(
    dto: {
      karyawanId: number;
      status: 'DISETUJUI' | 'DITRANSFER' | 'DITOLAK';
      nominal?: number;
      alasan?: string;
    },
    dibuatOlehId: number,
  ) {
    const karyawan = await this.prisma.karyawan.findUnique({
      where: { id: Number(dto.karyawanId) },
    });
    if (!karyawan) throw new BadRequestException('Karyawan tidak ditemukan');
    if (
      dto.status === 'DITRANSFER' &&
      (!dto.nominal || Number(dto.nominal) <= 0)
    )
      throw new BadRequestException(
        'Nominal wajib diisi untuk status ditransfer',
      );
    if (dto.status === 'DITOLAK' && !dto.alasan?.trim())
      throw new BadRequestException('Alasan wajib diisi untuk status ditolak');
    const sapaan =
      karyawan.gender === 'LAKI_LAKI'
        ? 'Bapak'
        : karyawan.gender === 'PEREMPUAN'
          ? 'Ibu'
          : 'Yth.';
    const nama = `*${karyawan.nama}*`;
    const statusText =
      dto.status === 'DISETUJUI'
        ? 'disetujui'
        : dto.status === 'DITRANSFER'
          ? 'telah ditransfer'
          : 'ditolak';
    let pesan = `Yth. ${sapaan} ${nama},\n\nKwitansi obat Anda ${statusText} oleh HC.`;
    if (dto.status === 'DITRANSFER')
      pesan += `\nNominal: Rp ${Number(dto.nominal).toLocaleString('id-ID')}`;
    if (dto.status === 'DITOLAK') pesan += `\nAlasan: ${dto.alasan!.trim()}`;
    pesan += '\n\nSilakan hubungi HC bila membutuhkan informasi lebih lanjut.';
    const log = await this.prisma.kwitansiObatNotifikasi.create({
      data: {
        karyawanId: karyawan.id,
        status: dto.status,
        nominal: dto.nominal ? Number(dto.nominal) : undefined,
        alasan: dto.alasan?.trim() || undefined,
        dibuatOlehId,
      },
    });
    const terkirim = await this.whatsapp.kirim(
      karyawan.noTelepon,
      pesan,
      undefined,
      'HC',
    );
    return { ...log, terkirim };
  }

  async ubahStatus(
    id: number,
    dto: {
      status: 'DISETUJUI' | 'DITRANSFER' | 'DITOLAK';
      nominal?: number;
      alasan?: string;
    },
  ) {
    const old = await this.prisma.kwitansiObatNotifikasi.findUnique({
      where: { id },
    });
    if (!old) throw new BadRequestException('Rekapan tidak ditemukan');
    const result = await this.buat(
      { ...dto, karyawanId: old.karyawanId },
      old.dibuatOlehId,
    );
    // Perubahan status tetap menjadi satu baris rekapan, bukan membuat duplikat.
    await this.prisma.kwitansiObatNotifikasi.delete({ where: { id: old.id } });
    return { ...result, id: old.id, rekapanBaru: false };
  }

  async hapus(id: number) {
    await this.prisma.kwitansiObatNotifikasi.delete({ where: { id } });
    return { berhasil: true };
  }
}
