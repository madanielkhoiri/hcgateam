import { BadRequestException, Injectable, NotFoundException, Optional } from '@nestjs/common';
import { DivisiPengaduan, StatusPengaduan } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePengaduanLayananDto } from './dto/create-pengaduan-layanan.dto';
import { UbahStatusPengaduanLayananDto } from './dto/ubah-status-pengaduan-layanan.dto';
import { WebPushService } from '../web-push/web-push.service';
import * as fs from 'fs';
import * as path from 'path';

const JUMLAH_BULAN_TREN = 6;
const LOKASI_TAMBANG = new Set([
  'CSA MONTE BARU', 'CSA MONTE SUPPORT', 'CSA MONTE GIBSON', 'WORKSHOP',
  'OFFICE PLANT', 'WAREHOUSE', 'OFFICE BARU', 'OFFICE LAMA',
  'REFUELING SARANA', 'OFFICE FUEL',
]);
const KATEGORI_ADUAN = new Set(['LISTRIK', 'AIR', 'AC', 'FURNITURE', 'KEBERSIHAN', 'KEAMANAN', 'KAMAR MANDI', 'BANGUNAN', 'LAINNYA']);
const JENIS_LAPORAN = new Set(['NORMAL', 'HIGH', 'URGENT']);

@Injectable()
export class PengaduanLayananService {
  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly webPush?: WebPushService,
  ) {}

  async create(
    dto: CreatePengaduanLayananDto,
    pengirimId: number,
    foto: { urlFoto: string; namaFile: string }[],
  ) {
    const butuhLokasi = dto.divisi !== DivisiPengaduan.HC;

    if (butuhLokasi && !dto.lokasi) {
      throw new BadRequestException('Lokasi (Tambang/Mess) wajib dipilih untuk divisi GA/Civil');
    }

    if (butuhLokasi && !dto.nrpPelapor?.trim()) {
      throw new BadRequestException('NRP pelapor wajib diisi');
    }
    if (butuhLokasi && !dto.namaPelapor?.trim()) {
      throw new BadRequestException('Nama pelapor wajib diisi');
    }
    if (butuhLokasi && dto.lokasi === 'TAMBANG' && !LOKASI_TAMBANG.has(dto.detailLokasi?.trim().toUpperCase() ?? '')) {
      throw new BadRequestException('Lokasi Tambang wajib dipilih dari daftar yang tersedia');
    }
    if (butuhLokasi && dto.lokasi === 'MESS' && (!dto.gedung?.trim() || !dto.lantai?.trim() || !dto.kamarArea?.trim())) {
      throw new BadRequestException('Gedung, lantai, dan kamar/area Mess wajib diisi');
    }
    if (butuhLokasi && !KATEGORI_ADUAN.has(dto.kategori?.trim().toUpperCase() ?? '')) {
      throw new BadRequestException('Kategori laporan wajib dipilih');
    }
    if (butuhLokasi && !JENIS_LAPORAN.has(dto.jenisLaporan?.trim().toUpperCase() ?? '')) {
      throw new BadRequestException('Jenis laporan wajib dipilih');
    }
    if (butuhLokasi && !dto.deskripsiAduan?.trim()) {
      throw new BadRequestException('Keluhan atau kerusakan wajib dijelaskan');
    }

    if (foto.length === 0) {
      throw new BadRequestException('Minimal 1 foto wajib dilampirkan pada Aduan Layanan');
    }

    return this.prisma.pengaduanLayanan.create({
      data: {
        divisi: dto.divisi,
        rating: dto.rating,
        komentar: dto.komentar?.trim() || null,
        deskripsiAduan: dto.deskripsiAduan?.trim() || null,
        lokasi: butuhLokasi ? dto.lokasi : null,
        nrpPelapor: butuhLokasi ? dto.nrpPelapor?.trim() : null,
        namaPelapor: butuhLokasi ? dto.namaPelapor?.trim() : null,
        detailLokasi: dto.lokasi === 'TAMBANG' ? dto.detailLokasi?.trim().toUpperCase() : null,
        gedung: dto.lokasi === 'MESS' ? dto.gedung?.trim().toUpperCase() : null,
        lantai: dto.lokasi === 'MESS' ? dto.lantai?.trim() : null,
        kamarArea: dto.lokasi === 'MESS' ? dto.kamarArea?.trim() : null,
        kategori: butuhLokasi ? dto.kategori?.trim().toUpperCase() : null,
        jenisLaporan: butuhLokasi ? dto.jenisLaporan?.trim().toUpperCase() : null,
        pengirimId,
        foto: { create: foto },
      },
      include: { foto: true },
    });
  }

  /** Approve/Hold/Reject oleh admin — catatan wajib untuk Hold & Reject, opsional untuk Approve. */
  async ubahStatus(id: number, dto: UbahStatusPengaduanLayananDto, aktorId: number) {
    const pengaduan = await this.prisma.pengaduanLayanan.findUnique({ where: { id } });

    if (!pengaduan) {
      throw new NotFoundException('Pengaduan tidak ditemukan');
    }

    if (pengaduan.divisi && pengaduan.divisi !== DivisiPengaduan.GA) {
      throw new BadRequestException('Pengaduan HC tidak memiliki proses Approve, Hold, atau Reject');
    }

    if (dto.status !== StatusPengaduan.DISETUJUI && dto.status !== StatusPengaduan.SELESAI && !dto.catatanAdmin?.trim()) {
      throw new BadRequestException('Catatan wajib diisi untuk Hold/Reject');
    }

    const hasil = await this.prisma.pengaduanLayanan.update({
      where: { id },
      data: {
        status: dto.status,
        progress: dto.status === StatusPengaduan.SELESAI ? 100 : (dto.progress ?? pengaduan.progress),
        catatanAdmin: dto.catatanAdmin?.trim() || null,
        diprosesOlehId: aktorId,
        diprosesPada: new Date(),
      },
      include: { diprosesOleh: { select: { id: true, name: true } } },
    });
    if (this.webPush && pengaduan.pengirimId) {
      await this.webPush.sendToUser(pengaduan.pengirimId, {
        title: `Pengaduan ${dto.status === StatusPengaduan.DISETUJUI ? 'disetujui' : dto.status === StatusPengaduan.DITAHAN ? 'ditahan' : 'ditolak'}`,
        body: dto.catatanAdmin?.trim() || 'Status pengaduan layanan Anda telah diperbarui.',
        url: '/hc/pengaduan',
      });
    }
    return hasil;
  }

  async hapus(id: number) {
    const pengaduan = await this.prisma.pengaduanLayanan.findUnique({
      where: { id },
      include: { foto: { select: { urlFoto: true } } },
    });

    if (!pengaduan) {
      throw new NotFoundException('Pengaduan tidak ditemukan');
    }

    await this.prisma.pengaduanLayanan.delete({ where: { id } });

    for (const foto of pengaduan.foto) {
      const namaFile = path.basename(foto.urlFoto);
      const lokasiFile = path.resolve(process.cwd(), 'uploads', 'pengaduan-layanan', namaFile);
      try {
        if (fs.existsSync(lokasiFile)) fs.unlinkSync(lokasiFile);
      } catch {
        // Data pengaduan tetap berhasil dihapus meskipun berkas lama tidak tersedia.
      }
    }

    return { message: 'Pengaduan berhasil dihapus' };
  }

  async rekap(divisi: DivisiPengaduan, bulan?: number, tahun?: number, pengirimId?: number) {
    const sekarang = new Date();
    const bulanDipilih = bulan ?? sekarang.getMonth() + 1;
    const tahunDipilih = tahun ?? sekarang.getFullYear();

    const awalBulan = new Date(tahunDipilih, bulanDipilih - 1, 1);
    const akhirBulan = new Date(tahunDipilih, bulanDipilih, 1);

    const daftarBulanIni = await this.prisma.pengaduanLayanan.findMany({
      where: { divisi, ...(pengirimId ? { pengirimId } : {}), createdAt: { gte: awalBulan, lt: akhirBulan } },
      include: {
        pengirim: { select: { id: true, name: true } },
        foto: { select: { id: true, urlFoto: true, namaFile: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const jumlahPengaduan = daftarBulanIni.length;
    const daftarDenganRating = daftarBulanIni.filter(
      (item): item is typeof item & { rating: number } => item.rating !== null,
    );
    const rataRata = daftarDenganRating.length
      ? daftarDenganRating.reduce((total, item) => total + item.rating, 0) /
        daftarDenganRating.length
      : 0;

    const distribusiBintang: Record<1 | 2 | 3 | 4 | 5, number> = {
      1: 0,
      2: 0,
      3: 0,
      4: 0,
      5: 0,
    };

    for (const item of daftarDenganRating) {
      const bintang = item.rating as 1 | 2 | 3 | 4 | 5;
      if (distribusiBintang[bintang] !== undefined) {
        distribusiBintang[bintang] += 1;
      }
    }

    const tren = await this.hitungTrenBulanan(divisi, tahunDipilih, bulanDipilih);

    return {
      divisi,
      bulan: bulanDipilih,
      tahun: tahunDipilih,
      rataRata: Math.round(rataRata * 100) / 100,
      jumlahPengaduan,
      distribusiBintang,
      daftar: daftarBulanIni.map((item) => ({
        id: item.id,
        rating: item.rating,
        komentar: item.komentar,
        deskripsiAduan: item.deskripsiAduan,
        foto: item.foto,
        lokasi: item.lokasi,
        nrpPelapor: item.nrpPelapor,
        namaPelapor: item.namaPelapor,
        detailLokasi: item.detailLokasi,
        gedung: item.gedung,
        lantai: item.lantai,
        kamarArea: item.kamarArea,
        kategori: item.kategori,
        jenisLaporan: item.jenisLaporan,
        status: item.status,
        progress: item.progress,
        catatanAdmin: item.catatanAdmin,
        pengirim: item.pengirim.name,
        createdAt: item.createdAt,
      })),
      tren,
    };
  }

  async daftar(divisi: DivisiPengaduan, bulan?: number, tahun?: number, pengirimId?: number) {
    const hasil = await this.rekap(divisi, bulan, tahun, pengirimId);
    return { divisi: hasil.divisi, bulan: hasil.bulan, tahun: hasil.tahun, daftar: hasil.daftar };
  }

  private async hitungTrenBulanan(
    divisi: DivisiPengaduan,
    tahunAcuan: number,
    bulanAcuan: number,
  ) {
    const awalRentang = new Date(tahunAcuan, bulanAcuan - JUMLAH_BULAN_TREN, 1);
    const akhirRentang = new Date(tahunAcuan, bulanAcuan, 1);

    const data = await this.prisma.pengaduanLayanan.findMany({
      where: { divisi, createdAt: { gte: awalRentang, lt: akhirRentang } },
      select: { rating: true, createdAt: true },
    });

    const hasil: Array<{
      bulan: number;
      tahun: number;
      label: string;
      rataRata: number;
      jumlah: number;
    }> = [];

    for (let geser = JUMLAH_BULAN_TREN - 1; geser >= 0; geser -= 1) {
      const acuan = new Date(tahunAcuan, bulanAcuan - 1 - geser, 1);
      const bulanIni = acuan.getMonth();
      const tahunIni = acuan.getFullYear();

      const punyaBulanIni = data.filter(
        (item) =>
          item.rating !== null &&
          item.createdAt.getMonth() === bulanIni &&
          item.createdAt.getFullYear() === tahunIni,
      ) as Array<(typeof data)[number] & { rating: number }>;

      const rataRata = punyaBulanIni.length
        ? punyaBulanIni.reduce((total, item) => total + item.rating, 0) /
          punyaBulanIni.length
        : 0;

      hasil.push({
        bulan: bulanIni + 1,
        tahun: tahunIni,
        label: new Intl.DateTimeFormat('id-ID', {
          month: 'short',
          year: 'numeric',
        }).format(acuan),
        rataRata: Math.round(rataRata * 100) / 100,
        jumlah: punyaBulanIni.length,
      });
    }

    return hasil;
  }
}
