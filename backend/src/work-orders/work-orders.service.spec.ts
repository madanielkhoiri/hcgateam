import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { StatusApprovalWorkOrder, UserRole, WorkOrderStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { DocumentNumberService } from './document-number.service';
import { WorkOrdersService } from './work-orders.service';

function buatWorkOrder(overrides: Partial<{ statusApproval: StatusApprovalWorkOrder; status: WorkOrderStatus }> = {}) {
  return {
    id: 1,
    status: overrides.status ?? WorkOrderStatus.OPEN,
    statusApproval: overrides.statusApproval ?? StatusApprovalWorkOrder.MENUNGGU_GL,
  };
}

function buatService(workOrderTerkini: unknown) {
  const findUnique = jest.fn().mockResolvedValue(workOrderTerkini);
  const update = jest.fn(({ data }) => Promise.resolve({ ...(workOrderTerkini as object), ...data }));
  const handoverDeleteMany = jest.fn().mockResolvedValue({ count: 0 });
  const handoverFindUnique = jest.fn().mockResolvedValue(null);
  const prisma = {
    workOrder: { findUnique, update },
    handover: { deleteMany: handoverDeleteMany, findUnique: handoverFindUnique },
    // update() membungkus perubahannya dalam $transaction — jalankan callback-nya
    // langsung dengan tx yang memakai mock yang sama, supaya assertion tetap
    // mengarah ke satu tempat.
    $transaction: jest.fn((callback: (tx: unknown) => unknown) =>
      callback({
        workOrder: { update, findUnique },
        handover: { deleteMany: handoverDeleteMany, findUnique: handoverFindUnique },
      }),
    ),
  } as unknown as PrismaService;
  const documentNumber = {} as unknown as DocumentNumberService;
  const service = new WorkOrdersService(prisma, documentNumber);

  return { service, findUnique, update };
}

const GL = { id: 10, role: UserRole.GRUP_LEADER };
const SH = { id: 11, role: UserRole.SECTION_HEAD };
const PJO = { id: 12, role: UserRole.PJO };
const ADMIN = { id: 1, role: UserRole.ADMIN };
const KARYAWAN = { id: 20, role: UserRole.KARYAWAN };

describe('WorkOrdersService.setujui — alur bertingkat GL -> SH -> PJO', () => {
  it('GL menyetujui tahap MENUNGGU_GL -> pindah ke MENUNGGU_SH, catat siapa & kapan', async () => {
    const { service, update } = buatService(buatWorkOrder({ statusApproval: StatusApprovalWorkOrder.MENUNGGU_GL }));

    await service.setujui(1, GL);

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          statusApproval: StatusApprovalWorkOrder.MENUNGGU_SH,
          disetujuiGlOlehId: 10,
          disetujuiGlPada: expect.any(Date),
        }),
      }),
    );
  });

  it('menolak Section Head menyetujui tahap MENUNGGU_GL (bukan tahapnya)', async () => {
    const { service } = buatService(buatWorkOrder({ statusApproval: StatusApprovalWorkOrder.MENUNGGU_GL }));

    await expect(service.setujui(1, SH)).rejects.toThrow(ForbiddenException);
  });

  it('Section Head menyetujui tahap MENUNGGU_SH -> pindah ke MENUNGGU_PJO', async () => {
    const { service, update } = buatService(buatWorkOrder({ statusApproval: StatusApprovalWorkOrder.MENUNGGU_SH }));

    await service.setujui(1, SH);

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          statusApproval: StatusApprovalWorkOrder.MENUNGGU_PJO,
          disetujuiShOlehId: 11,
        }),
      }),
    );
  });

  it('menolak GL menyetujui tahap MENUNGGU_SH (bukan tahapnya)', async () => {
    const { service } = buatService(buatWorkOrder({ statusApproval: StatusApprovalWorkOrder.MENUNGGU_SH }));

    await expect(service.setujui(1, GL)).rejects.toThrow(ForbiddenException);
  });

  it('PJO menyetujui tahap MENUNGGU_PJO -> status akhir DISETUJUI', async () => {
    const { service, update } = buatService(buatWorkOrder({ statusApproval: StatusApprovalWorkOrder.MENUNGGU_PJO }));

    await service.setujui(1, PJO);

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          statusApproval: StatusApprovalWorkOrder.DISETUJUI,
          disetujuiPjoOlehId: 12,
        }),
      }),
    );
  });

  it('menolak Section Head/GL menyetujui tahap MENUNGGU_PJO (bukan tahapnya)', async () => {
    const { service } = buatService(buatWorkOrder({ statusApproval: StatusApprovalWorkOrder.MENUNGGU_PJO }));

    await expect(service.setujui(1, SH)).rejects.toThrow(ForbiddenException);
    await expect(service.setujui(1, GL)).rejects.toThrow(ForbiddenException);
  });

  it('Admin/Super Admin boleh menyetujui tahap apa pun (bypass role tahap)', async () => {
    const { service, update } = buatService(buatWorkOrder({ statusApproval: StatusApprovalWorkOrder.MENUNGGU_GL }));

    await service.setujui(1, ADMIN);

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ disetujuiGlOlehId: 1 }) }),
    );
  });

  it('karyawan biasa tidak boleh menyetujui tahap apa pun', async () => {
    const { service } = buatService(buatWorkOrder({ statusApproval: StatusApprovalWorkOrder.MENUNGGU_GL }));

    await expect(service.setujui(1, KARYAWAN)).rejects.toThrow(ForbiddenException);
  });

  it('menolak approve ulang kalau sudah DISETUJUI', async () => {
    const { service } = buatService(buatWorkOrder({ statusApproval: StatusApprovalWorkOrder.DISETUJUI }));

    await expect(service.setujui(1, ADMIN)).rejects.toThrow('Work Order sudah diproses sebelumnya');
  });

  it('menolak approve kalau sudah DITOLAK', async () => {
    const { service } = buatService(buatWorkOrder({ statusApproval: StatusApprovalWorkOrder.DITOLAK }));

    await expect(service.setujui(1, ADMIN)).rejects.toThrow('Work Order sudah diproses sebelumnya');
  });
});

describe('WorkOrdersService.tolak', () => {
  it('GL bisa menolak di tahap MENUNGGU_GL dengan alasan', async () => {
    const { service, update } = buatService(buatWorkOrder({ statusApproval: StatusApprovalWorkOrder.MENUNGGU_GL }));

    await service.tolak(1, { alasan: 'Anggaran belum tersedia' }, GL);

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          statusApproval: StatusApprovalWorkOrder.DITOLAK,
          alasanTolakApproval: 'Anggaran belum tersedia',
        }),
      }),
    );
  });

  it('menolak (ForbiddenException) kalau yang mencoba tolak bukan role tahap itu', async () => {
    const { service } = buatService(buatWorkOrder({ statusApproval: StatusApprovalWorkOrder.MENUNGGU_SH }));

    await expect(service.tolak(1, { alasan: 'x' }, GL)).rejects.toThrow(ForbiddenException);
  });

  it('tidak bisa menolak Work Order yang sudah DISETUJUI', async () => {
    const { service } = buatService(buatWorkOrder({ statusApproval: StatusApprovalWorkOrder.DISETUJUI }));

    await expect(service.tolak(1, { alasan: 'x' }, ADMIN)).rejects.toThrow(
      'Work Order sudah diproses sebelumnya',
    );
  });

  it('tidak bisa menolak Work Order yang sudah DITOLAK sebelumnya', async () => {
    const { service } = buatService(buatWorkOrder({ statusApproval: StatusApprovalWorkOrder.DITOLAK }));

    await expect(service.tolak(1, { alasan: 'x' }, ADMIN)).rejects.toThrow(
      'Work Order sudah diproses sebelumnya',
    );
  });
});

describe('WorkOrdersService.create — status ON_PROGRESS/CLOSE tidak boleh dilompati approval', () => {
  it('menolak buat Work Order baru langsung berstatus ON_PROGRESS (belum lolos approval GL/SH/PJO)', async () => {
    const { service } = buatService(null);

    await expect(
      service.create(
        {
          workOrderName: 'Perbaikan AC',
          department: 'GA',
          pic: 'GA_INFRAS',
          jobType: 'Maintenance',
          userDepartmentName: 'HCGA',
          description: 'AC bocor',
          requestedAt: '2026-01-01',
          status: WorkOrderStatus.ON_PROGRESS,
        } as any,
        1,
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('menolak buat Work Order baru langsung berstatus CLOSE', async () => {
    const { service } = buatService(null);

    await expect(
      service.create(
        {
          workOrderName: 'Perbaikan AC',
          department: 'GA',
          pic: 'GA_INFRAS',
          jobType: 'Maintenance',
          userDepartmentName: 'HCGA',
          description: 'AC bocor',
          requestedAt: '2026-01-01',
          status: WorkOrderStatus.CLOSE,
        } as any,
        1,
      ),
    ).rejects.toThrow('belum disetujui GL/SH/PJO');
  });
});

describe('WorkOrdersService.update — ON_PROGRESS/CLOSE butuh statusApproval DISETUJUI', () => {
  it('menolak ubah status ke ON_PROGRESS kalau approval belum DISETUJUI', async () => {
    const { service } = buatService(
      buatWorkOrder({ status: WorkOrderStatus.OPEN, statusApproval: StatusApprovalWorkOrder.MENUNGGU_SH }),
    );

    await expect(
      service.update(1, { status: WorkOrderStatus.ON_PROGRESS } as any, 1),
    ).rejects.toThrow('belum disetujui GL/SH/PJO');
  });

  it('mengizinkan ubah status ke ON_PROGRESS kalau approval sudah DISETUJUI', async () => {
    const { service, update } = buatService(
      buatWorkOrder({ status: WorkOrderStatus.OPEN, statusApproval: StatusApprovalWorkOrder.DISETUJUI }),
    );

    await service.update(1, { status: WorkOrderStatus.ON_PROGRESS } as any, 1);

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: WorkOrderStatus.ON_PROGRESS }) }),
    );
  });
});
