// ==================================================
// FILE: backend/src/eprom/project/eprom-project.service.ts
// FUNGSI: Daftar & detail Project (dibuka dari Kontrak) untuk Project Area
// ==================================================

import { Injectable, NotFoundException } from '@nestjs/common';
import { StatusApprovalEprom } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { EpromAksesService } from '../common/eprom-akses.service';
import { AktorEprom } from '../common/eprom-aktor';

const HANYA_PENDING = { where: { status: StatusApprovalEprom.PENDING } };

@Injectable()
export class EpromProjectService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly akses: EpromAksesService,
  ) {}

  async daftar(aktor: AktorEprom) {
    const projects = await this.prisma.project.findMany({
      where: this.akses.isOwner(aktor)
        ? undefined
        : { kontrak: { vendorId: aktor.vendorId ?? -1 } },
      include: {
        kontrak: {
          select: {
            id: true,
            nomorKontrak: true,
            tanggalMulai: true,
            tanggalSelesai: true,
            tender: { select: { id: true, namaTender: true } },
            vendor: { select: { id: true, namaVendor: true } },
          },
        },
        _count: {
          select: {
            shopDrawings: HANYA_PENDING,
            materialApprovals: HANYA_PENDING,
            metodePekerjaan: HANYA_PENDING,
            sertifikasiPekerjaan: HANYA_PENDING,
            peralatanList: HANYA_PENDING,
            komisioningAlatBerat: HANYA_PENDING,
            checklistKonstruksi: HANYA_PENDING,
            ibpr: HANYA_PENDING,
            jsa: HANYA_PENDING,
            opnamePekerjaan: HANYA_PENDING,
            asBuildDrawing: HANYA_PENDING,
            komisioning: HANYA_PENDING,
            serahTerima: HANYA_PENDING,
            masaPemeliharaanChecklist: HANYA_PENDING,
            baSerahTerima: HANYA_PENDING,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return projects.map((p) => ({
      ...p,
      pendingEngineer:
        p._count.shopDrawings +
        p._count.materialApprovals +
        p._count.metodePekerjaan +
        p._count.sertifikasiPekerjaan +
        p._count.peralatanList +
        p._count.komisioningAlatBerat,
      pendingKonstruksi: p._count.checklistKonstruksi + p._count.ibpr + p._count.jsa,
      pendingFinancial: p._count.opnamePekerjaan,
      pendingClosing:
        p._count.asBuildDrawing +
        p._count.komisioning +
        p._count.serahTerima +
        p._count.masaPemeliharaanChecklist +
        p._count.baSerahTerima,
    }));
  }

  async detail(aktor: AktorEprom, id: number) {
    await this.akses.wajibAksesProject(aktor, id);

    const project = await this.prisma.project.findUnique({
      where: { id },
      include: {
        kontrak: {
          select: {
            id: true,
            nomorKontrak: true,
            tanggalMulai: true,
            tanggalSelesai: true,
            tender: { select: { id: true, namaTender: true } },
            vendor: { select: { id: true, namaVendor: true } },
          },
        },
      },
    });

    if (!project) {
      throw new NotFoundException('Project tidak ditemukan');
    }

    return project;
  }
}
