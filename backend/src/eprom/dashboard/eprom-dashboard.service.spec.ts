import { StatusApprovalEprom, StatusTender, StatusLegalitasVendor } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { EpromProgressService } from '../progress/eprom-progress.service';
import { EpromDashboardService } from './eprom-dashboard.service';

function buatService(overrides: {
  project?: unknown[];
  tenderAktifCount?: number;
  kontrakCount?: number;
  legalitasBelumLengkap?: number;
  undanganAktif?: unknown[];
  sphFinal?: unknown[];
  tenderTerbaru?: unknown[];
  kontrakTerbaru?: unknown[];
  pendingCounts?: number[];
  opnameTerakhir?: (unknown | null)[];
  progresFisik?: (number | null)[];
  trendMingguan?: unknown[][];
} = {}) {
  const daftarProject = overrides.project ?? [];
  const pendingCounts = overrides.pendingCounts ?? new Array(14).fill(0);

  const countJenisPending = (() => {
    let i = 0;
    return () => Promise.resolve(pendingCounts[i++] ?? 0);
  })();

  const modelPendingCount = { count: jest.fn().mockImplementation(countJenisPending) };

  const opnameFindFirstQueue = [...(overrides.opnameTerakhir ?? daftarProject.map(() => null))];
  const opnameFindFirst = jest.fn().mockImplementation(() => Promise.resolve(opnameFindFirstQueue.shift() ?? null));

  const prisma = {
    project: {
      count: jest.fn().mockResolvedValue(daftarProject.length),
      findMany: jest.fn().mockResolvedValue(daftarProject),
    },
    tenderProcess: {
      count: jest.fn().mockResolvedValue(overrides.tenderAktifCount ?? 0),
      findMany: jest.fn().mockResolvedValue(overrides.tenderTerbaru ?? []),
    },
    kontrak: {
      count: jest.fn().mockResolvedValue(overrides.kontrakCount ?? 0),
      findMany: jest.fn().mockResolvedValue(overrides.kontrakTerbaru ?? []),
    },
    vendor: { count: jest.fn().mockResolvedValue(overrides.legalitasBelumLengkap ?? 0) },
    tenderUndangan: { findMany: jest.fn().mockResolvedValue(overrides.undanganAktif ?? []) },
    tenderSPH: { findMany: jest.fn().mockResolvedValue(overrides.sphFinal ?? []) },
    shopDrawing: modelPendingCount,
    materialApproval: modelPendingCount,
    metodePekerjaan: modelPendingCount,
    sertifikasiPekerjaan: modelPendingCount,
    peralatanList: modelPendingCount,
    checklistKonstruksi: modelPendingCount,
    iBPR: modelPendingCount,
    jSA: modelPendingCount,
    opnamePekerjaan: { count: modelPendingCount.count, findFirst: opnameFindFirst },
    asBuildDrawing: modelPendingCount,
    komisioning: modelPendingCount,
    serahTerima: modelPendingCount,
    masaPemeliharaanChecklist: modelPendingCount,
    bASerahTerima: modelPendingCount,
  } as unknown as PrismaService;

  const progresFisikQueue = [...(overrides.progresFisik ?? daftarProject.map(() => null))];
  const trendQueue = [...(overrides.trendMingguan ?? daftarProject.map(() => []))];

  const progress = {
    progresFisikProject: jest.fn().mockImplementation(() => Promise.resolve(progresFisikQueue.shift() ?? null)),
    trendMingguan: jest.fn().mockImplementation(() => Promise.resolve(trendQueue.shift() ?? [])),
  } as unknown as EpromProgressService;

  const service = new EpromDashboardService(prisma, progress);

  return { service, prisma, progress };
}

describe('EpromDashboardService.ringkasan — sphMenungguFinal', () => {
  it('menghitung undangan aktif yang belum punya SPH final berharga', async () => {
    const { service } = buatService({
      undanganAktif: [{ tenderId: 1, vendorId: 1 }, { tenderId: 1, vendorId: 2 }],
      sphFinal: [{ tenderId: 1, vendorId: 1 }],
    });

    const hasil = await service.ringkasan();

    expect(hasil.sphMenungguFinal).toBe(1);
  });
});

describe('EpromDashboardService.ringkasan — approvalPending', () => {
  it('menjumlahkan PENDING dari 14 kategori approval', async () => {
    const { service } = buatService({ pendingCounts: [1, 2, 0, 0, 1, 0, 0, 3, 0, 0, 0, 0, 0, 1] });

    const hasil = await service.ringkasan();

    expect(hasil.approvalPending).toBe(8);
  });
});

describe('EpromDashboardService.ringkasan — progress fisik & tren', () => {
  it('progressPerProject hanya menyertakan project dengan progres bukan null, rata-rata dihitung dari yang tersisa', async () => {
    const { service } = buatService({
      project: [{ id: 1, namaProject: 'A' }, { id: 2, namaProject: 'B' }],
      progresFisik: [80, null],
    });

    const hasil = await service.ringkasan();

    expect(hasil.progressPerProject).toEqual([{ id: 1, namaProject: 'A', progressPersen: 80 }]);
    expect(hasil.progressFisikRataRata).toBe(80);
  });

  it('progressFisikRataRata null kalau semua project belum ada data progress', async () => {
    const { service } = buatService({
      project: [{ id: 1, namaProject: 'A' }],
      progresFisik: [null],
    });

    const hasil = await service.ringkasan();

    expect(hasil.progressFisikRataRata).toBeNull();
  });

  it('progressTrend hanya menyertakan project yang punya data tren', async () => {
    const { service } = buatService({
      project: [{ id: 1, namaProject: 'A' }, { id: 2, namaProject: 'B' }],
      trendMingguan: [[{ bulan: '2026-01', actual: 50 }], []],
    });

    const hasil = await service.ringkasan();

    expect(hasil.progressTrend).toHaveLength(1);
    expect(hasil.progressTrend[0].id).toBe(1);
  });
});

describe('EpromDashboardService.ringkasan — progress keuangan (opname)', () => {
  it('rata-rata dihitung dari opname APPROVED terakhir tiap project, null kalau belum ada sama sekali', async () => {
    const { service } = buatService({
      project: [{ id: 1, namaProject: 'A' }, { id: 2, namaProject: 'B' }],
      opnameTerakhir: [{ progressPersen: 60 }, null],
    });

    const hasil = await service.ringkasan();

    expect(hasil.progressKeuanganRataRata).toBe(60);
  });

  it('null kalau tidak ada project dengan opname APPROVED', async () => {
    const { service } = buatService({ project: [{ id: 1, namaProject: 'A' }], opnameTerakhir: [null] });

    const hasil = await service.ringkasan();

    expect(hasil.progressKeuanganRataRata).toBeNull();
  });
});

describe('EpromDashboardService.ringkasan — aktivitasTerbaru', () => {
  it('menggabungkan aktivitas tender & kontrak, urut terbaru, dibatasi 6', async () => {
    const { service } = buatService({
      tenderTerbaru: [{ namaTender: 'Tender Lama', createdAt: new Date('2026-01-01') }],
      kontrakTerbaru: [{ nomorKontrak: 'K-001', createdAt: new Date('2026-01-05') }],
    });

    const hasil = await service.ringkasan();

    expect(hasil.aktivitasTerbaru[0].pesan).toBe('Kontrak K-001 dibuat');
    expect(hasil.aktivitasTerbaru[1].pesan).toBe('Tender baru dibuat: Tender Lama');
  });
});
