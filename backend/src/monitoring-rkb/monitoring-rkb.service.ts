import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ItemUnit, KeteranganRkb, Prisma, StatusRkb } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SimpanMonitoringRkbDto } from './dto/monitoring-rkb.dto';
import { MonitoringRkbFileService } from './monitoring-rkb-file.service';

const includeBarang = { barang: { orderBy: { urutan: 'asc' as const } }, project: true };

@Injectable()
export class MonitoringRkbService {
  constructor(private readonly prisma: PrismaService, private readonly file: MonitoringRkbFileService) {}

  daftar(kategori?: string, status?: string, cari?: string, projectId?: number) {
    return this.prisma.monitoringRkb.findMany({
      where: {
        ...(kategori ? { kategori: kategori as any } : {}),
        ...(status ? { status: status as any } : {}),
        ...(projectId ? { projectId } : {}),
        ...(cari?.trim() ? { OR: [
          { nomorRkb: { contains: cari.trim(), mode: 'insensitive' as const } },
          { project: { namaProject: { contains: cari.trim(), mode: 'insensitive' as const } } },
        ] } : {}),
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
    if (!dto.barang?.length) throw new BadRequestException('Minimal satu barang harus diisi saat membuat RKB');
    const project = await this.detailProject(dto.projectId);
    try {
      return await this.prisma.monitoringRkb.create({
        data: {
          tanggal: new Date(dto.tanggal),
          projectId: dto.projectId,
          nomorRkb: dto.nomorRkb.trim(),
          kategori: project.kategori,
          status: this.ringkasStatus((dto.barang ?? []).map((item) => item.status ?? dto.status)),
          createdById,
          barang: { create: (dto.barang ?? []).map((item, urutan) => ({ namaBarang: item.namaBarang.trim(), qty: item.qty, satuan: item.satuan, keterangan: item.keterangan, status: item.status ?? dto.status, urutan })) },
        },
        include: includeBarang,
      });
    } catch (error) { this.tanganiDuplikat(error); }
  }

  async ubah(id: number, dto: SimpanMonitoringRkbDto) {
    await this.detail(id);
    const project = await this.detailProject(dto.projectId);
    try {
      return await this.prisma.$transaction(async (tx) => {
        if (dto.barang !== undefined) {
          await tx.monitoringRkbBarang.deleteMany({ where: { rkbId: id } });
        }
        return tx.monitoringRkb.update({
          where: { id },
          data: {
            tanggal: new Date(dto.tanggal), projectId: dto.projectId, nomorRkb: dto.nomorRkb.trim(), kategori: project.kategori, status: dto.status,
            ...(dto.barang !== undefined ? { barang: { create: dto.barang.map((item, urutan) => ({ namaBarang: item.namaBarang.trim(), qty: item.qty, satuan: item.satuan, keterangan: item.keterangan, status: item.status ?? dto.status, urutan })) } } : {}),
          },
          include: includeBarang,
        });
      });
    } catch (error) { this.tanganiDuplikat(error); }
  }

  async hapus(id: number) {
    const data = await this.detail(id);
    await this.prisma.monitoringRkb.delete({ where: { id } });
    (data.barang ?? []).forEach((item) => this.file.hapus(item.fotoUrl));
    return { message: 'Data RKB berhasil dihapus' };
  }

  async ubahStatus(id: number, status: StatusRkb) {
    await this.detail(id);
    return this.prisma.monitoringRkb.update({ where: { id }, data: { status }, include: includeBarang });
  }

  daftarProject() {
    return this.prisma.monitoringRkbProject.findMany({
      include: { rkb: { include: { barang: true }, orderBy: [{ tanggal: 'desc' }, { id: 'desc' }] } },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async detailProject(id: number) {
    const project = await this.prisma.monitoringRkbProject.findUnique({
      where: { id },
      include: { rkb: { include: { barang: { orderBy: { urutan: 'asc' } } }, orderBy: [{ tanggal: 'desc' }, { id: 'desc' }] } },
    });
    if (!project) throw new NotFoundException('Project RKB tidak ditemukan');
    return project;
  }

  buatProject(createdById: number, dto: { namaProject: string; kategori: any }) {
    return this.prisma.monitoringRkbProject.create({ data: { namaProject: dto.namaProject.trim(), kategori: dto.kategori, createdById }, include: { rkb: true } });
  }

  async ubahProject(id: number, dto: { namaProject: string; kategori: any }) {
    await this.detailProject(id);
    return this.prisma.$transaction(async (tx) => {
      await tx.monitoringRkb.updateMany({ where: { projectId: id }, data: { kategori: dto.kategori } });
      return tx.monitoringRkbProject.update({ where: { id }, data: { namaProject: dto.namaProject.trim(), kategori: dto.kategori }, include: { rkb: true } });
    });
  }

  async hapusProject(id: number) {
    const project = await this.detailProject(id);
    await this.prisma.monitoringRkbProject.delete({ where: { id } });
    (project.rkb ?? []).flatMap((rkb) => rkb.barang ?? []).forEach((item) => this.file.hapus(item.fotoUrl));
    return { message: 'Project RKB berhasil dihapus' };
  }

  async tambahBarang(rkbId: number, barang: { namaBarang: string; qty: number; satuan: ItemUnit; keterangan?: KeteranganRkb; status?: StatusRkb }[]) {
    const rkb = await this.detail(rkbId);
    if (barang.length === 0) throw new BadRequestException('Minimal satu barang harus diisi');
    await this.prisma.monitoringRkbBarang.createMany({
      data: barang.map((item, index) => ({
        rkbId,
        namaBarang: item.namaBarang.trim(),
        qty: item.qty,
        satuan: item.satuan,
        keterangan: item.keterangan,
        status: item.status ?? StatusRkb.WAITING_APPROVAL,
        urutan: rkb.barang.length + index,
      })),
    });
    await this.sinkronStatusRkb(rkbId);
    return this.detail(rkbId);
  }

  async ubahBarang(rkbId: number, barangId: number, barang: { namaBarang: string; qty: number; satuan: ItemUnit; keterangan?: KeteranganRkb; status?: StatusRkb }) {
    await this.detail(rkbId);
    const lama = await this.prisma.monitoringRkbBarang.findFirst({ where: { id: barangId, rkbId } });
    if (!lama) throw new NotFoundException('Barang RKB tidak ditemukan');
    await this.prisma.monitoringRkbBarang.update({
      where: { id: barangId },
      data: { namaBarang: barang.namaBarang.trim(), qty: barang.qty, satuan: barang.satuan, keterangan: barang.keterangan, ...(barang.status ? { status: barang.status } : {}) },
    });
    return this.detail(rkbId);
  }

  async unggahFotoBarang(rkbId: number, barangId: number, foto?: Express.Multer.File) {
    await this.detail(rkbId);
    const barang = await this.prisma.monitoringRkbBarang.findFirst({ where: { id: barangId, rkbId } });
    if (!barang) throw new NotFoundException('Barang RKB tidak ditemukan');
    if (!foto) throw new BadRequestException('Foto barang wajib diunggah');
    const fotoUrl = this.file.simpan(foto);
    try {
      const hasil = await this.prisma.monitoringRkbBarang.update({ where: { id: barangId }, data: { fotoUrl } });
      this.file.hapus(barang.fotoUrl);
      return hasil;
    } catch (error) {
      this.file.hapus(fotoUrl);
      throw error;
    }
  }

  async hapusBarang(rkbId: number, barangId: number) {
    await this.detail(rkbId);
    const barang = await this.prisma.monitoringRkbBarang.findFirst({ where: { id: barangId, rkbId } });
    const hasil = await this.prisma.monitoringRkbBarang.deleteMany({ where: { id: barangId, rkbId } });
    if (hasil.count === 0) throw new NotFoundException('Barang RKB tidak ditemukan');
    this.file.hapus(barang?.fotoUrl);
    await this.sinkronStatusRkb(rkbId);
    return { message: 'Barang RKB berhasil dihapus' };
  }

  async ubahStatusBarang(rkbId: number, barangId: number, status: StatusRkb) {
    await this.detail(rkbId);
    const barang = await this.prisma.monitoringRkbBarang.findFirst({ where: { id: barangId, rkbId } });
    if (!barang) throw new NotFoundException('Barang RKB tidak ditemukan');
    await this.prisma.monitoringRkbBarang.update({ where: { id: barangId }, data: { status } });
    await this.sinkronStatusRkb(rkbId);
    return this.detail(rkbId);
  }

  private ringkasStatus(statuses: StatusRkb[]) {
    if (statuses.length > 0 && statuses.every((status) => status === StatusRkb.CLOSE)) return StatusRkb.CLOSE;
    if (statuses.some((status) => status === StatusRkb.WAITING_APPROVAL)) return StatusRkb.WAITING_APPROVAL;
    return StatusRkb.WAITING_SUPPLY;
  }

  private async sinkronStatusRkb(rkbId: number) {
    const semua = await this.prisma.monitoringRkbBarang.findMany({ where: { rkbId }, select: { status: true } });
    await this.prisma.monitoringRkb.update({ where: { id: rkbId }, data: { status: this.ringkasStatus(semua.map((item) => item.status)) } });
  }

  private tanganiDuplikat(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new BadRequestException('Nomor RKB sudah digunakan');
    }
    throw error;
  }
}
