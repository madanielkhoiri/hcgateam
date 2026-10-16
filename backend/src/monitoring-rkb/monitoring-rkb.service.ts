import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SimpanMonitoringRkbDto } from './dto/monitoring-rkb.dto';

const includeBarang = { barang: { orderBy: { urutan: 'asc' as const } } };

@Injectable()
export class MonitoringRkbService {
  constructor(private readonly prisma: PrismaService) {}

  daftar(kategori?: string, status?: string, cari?: string) {
    return this.prisma.monitoringRkb.findMany({
      where: {
        ...(kategori ? { kategori: kategori as any } : {}),
        ...(status ? { status: status as any } : {}),
        ...(cari?.trim() ? { nomorRkb: { contains: cari.trim(), mode: 'insensitive' as const } } : {}),
      },
      include: includeBarang,
      orderBy: [{ tanggal: 'desc' }, { id: 'desc' }],
    });
  }

  async detail(id: number) {
    const data = await this.prisma.monitoringRkb.findUnique({ where: { id }, include: includeBarang });
    if (!data) throw new NotFoundException('Data RKB tidak ditemukan');
    return data;
  }

  async buat(createdById: number, dto: SimpanMonitoringRkbDto) {
    try {
      return await this.prisma.monitoringRkb.create({
        data: {
          tanggal: new Date(dto.tanggal),
          nomorRkb: dto.nomorRkb.trim(),
          kategori: dto.kategori,
          status: dto.status,
          createdById,
          barang: { create: (dto.barang ?? []).map((item, urutan) => ({ namaBarang: item.namaBarang.trim(), qty: item.qty, satuan: item.satuan.trim(), urutan })) },
        },
        include: includeBarang,
      });
    } catch (error) { this.tanganiDuplikat(error); }
  }

  async ubah(id: number, dto: SimpanMonitoringRkbDto) {
    await this.detail(id);
    try {
      return await this.prisma.$transaction(async (tx) => {
        if (dto.barang !== undefined) {
          await tx.monitoringRkbBarang.deleteMany({ where: { rkbId: id } });
        }
        return tx.monitoringRkb.update({
          where: { id },
          data: {
            tanggal: new Date(dto.tanggal), nomorRkb: dto.nomorRkb.trim(), kategori: dto.kategori, status: dto.status,
            ...(dto.barang !== undefined ? { barang: { create: dto.barang.map((item, urutan) => ({ namaBarang: item.namaBarang.trim(), qty: item.qty, satuan: item.satuan.trim(), urutan })) } } : {}),
          },
          include: includeBarang,
        });
      });
    } catch (error) { this.tanganiDuplikat(error); }
  }

  async hapus(id: number) {
    await this.detail(id);
    await this.prisma.monitoringRkb.delete({ where: { id } });
    return { message: 'Data RKB berhasil dihapus' };
  }

  async tambahBarang(rkbId: number, barang: { namaBarang: string; qty: number; satuan: string }[]) {
    const rkb = await this.detail(rkbId);
    if (barang.length === 0) throw new BadRequestException('Minimal satu barang harus diisi');
    await this.prisma.monitoringRkbBarang.createMany({
      data: barang.map((item, index) => ({
        rkbId,
        namaBarang: item.namaBarang.trim(),
        qty: item.qty,
        satuan: item.satuan.trim(),
        urutan: rkb.barang.length + index,
      })),
    });
    return this.detail(rkbId);
  }

  async ubahBarang(rkbId: number, barangId: number, barang: { namaBarang: string; qty: number; satuan: string }) {
    await this.detail(rkbId);
    const lama = await this.prisma.monitoringRkbBarang.findFirst({ where: { id: barangId, rkbId } });
    if (!lama) throw new NotFoundException('Barang RKB tidak ditemukan');
    await this.prisma.monitoringRkbBarang.update({
      where: { id: barangId },
      data: { namaBarang: barang.namaBarang.trim(), qty: barang.qty, satuan: barang.satuan.trim() },
    });
    return this.detail(rkbId);
  }

  async hapusBarang(rkbId: number, barangId: number) {
    await this.detail(rkbId);
    const hasil = await this.prisma.monitoringRkbBarang.deleteMany({ where: { id: barangId, rkbId } });
    if (hasil.count === 0) throw new NotFoundException('Barang RKB tidak ditemukan');
    return { message: 'Barang RKB berhasil dihapus' };
  }

  private tanganiDuplikat(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new BadRequestException('Nomor RKB sudah digunakan');
    }
    throw error;
  }
}
