import { BadRequestException, NotFoundException } from '@nestjs/common';
import { WorkOrderStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { DocumentNumberService } from '../work-orders/document-number.service';
import { HandoversService } from './handovers.service';

function workOrderFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    status: WorkOrderStatus.OPEN,
    handover: null,
    userDepartmentName: 'Budi',
    position: 'Staff',
    department: 'HC',
    location: 'Site A',
    ...overrides,
  };
}

function handoverFixture(overrides: Record<string, unknown> = {}) {
  return { id: 1, workOrderId: 1, ...overrides };
}

function buatService(overrides: {
  workOrder?: unknown;
  handover?: unknown;
  create?: jest.Mock;
  update?: jest.Mock;
  deleteFn?: jest.Mock;
  workOrderUpdate?: jest.Mock;
} = {}) {
  const create = overrides.create ?? jest.fn(({ data }) => Promise.resolve({ id: 1, ...data }));
  const update = overrides.update ?? jest.fn(({ data }) => Promise.resolve({ id: 1, ...data }));
  const deleteFn = overrides.deleteFn ?? jest.fn().mockResolvedValue({});
  const workOrderUpdate = overrides.workOrderUpdate ?? jest.fn().mockResolvedValue({});

  const prisma: any = {
    workOrder: {
      findUnique: jest.fn().mockResolvedValue('workOrder' in overrides ? overrides.workOrder : workOrderFixture()),
      update: workOrderUpdate,
    },
    handover: {
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn().mockResolvedValue('handover' in overrides ? overrides.handover : handoverFixture()),
      create,
      update,
      delete: deleteFn,
    },
  };

  prisma.$transaction = jest.fn((cb: any) => cb(prisma));

  const documentNumber = {
    nextHandoverNumber: jest.fn().mockResolvedValue({ sequenceNumber: 1, documentNumber: 'STP-001' }),
  } as unknown as DocumentNumberService;

  const service = new HandoversService(prisma as PrismaService, documentNumber);

  return { service, prisma, create, update, deleteFn, workOrderUpdate, documentNumber };
}

describe('HandoversService.findOne', () => {
  it('melempar NotFoundException kalau data tidak ada', async () => {
    const { service } = buatService({ handover: null });

    await expect(service.findOne(1)).rejects.toThrow(NotFoundException);
  });
});

describe('HandoversService.create', () => {
  const dtoDasar = { workOrderId: 1, handoverDate: '2026-01-05' };

  it('melempar NotFoundException kalau Work Order tidak ada', async () => {
    const { service } = buatService({ workOrder: null });

    await expect(service.create(dtoDasar as any, 9)).rejects.toThrow(NotFoundException);
  });

  it('menolak Work Order berstatus selain OPEN/ON_PROGRESS', async () => {
    const { service } = buatService({ workOrder: workOrderFixture({ status: WorkOrderStatus.CLOSE }) });

    await expect(service.create(dtoDasar as any, 9)).rejects.toThrow(
      'hanya dapat memilih Work Order OPEN atau ON PROGRESS',
    );
  });

  it('menolak Work Order yang sudah punya Serah Terima', async () => {
    const { service } = buatService({ workOrder: workOrderFixture({ handover: { id: 5 } }) });

    await expect(service.create(dtoDasar as any, 9)).rejects.toThrow('sudah memiliki Serah Terima Pekerjaan');
  });

  it('fallback receiverName/receiverPosition/receiverDepartment/location dari data Work Order', async () => {
    const { service, create } = buatService();

    await service.create(dtoDasar as any, 9);

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          receiverName: 'Budi',
          receiverPosition: 'Staff',
          receiverDepartment: 'HC',
          location: 'Site A',
        }),
      }),
    );
  });

  it('location fallback ke department Work Order kalau location Work Order juga kosong', async () => {
    const { service, create } = buatService({ workOrder: workOrderFixture({ location: null }) });

    await service.create(dtoDasar as any, 9);

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ location: 'HC' }) }),
    );
  });

  it('menggunakan nomor dokumen dari DocumentNumberService', async () => {
    const { service, create, documentNumber } = buatService();

    await service.create(dtoDasar as any, 9);

    expect(documentNumber.nextHandoverNumber).toHaveBeenCalled();
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ stpNumber: 'STP-001', sequenceNumber: 1 }) }),
    );
  });

  it('menutup Work Order (status CLOSE) setelah Serah Terima dibuat', async () => {
    const { service, workOrderUpdate } = buatService();

    await service.create(dtoDasar as any, 9);

    expect(workOrderUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 1 }, data: expect.objectContaining({ status: WorkOrderStatus.CLOSE }) }),
    );
  });

  it('autoCreated selalu false untuk pembuatan manual', async () => {
    const { service, create } = buatService();

    await service.create(dtoDasar as any, 9);

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ autoCreated: false, createdBy: 9 }) }),
    );
  });
});

describe('HandoversService.update', () => {
  it('melempar NotFoundException kalau data tidak ada', async () => {
    const { service } = buatService({ handover: null });

    await expect(service.update(1, {} as any)).rejects.toThrow(NotFoundException);
  });

  it('menolak mengganti workOrderId', async () => {
    const { service } = buatService({ handover: handoverFixture({ workOrderId: 1 }) });

    await expect(service.update(1, { workOrderId: 2 } as any)).rejects.toThrow(
      'Work Order pada Serah Terima tidak dapat diganti',
    );
  });

  it('mengizinkan mengirim workOrderId yang sama (bukan penggantian)', async () => {
    const { service, update } = buatService({ handover: handoverFixture({ workOrderId: 1 }) });

    await expect(service.update(1, { workOrderId: 1, receiverName: 'Siti' } as any)).resolves.toBeDefined();
    expect(update).toHaveBeenCalled();
  });

  it('hanya mengubah field yang eksplisit dikirim', async () => {
    const { service, update } = buatService();

    await service.update(1, { receiverName: '  Siti  ' } as any);

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 1 }, data: { receiverName: 'Siti' } }),
    );
  });

  it('field kosong (setelah trim) disimpan sebagai null', async () => {
    const { service, update } = buatService();

    await service.update(1, { handoverNote: '   ' } as any);

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { handoverNote: null } }),
    );
  });
});

describe('HandoversService.remove', () => {
  it('melempar NotFoundException kalau data tidak ada', async () => {
    const { service } = buatService({ handover: null });

    await expect(service.remove(1)).rejects.toThrow(NotFoundException);
  });

  it('berhasil menghapus data', async () => {
    const { service, deleteFn } = buatService();

    const hasil = await service.remove(1);

    expect(deleteFn).toHaveBeenCalledWith({ where: { id: 1 } });
    expect(hasil.message).toMatch(/berhasil dihapus/);
  });
});
