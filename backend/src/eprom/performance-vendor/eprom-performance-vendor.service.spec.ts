import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { StatusApprovalEprom, UserRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { EpromAksesService } from '../common/eprom-akses.service';
import { AktorEprom } from '../common/eprom-aktor';
import { EpromPerformanceVendorService } from './eprom-performance-vendor.service';

function aktor(role: UserRole, overrides: Partial<AktorEprom> = {}): AktorEprom {
  return { id: 1, username: 'test', role, ...overrides };
}

// Kontrak & project aktif hanya pada Senin, 5 Jan 2026 (satu hari kerja) supaya
// perhitungan kewajiban upload/mingguan/bulanan tidak perlu meliputi banyak hari.
function kontrakFixture(overrides: Partial<{ tanggalMulai: Date; tanggalSelesai: Date }> = {}) {
  return {
    id: 1,
    nomorKontrak: 'K-001',
    tanggalMulai: overrides.tanggalMulai ?? new Date('2026-01-05T00:00:00Z'),
    tanggalSelesai: overrides.tanggalSelesai ?? new Date('2026-01-05T00:00:00Z'),
    tender: { id: 1, namaTender: 'Tender A' },
    vendor: { id: 1, namaVendor: 'PT A' },
  };
}

function projectFixture(overrides: { kontrak?: unknown } = {}) {
  return { id: 1, namaProject: 'Project A', kontrak: overrides.kontrak ?? kontrakFixture() };
}

function buatService(overrides: {
  projects?: unknown[];
  projectDetail?: unknown;
  projectAksesCheck?: unknown;
  inspeksiArea?: unknown[];
  inspeksiPeralatan?: unknown[];
  progressHarian?: unknown[];
  progressMingguan?: unknown[];
  progressBulanan?: unknown[];
  tta?: number;
  kta?: number;
  jsa?: unknown[];
  mom?: unknown[];
} = {}) {
  const projectFindUnique = jest.fn().mockResolvedValue(
    'projectAksesCheck' in overrides ? overrides.projectAksesCheck : ('projectDetail' in overrides ? overrides.projectDetail : projectFixture()),
  );

  const prisma = {
    project: {
      findMany: jest.fn().mockResolvedValue(overrides.projects ?? [projectFixture()]),
      findUnique: projectFindUnique,
    },
    inspeksiAreaPekerjaan: { findMany: jest.fn().mockResolvedValue(overrides.inspeksiArea ?? []) },
    inspeksiPeralatan: { findMany: jest.fn().mockResolvedValue(overrides.inspeksiPeralatan ?? []) },
    progressHarian: { findMany: jest.fn().mockResolvedValue(overrides.progressHarian ?? []) },
    progressMingguan: { findMany: jest.fn().mockResolvedValue(overrides.progressMingguan ?? []) },
    progressBulanan: { findMany: jest.fn().mockResolvedValue(overrides.progressBulanan ?? []) },
    tTA: { count: jest.fn().mockResolvedValue(overrides.tta ?? 0) },
    kTA: { count: jest.fn().mockResolvedValue(overrides.kta ?? 0) },
    jSA: { findMany: jest.fn().mockResolvedValue(overrides.jsa ?? []) },
    mOM: { findMany: jest.fn().mockResolvedValue(overrides.mom ?? []) },
  } as unknown as PrismaService;

  const akses = new EpromAksesService(prisma);
  const service = new EpromPerformanceVendorService(prisma, akses);

  return { service, prisma };
}

describe('EpromPerformanceVendorService — akses & routing', () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-02-15T00:00:00Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('menolak format bulan yang tidak valid', async () => {
    const { service } = buatService();

    await expect(service.daftar(aktor(UserRole.OWNER), 'bulan-ngasal')).rejects.toThrow(BadRequestException);
  });

  it('Owner melihat semua project tanpa filter vendorId', async () => {
    const { service, prisma } = buatService({ projects: [] });

    await service.daftar(aktor(UserRole.OWNER), '2026-01');

    expect(prisma.project.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: undefined }));
  });

  it('Vendor hanya melihat project dari kontraknya sendiri', async () => {
    const { service, prisma } = buatService({ projects: [] });

    await service.daftar(aktor(UserRole.VENDOR, { vendorId: 7 }), '2026-01');

    expect(prisma.project.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { kontrak: { vendorId: 7 } } }),
    );
  });

  it('daftar() hanya menyertakan project yang kontraknya aktif tumpang tindih dengan periode', async () => {
    const aktifBulanIni = projectFixture();
    const sudahSelesaiBulanLalu = projectFixture({
      kontrak: kontrakFixture({ tanggalMulai: new Date('2025-11-01T00:00:00Z'), tanggalSelesai: new Date('2025-11-30T00:00:00Z') }),
    });
    const { service } = buatService({ projects: [aktifBulanIni, { ...sudahSelesaiBulanLalu, id: 2 }] });

    const hasil = await service.daftar(aktor(UserRole.OWNER), '2026-01');

    expect(hasil.items).toHaveLength(1);
    expect(hasil.items[0].project.id).toBe(1);
  });

  it('detail() menolak Vendor yang mengakses project bukan miliknya', async () => {
    const { service } = buatService({ projectAksesCheck: { kontrak: { vendorId: 999 } } });

    await expect(service.detail(aktor(UserRole.VENDOR, { vendorId: 1 }), 1, '2026-01')).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('detail() melempar NotFoundException kalau project tidak ada', async () => {
    const { service } = buatService({ projectDetail: null });

    await expect(service.detail(aktor(UserRole.OWNER), 1, '2026-01')).rejects.toThrow(NotFoundException);
  });
});

describe('EpromPerformanceVendorService — perhitungan skor', () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-02-15T00:00:00Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('tanpa data sama sekali: disiplin upload & TTA/KTA bernilai 0, komponen lain null, nilaiAkhir 0 grade E', async () => {
    const { service } = buatService();

    const hasil = await service.detail(aktor(UserRole.OWNER), 1, '2026-01');

    const upload = hasil.komponen.find((k) => k.key === 'upload')!;
    const deviasi = hasil.komponen.find((k) => k.key === 'deviasi')!;
    const ttaKta = hasil.komponen.find((k) => k.key === 'ttaKta')!;
    const jsa = hasil.komponen.find((k) => k.key === 'jsa')!;
    const pica = hasil.komponen.find((k) => k.key === 'pica')!;

    expect(upload.nilai).toBe(0);
    expect(deviasi.nilai).toBeNull();
    expect(ttaKta.nilai).toBe(0);
    expect(jsa.nilai).toBeNull();
    expect(pica.nilai).toBeNull();
    expect(hasil.nilaiAkhir).toBe(0);
    expect(hasil.grade).toBe('E');
  });

  it('semua upload harian/mingguan/bulanan tepat waktu dan actual=planned: upload & deviasi 100, grade A', async () => {
    const waktuTepat = new Date('2026-01-05T01:00:00Z');
    const { service } = buatService({
      inspeksiArea: [{ uploadedAt: waktuTepat }],
      inspeksiPeralatan: [{ uploadedAt: waktuTepat }],
      progressHarian: [{ uploadedAt: waktuTepat }],
      progressMingguan: [{ id: 1, mingguKe: 1, namaPekerjaan: 'Pekerjaan A', planned: 50, actual: 50, uploadedAt: waktuTepat }],
      progressBulanan: [{ uploadedAt: waktuTepat }],
      tta: 1,
      kta: 1,
    });

    const hasil = await service.detail(aktor(UserRole.OWNER), 1, '2026-01');

    const upload = hasil.komponen.find((k) => k.key === 'upload')!;
    const deviasi = hasil.komponen.find((k) => k.key === 'deviasi')!;
    const ttaKta = hasil.komponen.find((k) => k.key === 'ttaKta')!;

    expect(upload.nilai).toBe(100);
    expect(ttaKta.nilai).toBe(100);
    expect(hasil.upload.hijau).toBe(hasil.upload.jatuhTempo);
    expect(deviasi.nilai).toBe(100);
    expect(hasil.nilaiAkhir).toBe(100);
    expect(hasil.grade).toBe('A');
  });

  it('deviasi negatif ringan (-3%) menghasilkan skor deviasi 75', async () => {
    const waktuTepat = new Date('2026-01-05T01:00:00Z');
    const { service } = buatService({
      progressMingguan: [{ id: 1, mingguKe: 1, namaPekerjaan: 'Pekerjaan A', planned: 10, actual: 7, uploadedAt: waktuTepat }],
    });

    const hasil = await service.detail(aktor(UserRole.OWNER), 1, '2026-01');
    const deviasi = hasil.komponen.find((k) => k.key === 'deviasi')!;

    expect(deviasi.nilai).toBe(75);
  });

  it('deviasi negatif berat (-15%) menghasilkan skor deviasi 20', async () => {
    const waktuTepat = new Date('2026-01-05T01:00:00Z');
    const { service } = buatService({
      progressMingguan: [{ id: 1, mingguKe: 1, namaPekerjaan: 'Pekerjaan A', planned: 20, actual: 5, uploadedAt: waktuTepat }],
    });

    const hasil = await service.detail(aktor(UserRole.OWNER), 1, '2026-01');
    const deviasi = hasil.komponen.find((k) => k.key === 'deviasi')!;

    expect(deviasi.nilai).toBe(20);
  });

  it('TTA/KTA: hanya salah satu tercapai menghasilkan rata-rata 50', async () => {
    const { service } = buatService({ tta: 1, kta: 0 });

    const hasil = await service.detail(aktor(UserRole.OWNER), 1, '2026-01');
    const ttaKta = hasil.komponen.find((k) => k.key === 'ttaKta')!;

    expect(ttaKta.nilai).toBe(50);
  });

  it('JSA: sebagian JSA approved belum ada sosialisasi menghasilkan nilai 50', async () => {
    const { service } = buatService({
      jsa: [
        { sosialisasi: { id: 1, createdAt: new Date(), fileUrl: 'a.pdf' } },
        { sosialisasi: null },
      ],
    });

    const hasil = await service.detail(aktor(UserRole.OWNER), 1, '2026-01');
    const jsa = hasil.komponen.find((k) => k.key === 'jsa')!;

    expect(jsa.nilai).toBe(50);
  });

  it('PICA MOM: campuran tepat waktu, terlambat, dan belum selesai dirata-rata', async () => {
    const { service } = buatService({
      mom: [
        { dueDate: new Date('2026-01-05T00:00:00Z'), statusClose: true, hariTerlambat: 0 },
        { dueDate: new Date('2026-01-05T00:00:00Z'), statusClose: true, hariTerlambat: 5 },
        { dueDate: new Date('2026-01-05T00:00:00Z'), statusClose: false, hariTerlambat: null },
      ],
    });

    const hasil = await service.detail(aktor(UserRole.OWNER), 1, '2026-01');
    const pica = hasil.komponen.find((k) => k.key === 'pica')!;

    expect(pica.nilai).toBe(50);
    expect(hasil.upload.total).toBeGreaterThan(0);
  });
});
