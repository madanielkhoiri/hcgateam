import { Injectable } from '@nestjs/common';
import { DivisiPengaduan } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePengaduanLayananDto } from './dto/create-pengaduan-layanan.dto';

const JUMLAH_BULAN_TREN = 6;

@Injectable()
export class PengaduanLayananService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreatePengaduanLayananDto, pengirimId: number) {
    return this.prisma.pengaduanLayanan.create({
      data: {
        divisi: dto.divisi,
        rating: dto.rating,
        komentar: dto.komentar?.trim() || null,
        pengirimId,
      },
    });
  }

  async rekap(divisi: DivisiPengaduan, bulan?: number, tahun?: number) {
    const sekarang = new Date();
    const bulanDipilih = bulan ?? sekarang.getMonth() + 1;
    const tahunDipilih = tahun ?? sekarang.getFullYear();

    const awalBulan = new Date(tahunDipilih, bulanDipilih - 1, 1);
    const akhirBulan = new Date(tahunDipilih, bulanDipilih, 1);

    const daftarBulanIni = await this.prisma.pengaduanLayanan.findMany({
      where: { divisi, createdAt: { gte: awalBulan, lt: akhirBulan } },
      include: { pengirim: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    });

    const jumlahPengaduan = daftarBulanIni.length;
    const rataRata = jumlahPengaduan
      ? daftarBulanIni.reduce((total, item) => total + item.rating, 0) /
        jumlahPengaduan
      : 0;

    const distribusiBintang: Record<1 | 2 | 3 | 4 | 5, number> = {
      1: 0,
      2: 0,
      3: 0,
      4: 0,
      5: 0,
    };

    for (const item of daftarBulanIni) {
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
        pengirim: item.pengirim.name,
        createdAt: item.createdAt,
      })),
      tren,
    };
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
          item.createdAt.getMonth() === bulanIni &&
          item.createdAt.getFullYear() === tahunIni,
      );

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
