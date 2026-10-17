import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SimpanMonitoringProjectDto, TahapanProjectTambang, UbahTahapanProjectDto } from './dto/civil-monitoring-project.dto';

export type AktorMonitoringProject = { id: number; nama?: string; username?: string };

@Injectable()
export class CivilMonitoringProjectService {
  constructor(private readonly prisma: PrismaService) {}

  daftar() {
    return this.prisma.monitoringProjectTambang.findMany({
      orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
    });
  }

  async detail(id: number) {
    const project = await this.prisma.monitoringProjectTambang.findUnique({ where: { id } });
    if (!project) throw new NotFoundException('Pekerjaan tidak ditemukan');
    return project;
  }

  riwayat(id: number) {
    return this.prisma.monitoringProjectTambangRiwayat.findMany({
      where: { projectId: id },
      orderBy: { createdAt: 'desc' },
    });
  }

  async buat(aktor: AktorMonitoringProject, dto: SimpanMonitoringProjectDto) {
    const nama = dto.namaPekerjaan.trim();
    if (!nama) throw new BadRequestException('Nama pekerjaan wajib diisi');
    const actorName = this.namaAktor(aktor);
    return this.prisma.$transaction(async (tx) => {
      const project = await tx.monitoringProjectTambang.create({
        data: {
          namaPekerjaan: nama,
          createdById: aktor.id,
          createdByName: actorName,
          updatedById: aktor.id,
          updatedByName: actorName,
        },
      });
      await tx.monitoringProjectTambangRiwayat.create({
        data: { projectId: project.id, field: 'namaPekerjaan', nilaiSebelum: null, nilaiSesudah: nama, actorId: aktor.id, actorName },
      });
      return project;
    });
  }

  async ubahNama(id: number, aktor: AktorMonitoringProject, dto: SimpanMonitoringProjectDto) {
    const lama = await this.detail(id);
    const nama = dto.namaPekerjaan.trim();
    if (!nama) throw new BadRequestException('Nama pekerjaan wajib diisi');
    if (nama === lama.namaPekerjaan) return lama;
    const actorName = this.namaAktor(aktor);
    return this.prisma.$transaction(async (tx) => {
      const project = await tx.monitoringProjectTambang.update({
        where: { id },
        data: { namaPekerjaan: nama, updatedById: aktor.id, updatedByName: actorName },
      });
      await tx.monitoringProjectTambangRiwayat.create({
        data: { projectId: id, field: 'namaPekerjaan', nilaiSebelum: lama.namaPekerjaan, nilaiSesudah: nama, actorId: aktor.id, actorName },
      });
      return project;
    });
  }

  async ubahTahapan(id: number, aktor: AktorMonitoringProject, dto: UbahTahapanProjectDto) {
    const lama = await this.detail(id);
    const nilaiLama = Boolean(lama[dto.field as TahapanProjectTambang]);
    if (nilaiLama === dto.value) return lama;
    const actorName = this.namaAktor(aktor);
    return this.prisma.$transaction(async (tx) => {
      const project = await tx.monitoringProjectTambang.update({
        where: { id },
        data: { [dto.field]: dto.value, updatedById: aktor.id, updatedByName: actorName },
      });
      await tx.monitoringProjectTambangRiwayat.create({
        data: { projectId: id, field: dto.field, nilaiSebelum: String(nilaiLama), nilaiSesudah: String(dto.value), actorId: aktor.id, actorName },
      });
      return project;
    });
  }

  async hapus(id: number) {
    await this.detail(id);
    await this.prisma.monitoringProjectTambang.delete({ where: { id } });
    return { message: 'Pekerjaan berhasil dihapus' };
  }

  private namaAktor(aktor: AktorMonitoringProject) {
    return aktor.nama?.trim() || aktor.username?.trim() || `User #${aktor.id}`;
  }
}
