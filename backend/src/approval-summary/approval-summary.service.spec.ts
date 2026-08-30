import { UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ApprovalSummaryService } from './approval-summary.service';

function buatService(overrides: {
  workOrderCount?: jest.Mock;
  suratCount?: jest.Mock;
  epromCounts?: jest.Mock;
} = {}) {
  const workOrderCount = overrides.workOrderCount ?? jest.fn().mockResolvedValue(0);
  const suratCount = overrides.suratCount ?? jest.fn().mockResolvedValue(0);
  const epromCounts = overrides.epromCounts ?? jest.fn().mockResolvedValue(0);
  const prisma = {
    workOrder: { count: workOrderCount },
    suratTugasDinas: { count: suratCount },
    shopDrawing: { count: epromCounts },
    materialApproval: { count: epromCounts },
    metodePekerjaan: { count: epromCounts },
    sertifikasiPekerjaan: { count: epromCounts },
    peralatanList: { count: epromCounts },
    checklistKonstruksi: { count: epromCounts },
    iBPR: { count: epromCounts },
    jSA: { count: epromCounts },
    opnamePekerjaan: { count: epromCounts },
    asBuildDrawing: { count: epromCounts },
    komisioning: { count: epromCounts },
    serahTerima: { count: epromCounts },
    masaPemeliharaanChecklist: { count: epromCounts },
    bASerahTerima: { count: epromCounts },
  } as unknown as PrismaService;
  const service = new ApprovalSummaryService(prisma);

  return { service, workOrderCount, suratCount, epromCounts };
}

describe('ApprovalSummaryService.ringkasan — Work Order', () => {
  it('GRUP_LEADER cuma dihitung dari tahap MENUNGGU_GL', async () => {
    const { service, workOrderCount } = buatService();

    await service.ringkasan({ role: UserRole.GRUP_LEADER });

    expect(workOrderCount).toHaveBeenCalledWith({ where: { statusApproval: 'MENUNGGU_GL' } });
  });

  it('SECTION_HEAD cuma dihitung dari tahap MENUNGGU_SH', async () => {
    const { service, workOrderCount } = buatService();

    await service.ringkasan({ role: UserRole.SECTION_HEAD });

    expect(workOrderCount).toHaveBeenCalledWith({ where: { statusApproval: 'MENUNGGU_SH' } });
  });

  it('PJO cuma dihitung dari tahap MENUNGGU_PJO', async () => {
    const { service, workOrderCount } = buatService();

    await service.ringkasan({ role: UserRole.PJO });

    expect(workOrderCount).toHaveBeenCalledWith({ where: { statusApproval: 'MENUNGGU_PJO' } });
  });

  it('ADMIN dihitung dari SEMUA tahap sekaligus', async () => {
    const { service, workOrderCount } = buatService();

    await service.ringkasan({ role: UserRole.ADMIN });

    expect(workOrderCount).toHaveBeenCalledWith({
      where: { statusApproval: { in: ['MENUNGGU_GL', 'MENUNGGU_SH', 'MENUNGGU_PJO'] } },
    });
  });

  it('role yang tidak relevan (mis. KARYAWAN) tidak memicu query, hasilnya 0', async () => {
    const { service, workOrderCount } = buatService();

    const hasil = await service.ringkasan({ role: UserRole.KARYAWAN });

    expect(workOrderCount).not.toHaveBeenCalled();
    expect(hasil.workOrders).toBe(0);
  });
});

describe('ApprovalSummaryService.ringkasan — Surat Tugas Dinas', () => {
  it('SECTION_HEAD cuma dihitung dari MENUNGGU_SH, PJO dari MENUNGGU_PJO', async () => {
    const { service, suratCount } = buatService();

    await service.ringkasan({ role: UserRole.SECTION_HEAD });
    expect(suratCount).toHaveBeenLastCalledWith({ where: { status: 'MENUNGGU_SH' } });

    await service.ringkasan({ role: UserRole.PJO });
    expect(suratCount).toHaveBeenLastCalledWith({ where: { status: 'MENUNGGU_PJO' } });
  });

  it('role tanpa wewenang approve (mis. GRUP_LEADER) hasilnya 0', async () => {
    const { service, suratCount } = buatService();

    const hasil = await service.ringkasan({ role: UserRole.GRUP_LEADER });

    expect(suratCount).not.toHaveBeenCalled();
    expect(hasil.suratTugasDinas).toBe(0);
  });
});

describe('ApprovalSummaryService.ringkasan — e-ProM', () => {
  it.each([UserRole.OWNER, UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.SECTION_HEAD])(
    'role %s (setara Owner) ikut menjumlahkan pending dari semua jenis dokumen e-ProM',
    async (role) => {
      const { service, epromCounts } = buatService({ epromCounts: jest.fn().mockResolvedValue(2) });

      const hasil = await service.ringkasan({ role });

      expect(epromCounts).toHaveBeenCalledTimes(14);
      expect(hasil.eprom).toBe(28); // 14 jenis dokumen x 2
    },
  );

  it('role yang bukan setara Owner (mis. GRUP_LEADER) tidak ikut hitung e-ProM', async () => {
    const { service, epromCounts } = buatService({ epromCounts: jest.fn().mockResolvedValue(5) });

    const hasil = await service.ringkasan({ role: UserRole.GRUP_LEADER });

    expect(epromCounts).not.toHaveBeenCalled();
    expect(hasil.eprom).toBe(0);
  });
});
