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

  private tanggalIndonesia(tanggal: Date) {
    return new Intl.DateTimeFormat('id-ID', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      timeZone: 'Asia/Makassar',
    }).format(tanggal);
  }

  private tanggalDariInput(value?: string) {
    if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
    const tanggal = new Date(`${value}T00:00:00.000Z`);
    return Number.isNaN(tanggal.getTime()) ? null : tanggal;
  }

  private buatPesan(
    karyawan: { nama: string; gender?: string | null },
    data: {
      status: 'DISETUJUI' | 'DITRANSFER' | 'DITOLAK';
      nominal: number;
      alasan?: string;
      tanggalStatus: Date;
    },
  ) {
    const sapaan =
      karyawan.gender === 'LAKI_LAKI'
        ? 'Bapak'
        : karyawan.gender === 'PEREMPUAN'
          ? 'Ibu'
          : 'Bapak/Ibu';
    const pembuka = `Yth. ${sapaan} *${karyawan.nama}*,`;
    const nominal = `Rp ${data.nominal.toLocaleString('id-ID')},-`;
    const tanggal = this.tanggalIndonesia(data.tanggalStatus);

    if (data.status === 'DITRANSFER') {
      return [
        pembuka,
        '',
        `Kwitansi obat Anda sudah diproses transfer pada tanggal ${tanggal}.`,
        `Nominal: *${nominal}*`,
        '',
        'Silakan hubungi HC bila membutuhkan informasi lebih lanjut.',
      ].join('\n');
    }
    if (data.status === 'DITOLAK') {
      return [
        pembuka,
        '',
        `Kwitansi obat Anda ditolak oleh HC sebesar ${nominal}`,
        `Alasan: *${data.alasan?.trim() || '-'}*`,
        '',
        'Silakan hubungi Admin Dept & HC bila membutuhkan informasi lebih lanjut.',
      ].join('\n');
    }
    return [
      pembuka,
      '',
      `Pengajuan kwitansi obat Anda telah disetujui sebesar ${nominal} pada tanggal ${tanggal}.`,
      '',
      'Estimasi pencairan H+1 Minggu s/d H+2 Minggu dari tanggal approve (jika tidak ada perubahan dari HO).',
      '',
      'Notifikasi berikutnya akan dikirim setelah dana ditransfer.',
      '',
      'Terima kasih.',
    ].join('\n');
  }

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
    const barisExcel: Array<{
      nrp: string;
      namaExcel: string;
      jumlah: number;
      jumlahKwitansi: number;
    }> = [];

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

      barisExcel.push({
        nrp,
        namaExcel,
        jumlah: Math.round(jumlah),
        jumlahKwitansi: 1,
      });
    }

    if (!barisExcel.length) {
      throw new BadRequestException(
        'Tidak ada data kwitansi yang valid pada sheet Template HO',
      );
    }

    const karyawan = await this.prisma.karyawan.findMany({
      where: { nik: { in: [...new Set(barisExcel.map((item) => item.nrp))] } },
      select: { id: true, nik: true, nama: true },
    });
    const perNrp = new Map(karyawan.map((item) => [item.nik, item] as const));
    const data: BarisImportKwitansi[] = barisExcel.map((item) => {
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
      totalBaris: data.length,
      totalKaryawan: data.length,
      totalKaryawanUnik: new Set(data.map((item) => item.nrp)).size,
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
        status?: 'DISETUJUI' | 'DITRANSFER' | 'DITOLAK';
        nominal?: number;
        tanggalTransfer?: string;
        alasan?: string;
      }>;
      kirimNotifikasi?: boolean;
    },
    dibuatOlehId: number,
  ) {
    const input = Array.isArray(dto.data) ? dto.data : [];
    const dataValid: Array<{
      nrp: string;
      status: 'DISETUJUI' | 'DITRANSFER' | 'DITOLAK';
      nominal: number;
      tanggalStatus: Date;
      alasan?: string;
    }> = [];
    for (const item of input) {
      const nrp = String(item.nrp ?? '').trim();
      const status = item.status;
      const nominal = Math.round(Number(item.nominal));
      if (!nrp || !['DISETUJUI', 'DITRANSFER', 'DITOLAK'].includes(String(status))) continue;
      if (!Number.isFinite(nominal) || nominal <= 0) {
        throw new BadRequestException(
          `Nominal kwitansi wajib diisi untuk NRP ${nrp}`,
        );
      }
      const tanggalTransfer = this.tanggalDariInput(item.tanggalTransfer);
      if (status === 'DITRANSFER' && !tanggalTransfer)
        throw new BadRequestException(`Tanggal transfer wajib diisi untuk NRP ${nrp}`);
      if (status === 'DITOLAK' && !item.alasan?.trim())
        throw new BadRequestException(`Alasan penolakan wajib diisi untuk NRP ${nrp}`);
      dataValid.push({
        nrp,
        status: status!,
        nominal,
        tanggalStatus: tanggalTransfer ?? new Date(),
        ...(item.alasan?.trim() ? { alasan: item.alasan.trim() } : {}),
      });
    }
    if (!dataValid.length)
      throw new BadRequestException('Tidak ada data valid untuk disimpan');

    const nrpUnik = [...new Set(dataValid.map((item) => item.nrp))];
    const karyawan = await this.prisma.karyawan.findMany({
      where: { nik: { in: nrpUnik } },
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
    const karyawanPerNrp = new Map(
      karyawan.map((item) => [item.nik, item] as const),
    );
    const dataTersimpan = dataValid.filter((item) =>
      karyawanPerNrp.has(item.nrp),
    );

    await this.prisma.kwitansiObatNotifikasi.createMany({
      data: dataTersimpan.map((nilai) => {
        const item = karyawanPerNrp.get(nilai.nrp)!;
        return {
          karyawanId: item.id,
          status: nilai.status,
          nominal: nilai.nominal,
          alasan: nilai.alasan,
          tanggalStatus: nilai.tanggalStatus,
          dibuatOlehId,
        };
      }),
    });

    let terkirim = 0;
    let gagal = 0;
    let tanpaNomor = 0;
    if (dto.kirimNotifikasi) {
      const ringkasanPerNrp = new Map<
        string,
        { status: 'DISETUJUI' | 'DITRANSFER' | 'DITOLAK'; nominal: number; alasan?: string; tanggalStatus: Date }
      >();
      for (const nilai of dataTersimpan) {
        const lama = ringkasanPerNrp.get(nilai.nrp);
        ringkasanPerNrp.set(nilai.nrp, {
          status: nilai.status,
          nominal: (lama?.nominal ?? 0) + (nilai.nominal ?? 0),
          alasan: nilai.alasan ?? lama?.alasan,
          tanggalStatus: nilai.tanggalStatus,
        });
      }
      const hasil = await Promise.allSettled(
        [...ringkasanPerNrp.entries()].map(async ([nrp, nilai]) => {
          const item = karyawanPerNrp.get(nrp)!;
          const nomor = item.noTelepon || item.akun?.phoneNumber;
          if (!nomor?.trim()) {
            tanpaNomor += 1;
            return;
          }
          const pesan = this.buatPesan(item, nilai);
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
      tersimpan: dataTersimpan.length,
      tidakDitemukan: dataValid.length - dataTersimpan.length,
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
      tanggalTransfer?: string;
    },
    dibuatOlehId: number,
  ) {
    const karyawan = await this.prisma.karyawan.findUnique({
      where: { id: Number(dto.karyawanId) },
    });
    if (!karyawan) throw new BadRequestException('Karyawan tidak ditemukan');
    if (!dto.nominal || Number(dto.nominal) <= 0)
      throw new BadRequestException(
        'Nominal kwitansi wajib diisi',
      );
    const tanggalTransfer = this.tanggalDariInput(dto.tanggalTransfer);
    if (dto.status === 'DITRANSFER' && !tanggalTransfer)
      throw new BadRequestException('Tanggal transfer wajib diisi');
    if (dto.status === 'DITOLAK' && !dto.alasan?.trim())
      throw new BadRequestException('Alasan wajib diisi untuk status ditolak');
    const tanggalStatus = tanggalTransfer ?? new Date();
    const pesan = this.buatPesan(karyawan, {
      status: dto.status,
      nominal: Number(dto.nominal),
      alasan: dto.alasan,
      tanggalStatus,
    });
    const log = await this.prisma.kwitansiObatNotifikasi.create({
      data: {
        karyawanId: karyawan.id,
        status: dto.status,
        nominal: dto.nominal ? Number(dto.nominal) : undefined,
        alasan: dto.alasan?.trim() || undefined,
        tanggalStatus,
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
      tanggalTransfer?: string;
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
