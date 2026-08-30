import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { EpromAksesService } from '../common/eprom-akses.service';
import { AktorEprom } from '../common/eprom-aktor';
import { EpromProjectService } from './eprom-project.service';

function aktor(role: UserRole, overrides: Partial<AktorEprom> = {}): AktorEprom {
  return { id: 1, username: 'test', role, ...overrides };
}

function countFixture(overrides: Partial<Record<string, number>> = {}) {
  const semuaKategori = [
    'shopDrawings', 'materialApprovals', 'metodePekerjaan', 'sertifikasiPekerjaan',
    'peralatanList', 'komisioningAlatBerat', 'checklistKonstruksi', 'ibpr', 'jsa',
    'opnamePekerjaan', 'asBuildDrawing', 'komisioning', 'serahTerima',
    'masaPemeliharaanChecklist', 'baSerahTerima',
  ];
  const dasar: Record<string, number> = Object.fromEntries(semuaKategori.map((k) => [k, 0]));
  return { ...dasar, ...overrides };
}

function buatService(overrides: { projects?: unknown[]; projectDetail?: unknown; projectAkses?: unknown } = {}) {
  const prisma = {
    project: {
      findMany: jest.fn().mockResolvedValue(overrides.projects ?? []),
      findUnique: jest.fn().mockResolvedValue('projectDetail' in overrides ? overrides.projectDetail : { id: 1 }),
    },
  } as unknown as PrismaService;

  if ('projectAkses' in overrides) {
    (prisma as any).__akses = overrides.projectAkses;
  }

  const akses = new EpromAksesService({
    project: { findUnique: jest.fn().mockResolvedValue('projectAkses' in overrides ? overrides.projectAkses : { kontrak: { vendorId: 1 } }) },
  } as unknown as PrismaService);

  const service = new EpromProjectService(prisma, akses);

  return { service, prisma };
}

describe('EpromProjectService.daftar', () => {
  it('Owner melihat semua project tanpa filter vendorId', async () => {
    const { service, prisma } = buatService({ projects: [] });

    await service.daftar(aktor(UserRole.OWNER));

    expect(prisma.project.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: undefined }),
    );
  });

  it('Vendor hanya melihat project dari kontraknya sendiri (filter vendorId)', async () => {
    const { service, prisma } = buatService({ projects: [] });

    await service.daftar(aktor(UserRole.VENDOR, { vendorId: 5 }));

    expect(prisma.project.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { kontrak: { vendorId: 5 } } }),
    );
  });

  it('Vendor tanpa vendorId difilter ke -1 (tidak match apapun)', async () => {
    const { service, prisma } = buatService({ projects: [] });

    await service.daftar(aktor(UserRole.VENDOR));

    expect(prisma.project.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { kontrak: { vendorId: -1 } } }),
    );
  });

  it('menjumlahkan pendingEngineer dari 6 kategori terkait engineer', async () => {
    const { service } = buatService({
      projects: [{
        id: 1,
        _count: countFixture({ shopDrawings: 1, materialApprovals: 2, metodePekerjaan: 1, sertifikasiPekerjaan: 1, peralatanList: 1, komisioningAlatBerat: 1 }),
      }],
    });

    const [hasil] = await service.daftar(aktor(UserRole.OWNER));

    expect(hasil.pendingEngineer).toBe(7);
  });

  it('menjumlahkan pendingKonstruksi, pendingFinancial, dan pendingClosing dari kategori masing-masing', async () => {
    const { service } = buatService({
      projects: [{
        id: 1,
        _count: countFixture({ checklistKonstruksi: 1, ibpr: 2, jsa: 3, opnamePekerjaan: 4, asBuildDrawing: 1, komisioning: 1, serahTerima: 1, masaPemeliharaanChecklist: 1, baSerahTerima: 1 }),
      }],
    });

    const [hasil] = await service.daftar(aktor(UserRole.OWNER));

    expect(hasil.pendingKonstruksi).toBe(6);
    expect(hasil.pendingFinancial).toBe(4);
    expect(hasil.pendingClosing).toBe(5);
  });
});

describe('EpromProjectService.detail', () => {
  it('menolak Vendor yang mengakses project bukan miliknya', async () => {
    const { service } = buatService({ projectAkses: { kontrak: { vendorId: 999 } } });

    await expect(service.detail(aktor(UserRole.VENDOR, { vendorId: 1 }), 1)).rejects.toThrow(ForbiddenException);
  });

  it('melempar NotFoundException kalau project tidak ada', async () => {
    const { service } = buatService({ projectDetail: null });

    await expect(service.detail(aktor(UserRole.OWNER), 1)).rejects.toThrow(NotFoundException);
  });

  it('mengizinkan Owner mengakses project manapun', async () => {
    const { service } = buatService({ projectDetail: { id: 1 } });

    await expect(service.detail(aktor(UserRole.OWNER), 1)).resolves.toEqual({ id: 1 });
  });
});
