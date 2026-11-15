import { BadRequestException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { ToolBorrowingService } from './tool-borrowing.service';
import { resolveInspectionKey, templateByKey } from './tool-inspection-templates';

describe('resolveInspectionKey', () => {
  it.each([
    ['MESIN GERINDA TANGAN', 'MESIN_GERINDA'],
    ['BOR CORDLESS MAKITA', 'BOR_CORDLESS'],
    ['GUNTING TASO', 'GUNTING_TASO'],
    ['GUNTING BESI 24"', 'GUNTING_BESI'],
    ['BODY HARNESS DOUBLE LANYARD', 'BODY_HARNESS'],
    ['MULTIMETER', 'UMUM'],
  ])('%s -> %s', (name, key) => {
    expect(resolveInspectionKey(null, name)).toBe(key);
  });

  it('pilihan Master Alat mengalahkan tebakan nama', () => {
    expect(resolveInspectionKey('SCAFFOLDING', 'MESIN GERINDA')).toBe('SCAFFOLDING');
  });
});

describe('ToolBorrowingService.borrow', () => {
  const employee = { id: 5, nrp: '12345', name: 'BUDI', isActive: true };
  const tool = { id: 9, name: 'MESIN GERGAJI', inspectionType: null, isActive: true };
  const items = templateByKey('MESIN_GERGAJI')!.items;

  function setup() {
    const tx = {
      toolAsset: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
      toolLoan: { create: jest.fn().mockImplementation(({ data }) => Promise.resolve(data)) },
    };
    const prisma = {
      toolBorrowEmployee: { findUnique: jest.fn().mockResolvedValue(employee) },
      toolAsset: { findUnique: jest.fn().mockResolvedValue(tool) },
      $transaction: jest.fn((fn: (t: typeof tx) => unknown) => fn(tx)),
    };
    const access = { wajibGudang: jest.fn() };
    const service = new ToolBorrowingService(prisma as never, access as never);
    return { service, tx };
  }
  const actor = { id: 1, role: UserRole.GUDANG, nama: 'Petugas' };

  it('NRP manual + inspeksi lengkap menyimpan metode MANUAL dan hasil inspeksi', async () => {
    const { service, tx } = setup();
    await service.borrow(actor, 9, {
      nrp: '12345',
      inspection: { items: items.map(() => ({ condition: 'BAIK' })) },
    });
    const data = tx.toolLoan.create.mock.calls[0][0].data;
    expect(data.borrowMethod).toBe('MANUAL');
    expect(data.borrowInspection.templateKey).toBe('MESIN_GERGAJI');
    expect(data.borrowInspection.items).toHaveLength(items.length);
    expect(data.borrowInspection.inspectedBy).toEqual({ nrp: '12345', name: 'BUDI' });
  });

  it('menolak bila inspeksi belum lengkap', async () => {
    const { service } = setup();
    await expect(
      service.borrow(actor, 9, { nrp: '12345', inspection: { items: [{ condition: 'BAIK' }] } }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('menolak butir Tidak Baik tanpa kode bahaya dan menolak kode H', async () => {
    const { service } = setup();
    const tanpaKode = items.map((_, i) => ({ condition: i === 0 ? 'TIDAK_BAIK' : 'BAIK' }));
    await expect(service.borrow(actor, 9, { nrp: '12345', inspection: { items: tanpaKode } }))
      .rejects.toThrow(/kode bahaya/);
    const kodeH = items.map((_, i) => (i === 0 ? { condition: 'TIDAK_BAIK', hazardCode: 'H' } : { condition: 'BAIK' }));
    await expect(service.borrow(actor, 9, { nrp: '12345', inspection: { items: kodeH } }))
      .rejects.toThrow(/tidak boleh dipinjam/);
  });

  it('wajib scan QR atau isi NRP', async () => {
    const { service } = setup();
    await expect(service.borrow(actor, 9, { inspection: { items: [] } })).rejects.toThrow(/Scan QR atau isi NRP/);
  });
});
