// ==================================================
// FILE: backend/src/approval-summary/approval-summary.service.ts
// FUNGSI: Hitung berapa banyak item yang menunggu approval DARI akun yang
// sedang login, per modul — dipakai buat badge angka di kartu dashboard
// (GA/HC/CIVIL), supaya penyetuju langsung tahu di kartu mana ada yang
// perlu ditindaklanjuti tanpa harus buka satu-satu.
//
// Mencakup modul yang aturan approval-nya sudah dipahami/dikonfirmasi betul:
// Work Order (GL->SH->PJO), Surat Tugas Dinas (SH->PJO), e-ProM (memakai
// logic yang sama persis dengan EpromDashboardService), dan Deklarasi
// Dinas (pengajuan/nota/saldo — penyetuju dikonfirmasi: Admin/Admin
// HC/Section Head, lihat deklarasi-akses.bantuan.ts).
//
// MCU tidak perlu ditambah di sini — modul itu sudah punya ringkasan
// sendiri (GET /mcu/ringkasan), dipakai ulang langsung oleh frontend.
// ==================================================

import { Injectable } from '@nestjs/common';
import { StatusApprovalEprom, StatusApprovalWorkOrder, StatusSuratTugas, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ROLE_PENYETUJU_DEKLARASI } from '../deklarasi-dinas/bantuan/deklarasi-akses.bantuan';

export type AktorRingkasApproval = { role: UserRole };

const ROLE_ADMIN: UserRole[] = [UserRole.ADMIN, UserRole.SUPER_ADMIN];
/** Sama seperti EpromAksesService.ROLE_SETARA_OWNER. */
const ROLE_EPROM_APPROVER: UserRole[] = [
  UserRole.OWNER,
  UserRole.ADMIN,
  UserRole.SUPER_ADMIN,
  UserRole.SECTION_HEAD,
];

@Injectable()
export class ApprovalSummaryService {
  constructor(private readonly prisma: PrismaService) {}

  async ringkasan(aktor: AktorRingkasApproval) {
    const [workOrders, suratTugasDinas, eprom, deklarasiPengajuan, deklarasiNota, deklarasiSaldo] =
      await Promise.all([
        this.hitungWorkOrder(aktor),
        this.hitungSuratTugasDinas(aktor),
        this.hitungEprom(aktor),
        this.hitungDeklarasiPengajuan(aktor),
        this.hitungDeklarasiNota(aktor),
        this.hitungDeklarasiSaldo(aktor),
      ]);

    return { workOrders, suratTugasDinas, eprom, deklarasiPengajuan, deklarasiNota, deklarasiSaldo };
  }

  /** GL lihat MENUNGGU_GL, SH lihat MENUNGGU_SH, PJO lihat MENUNGGU_PJO. Admin lihat semua tahap. */
  private async hitungWorkOrder(aktor: AktorRingkasApproval): Promise<number> {
    if (ROLE_ADMIN.includes(aktor.role)) {
      return this.prisma.workOrder.count({
        where: {
          statusApproval: {
            in: [
              StatusApprovalWorkOrder.MENUNGGU_GL,
              StatusApprovalWorkOrder.MENUNGGU_SH,
              StatusApprovalWorkOrder.MENUNGGU_PJO,
            ],
          },
        },
      });
    }

    const statusTahap = this.tahapWorkOrderUntukRole(aktor.role);
    if (!statusTahap) return 0;

    return this.prisma.workOrder.count({ where: { statusApproval: statusTahap } });
  }

  private tahapWorkOrderUntukRole(role: UserRole): StatusApprovalWorkOrder | null {
    if (role === UserRole.GRUP_LEADER) return StatusApprovalWorkOrder.MENUNGGU_GL;
    if (role === UserRole.SECTION_HEAD) return StatusApprovalWorkOrder.MENUNGGU_SH;
    if (role === UserRole.PJO) return StatusApprovalWorkOrder.MENUNGGU_PJO;
    return null;
  }

  /** SH lihat MENUNGGU_SH, PJO lihat MENUNGGU_PJO. Admin lihat semua tahap. */
  private async hitungSuratTugasDinas(aktor: AktorRingkasApproval): Promise<number> {
    if (ROLE_ADMIN.includes(aktor.role)) {
      return this.prisma.suratTugasDinas.count({
        where: {
          status: { in: [StatusSuratTugas.MENUNGGU_SH, StatusSuratTugas.MENUNGGU_PJO] },
        },
      });
    }

    const statusTahap = this.tahapSuratUntukRole(aktor.role);
    if (!statusTahap) return 0;

    return this.prisma.suratTugasDinas.count({ where: { status: statusTahap } });
  }

  private tahapSuratUntukRole(role: UserRole): StatusSuratTugas | null {
    if (role === UserRole.SECTION_HEAD) return StatusSuratTugas.MENUNGGU_SH;
    if (role === UserRole.PJO) return StatusSuratTugas.MENUNGGU_PJO;
    return null;
  }

  /** Owner/Admin/Super Admin/Section Head — sama seperti EpromAksesService.ROLE_SETARA_OWNER. */
  private async hitungEprom(aktor: AktorRingkasApproval): Promise<number> {
    if (!ROLE_EPROM_APPROVER.includes(aktor.role)) {
      return 0;
    }

    const PENDING = StatusApprovalEprom.PENDING;
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

    return jumlahPending.reduce((a, b) => a + b, 0);
  }

  /** Deklarasi berstatus DIAJUKAN menunggu diverifikasi/disetujui. */
  private async hitungDeklarasiPengajuan(aktor: AktorRingkasApproval): Promise<number> {
    if (!ROLE_PENYETUJU_DEKLARASI.includes(aktor.role)) return 0;

    return this.prisma.deklarasi.count({ where: { status: 'DIAJUKAN' } });
  }

  /** Nota yang OCR-nya sudah selesai tapi belum diverifikasi/ditolak manusia. */
  private async hitungDeklarasiNota(aktor: AktorRingkasApproval): Promise<number> {
    if (!ROLE_PENYETUJU_DEKLARASI.includes(aktor.role)) return 0;

    return this.prisma.nota.count({ where: { statusVerifikasi: 'OCR_SELESAI' } });
  }

  /** Bukti pengembalian saldo yang sudah diupload karyawan, menunggu disetujui/ditolak. */
  private async hitungDeklarasiSaldo(aktor: AktorRingkasApproval): Promise<number> {
    if (!ROLE_PENYETUJU_DEKLARASI.includes(aktor.role)) return 0;

    return this.prisma.saldo.count({ where: { statusBuktiPengembalian: 'DIAJUKAN' } });
  }
}
