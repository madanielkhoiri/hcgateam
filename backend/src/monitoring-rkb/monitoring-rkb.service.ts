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
          barang: { create: dto.barang.map((item, urutan) => ({ namaBarang: item.namaBarang.trim(), qty: item.qty, satuan: item.satuan.trim(), urutan })) },
        },
        include: includeBarang,
      });
    } catch (error) { this.tanganiDuplikat(error); }
  }

  async ubah(id: number, dto: SimpanMonitoringRkbDto) {
    await this.detail(id);
    try {
      return await this.prisma.$transaction(async (tx) => {
        await tx.monitoringRkbBarang.deleteMany({ where: { rkbId: id } });
        return tx.monitoringRkb.update({
          where: { id },
          data: {
            tanggal: new Date(dto.tanggal), nomorRkb: dto.nomorRkb.trim(), kategori: dto.kategori, status: dto.status,
            barang: { create: dto.barang.map((item, urutan) => ({ namaBarang: item.namaBarang.trim(), qty: item.qty, satuan: item.satuan.trim(), urutan })) },
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

  private tanganiDuplikat(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new BadRequestException('Nomor RKB sudah digunakan');
    }
    throw error;
  }
}
