// ==================================================
// FILE: backend/src/eprom/dashboard/eprom-dashboard.service.ts
// FUNGSI: Ringkasan angka + aktivitas terbaru untuk dashboard e-ProM
// ==================================================

import { Injectable } from '@nestjs/common';
import { StatusApprovalEprom, StatusTender, StatusLegalitasVendor } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { EpromProgressService } from '../progress/eprom-progress.service';

const PENDING = StatusApprovalEprom.PENDING;
const APPROVED = StatusApprovalEprom.APPROVED;

type AktivitasTerbaru = {
  pesan: string;
  waktu: Date;
};

@Injectable()
export class EpromDashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly progress: EpromProgressService,
  ) {}

  async ringkasan() {
    const [
      totalProject,
      tenderAktif,
      totalKontrak,
      legalitasBelumLengkap,
      undanganAktif,
      sphFinal,
      tenderTerbaru,
      kontrakTerbaru,
    ] = await Promise.all([
      this.prisma.project.count(),
      this.prisma.tenderProcess.count({
        where: { status: { not: StatusTender.SELESAI } },
      }),
      this.prisma.kontrak.count(),
      this.prisma.vendor.count({
        where: { legalitasStatus: StatusLegalitasVendor.BELUM_LENGKAP },
      }),
      this.prisma.tenderUndangan.findMany({
        where: { tender: { status: { not: StatusTender.SELESAI } } },
        select: { tenderId: true, vendorId: true },
      }),
      this.prisma.tenderSPH.findMany({
        where: { isFinal: true, hargaPenawaran: { not: null } },
        select: { tenderId: true, vendorId: true },
      }),
      this.prisma.tenderProcess.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: { namaTender: true, createdAt: true },
      }),
      this.prisma.kontrak.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: { nomorKontrak: true, createdAt: true },
      }),
    ]);

    const finalSet = new Set(sphFinal.map((s) => `${s.tenderId}-${s.vendorId}`));
    const sphMenungguFinal = undanganAktif.filter(
      (u) => !finalSet.has(`${u.tenderId}-${u.vendorId}`),
    ).length;

    const daftarProject = await this.prisma.project.findMany({
      select: { id: true, namaProject: true },
      orderBy: { createdAt: 'desc' },
    });

    const progressPerProjectMentah = await Promise.all(
      daftarProject.map(async (p) => ({
        id: p.id,
        namaProject: p.namaProject,
        progressPersen: await this.progress.progresFisikProject(p.id),
      })),
    );

    const progressPerProject = progressPerProjectMentah.filter(
      (p): p is { id: number; namaProject: string; progressPersen: number } =>
        p.progressPersen !== null,
    );

    const progressFisikRataRata =
      progressPerProject.length === 0
        ? null
        : Math.round(
            (progressPerProject.reduce((a, p) => a + p.progressPersen, 0) /
              progressPerProject.length) *
              10,
          ) / 10;

    const progressTrendMentah = await Promise.all(
      daftarProject.map(async (p) => ({
        id: p.id,
        namaProject: p.namaProject,
        data: await this.progress.trendMingguan(p.id),
      })),
    );

    const progressTrend = progressTrendMentah.filter((p) => p.data.length > 0);

    const jumlahPending = await Promise.all([
      this.prisma.shopDrawing.count({ where: { status: PENDING } }),
      this.prisma.materialApproval.count({ where: { status: PENDING } }),
      this.prisma.metodePekerjaan.count({ where: { status: PENDING } }),
      this.prisma.sertifikasiPekerjaan.count({ where: { status: PENDING } }),
      this.prisma.peralatanList.count({ where: { status: PENDING } }),
      this.prisma.checklistKonstruksi.count({ where: { status: PENDING } }),
      this.prisma.iBPR.count({ where: { status: PENDING } }),
      this.prisma.jSA.count({ where: { status: PENDING } }),
      this.prisma.opnamePekerjaan.count({ where: { status: PENDING } }),
      this.prisma.asBuildDrawing.count({ where: { status: PENDING } }),
      this.prisma.komisioning.count({ where: { status: PENDING } }),
      this.prisma.serahTerima.count({ where: { status: PENDING } }),
      this.prisma.masaPemeliharaanChecklist.count({ where: { status: PENDING } }),
      this.prisma.bASerahTerima.count({ where: { status: PENDING } }),
    ]);

    const approvalPending = jumlahPending.reduce((a, b) => a + b, 0);

    const opnameTerakhirPerProject = await Promise.all(
      daftarProject.map((p) =>
        this.prisma.opnamePekerjaan.findFirst({
          where: { projectId: p.id, status: APPROVED },
          orderBy: { createdAt: 'desc' },
          select: { progressPersen: true },
        }),
      ),
    );

    const progressKeuanganList = opnameTerakhirPerProject
      .filter((o) => o !== null)
      .map((o) => Number(o.progressPersen));

    const progressKeuanganRataRata =
      progressKeuanganList.length === 0
        ? null
        : Math.round(
            (progressKeuanganList.reduce((a, b) => a + b, 0) / progressKeuanganList.length) * 10,
          ) / 10;

    const aktivitas: AktivitasTerbaru[] = [
      ...tenderTerbaru.map((t) => ({
        pesan: `Tender baru dibuat: ${t.namaTender}`,
        waktu: t.createdAt,
      })),
      ...kontrakTerbaru.map((k) => ({
        pesan: `Kontrak ${k.nomorKontrak} dibuat`,
        waktu: k.createdAt,
      })),
    ]
      .sort((a, b) => b.waktu.getTime() - a.waktu.getTime())
      .slice(0, 6);

    return {
      totalProject,
      tenderAktif,
      totalKontrak,
      sphMenungguFinal,
      legalitasBelumLengkap,
      approvalPending,
      progressFisikRataRata,
      progressKeuanganRataRata,
      progressPerProject,
      progressTrend,
      aktivitasTerbaru: aktivitas,
    };
  }
}
