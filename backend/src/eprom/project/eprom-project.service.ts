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

type RingkasanStatus = Record<StatusApprovalEprom, number>;

function ringkasanKosong(): RingkasanStatus {
  return { PENDING: 0, APPROVED: 0, REJECTED: 0 };
}

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

    const projectIds = projects.map((project) => project.id);
    const [shopDrawing, materialApproval, metodePekerjaan, checklistKonstruksi] =
      projectIds.length
        ? await Promise.all([
            this.prisma.shopDrawing.groupBy({
              by: ['projectId', 'status'],
              where: { projectId: { in: projectIds } },
              _count: { _all: true },
            }),
            this.prisma.materialApproval.groupBy({
              by: ['projectId', 'status'],
              where: { projectId: { in: projectIds } },
              _count: { _all: true },
            }),
            this.prisma.metodePekerjaan.groupBy({
              by: ['projectId', 'status'],
              where: { projectId: { in: projectIds } },
              _count: { _all: true },
            }),
            this.prisma.checklistKonstruksi.groupBy({
              by: ['projectId', 'status'],
              where: { projectId: { in: projectIds } },
              _count: { _all: true },
            }),
          ])
        : [[], [], [], []];

    const engineerStatus = new Map<number, RingkasanStatus>();
    const konstruksiStatus = new Map<number, RingkasanStatus>();
    const statusPerTipe = new Map<number, Record<string, RingkasanStatus>>();
    const tambahkan = (
      target: Map<number, RingkasanStatus>,
      rows: { projectId: number; status: StatusApprovalEprom; _count: { _all: number } }[],
    ) => {
      for (const row of rows) {
        const status = target.get(row.projectId) ?? ringkasanKosong();
        status[row.status] += row._count._all;
        target.set(row.projectId, status);
      }
    };

    tambahkan(engineerStatus, shopDrawing);
    tambahkan(engineerStatus, materialApproval);
    tambahkan(engineerStatus, metodePekerjaan);
    tambahkan(konstruksiStatus, checklistKonstruksi);

    const simpanPerTipe = (
      tipe: string,
      rows: { projectId: number; status: StatusApprovalEprom; _count: { _all: number } }[],
    ) => {
      for (const row of rows) {
        const project = statusPerTipe.get(row.projectId) ?? {};
        const status = project[tipe] ?? ringkasanKosong();
        status[row.status] += row._count._all;
        project[tipe] = status;
        statusPerTipe.set(row.projectId, project);
      }
    };
    simpanPerTipe('shop-drawing', shopDrawing);
    simpanPerTipe('material-approval', materialApproval);
    simpanPerTipe('metode-pekerjaan', metodePekerjaan);
    simpanPerTipe('checklist-tahapan', checklistKonstruksi);

    return projects.map((p) => ({
      ...p,
      approvalStatusEngineer: engineerStatus.get(p.id) ?? ringkasanKosong(),
      approvalStatusKonstruksi: konstruksiStatus.get(p.id) ?? ringkasanKosong(),
      approvalStatusPerTipe: statusPerTipe.get(p.id) ?? {},
      approvalStatusShopDrawing:
        statusPerTipe.get(p.id)?.['shop-drawing'] ?? ringkasanKosong(),
      approvalStatusMaterialApproval:
        statusPerTipe.get(p.id)?.['material-approval'] ?? ringkasanKosong(),
      approvalStatusMetodePekerjaan:
        statusPerTipe.get(p.id)?.['metode-pekerjaan'] ?? ringkasanKosong(),
      approvalStatusChecklistTahapan:
        statusPerTipe.get(p.id)?.['checklist-tahapan'] ?? ringkasanKosong(),
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
