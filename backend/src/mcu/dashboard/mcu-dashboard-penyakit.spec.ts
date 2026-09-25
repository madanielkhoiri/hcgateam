import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { McuAksesService } from '../common/mcu-akses.service';
import { AktorMcu } from '../common/mcu-aktor';
import { McuDashboardController } from './mcu-dashboard.controller';
import { McuDashboardService } from './mcu-dashboard.service';

function baris(penyakit: string | null, tanggal: string, karyawanId: number) {
  return {
    penyakit,
    tanggalSubmit: new Date(tanggal),
    hasilMcu: { jadwalMcu: { karyawanId } },
  };
}

function buatService(rows: unknown[], rentang: { min?: string; max?: string } = {}) {
  const findMany = jest.fn().mockResolvedValue(rows);
  const aggregate = jest.fn().mockResolvedValue({
    _min: { tanggalSubmit: rentang.min ? new Date(rentang.min) : null },
    _max: { tanggalSubmit: rentang.max ? new Date(rentang.max) : null },
  });
  const prisma = { rekomendasiMcu: { findMany, aggregate } } as unknown as PrismaService;

  return { service: new McuDashboardService(prisma), findMany, aggregate };
}

describe('McuDashboardService.penyakitTerbanyak', () => {
  it('mengurutkan penyakit dari yang terbanyak; jumlah = karyawan unik', async () => {
    const { service } = buatService([
      baris('Hipertensi', '2026-03-05T03:00:00Z', 1),
      baris('Hipertensi, Kolesterol', '2026-03-10T03:00:00Z', 2),
      baris('hipertensi', '2026-04-02T03:00:00Z', 3),
      baris('Anemia', '2026-05-02T03:00:00Z', 1),
    ]);

    const hasil = await service.penyakitTerbanyak('TAHUN', 2026);

    expect(hasil.totalKasus).toBe(3);
    expect(hasil.penyakit[0]).toEqual({ nama: 'Hipertensi', jumlah: 3, persen: 100 });
    expect(hasil.penyakit.map((p) => p.nama)).toEqual(['Hipertensi', 'Anemia', 'Kolesterol']);
  });

  it('karyawan yang FU-nya berulang untuk penyakit sama di periode yang sama dihitung sekali', async () => {
    const { service } = buatService([
      baris('Hipertensi', '2026-03-05T03:00:00Z', 1),
      baris('Hipertensi', '2026-03-25T03:00:00Z', 1),
    ]);

    const hasil = await service.penyakitTerbanyak('BULAN', 2026, 3);

    expect(hasil.penyakit).toEqual([{ nama: 'Hipertensi', jumlah: 1, persen: 100 }]);
    expect(hasil.totalKasus).toBe(1);
  });

  it('mode TAHUN: rincian 12 bulan dengan penyakit teratas tiap bulan', async () => {
    const { service } = buatService([
      baris('Hipertensi', '2026-03-05T03:00:00Z', 1),
      baris('Hipertensi', '2026-03-06T03:00:00Z', 2),
      baris('Anemia', '2026-03-07T03:00:00Z', 3),
      baris('Anemia', '2026-07-07T03:00:00Z', 4),
    ]);

    const hasil = await service.penyakitTerbanyak('TAHUN', 2026);

    expect(hasil.rincian).toHaveLength(12);
    expect(hasil.rincian[2]).toEqual({ kunci: 3, totalKasus: 3, teratas: { nama: 'Hipertensi', jumlah: 2 } });
    expect(hasil.rincian[6]).toEqual({ kunci: 7, totalKasus: 1, teratas: { nama: 'Anemia', jumlah: 1 } });
    expect(hasil.rincian[0]).toEqual({ kunci: 1, totalKasus: 0, teratas: null });
  });

  it('mode BULAN: rincian per hari sesuai jumlah hari bulan itu', async () => {
    const { service } = buatService([baris('Anemia', '2026-02-14T03:00:00Z', 1)]);

    const hasil = await service.penyakitTerbanyak('BULAN', 2026, 2);

    expect(hasil.rincian).toHaveLength(28);
    expect(hasil.rincian[13]).toEqual({ kunci: 14, totalKasus: 1, teratas: { nama: 'Anemia', jumlah: 1 } });
    expect(hasil.bulan).toBe(2);
  });

  it('mengirim rentang tanggal yang benar ke database (hanya FOLLOW_UP berpenyakit)', async () => {
    const { service, findMany } = buatService([]);

    await service.penyakitTerbanyak('BULAN', 2026, 12);

    const where = findMany.mock.calls[0][0].where;
    expect(where.status).toBe('FOLLOW_UP');
    expect(where.penyakit).toEqual({ not: null });
    expect(where.tanggalSubmit.gte).toEqual(new Date(Date.UTC(2026, 11, 1)));
    expect(where.tanggalSubmit.lt).toEqual(new Date(Date.UTC(2027, 0, 1)));
  });

  it('tanpa data: hasil kosong, tidak error, dan tahun tersedia memuat tahun berjalan', async () => {
    const { service } = buatService([]);

    const hasil = await service.penyakitTerbanyak('TAHUN', 2026);

    expect(hasil.totalKasus).toBe(0);
    expect(hasil.penyakit).toEqual([]);
    expect(hasil.tahunTersedia).toContain(new Date().getUTCFullYear());
  });

  it('daftar tahun tersedia dari data terlama sampai terbaru, terbaru dulu', async () => {
    const { service } = buatService([], { min: '2024-05-01T00:00:00Z', max: '2026-01-01T00:00:00Z' });

    const hasil = await service.penyakitTerbanyak('TAHUN', 2026);

    const tahunTerbaru = Math.max(2026, new Date().getUTCFullYear());

    expect(hasil.tahunTersedia[0]).toBe(tahunTerbaru);
    expect(hasil.tahunTersedia[hasil.tahunTersedia.length - 1]).toBe(2024);
    expect(hasil.tahunTersedia).toContain(2025);
  });
});

describe('McuDashboardService.historyKaryawan — penyakit', () => {
  const karyawan = {
    id: 1,
    nik: '1',
    nama: 'Budi',
    jabatan: 'Staff',
    departemen: { id: 1, namaDepartemen: 'GA' },
    statusKerja: 'AKTIF',
    statusKesehatanDirumahkan: null,
    tanggalMcuTerakhir: null,
    tanggalMcuExpired: null,
    tanggalMcuBerikutnya: null,
    jadwalMcu: [
      { hasilMcu: { rekomendasi: [{ status: 'FOLLOW_UP', penyakit: 'Hipertensi' }] } },
      { hasilMcu: null },
    ],
  };

  function buat() {
    const prisma = { karyawan: { findUnique: jest.fn().mockResolvedValue(karyawan) } } as unknown as PrismaService;
    return new McuDashboardService(prisma);
  }

  it('secara bawaan penyakit disembunyikan', async () => {
    const hasil = await buat().historyKaryawan(1);

    expect((hasil.riwayat[0] as any).hasilMcu.rekomendasi[0].penyakit).toBeNull();
    expect(hasil.statistik.totalSiklusFollowUp).toBe(1);
  });

  it('penyakit tampil bila pemanggil boleh (HC/Dokter)', async () => {
    const hasil = await buat().historyKaryawan(1, true);

    expect((hasil.riwayat[0] as any).hasilMcu.rekomendasi[0].penyakit).toBe('Hipertensi');
  });
});

describe('McuDashboardController.penyakitTerbanyak — akses & validasi', () => {
  function buatController() {
    const service = { penyakitTerbanyak: jest.fn().mockResolvedValue({ ok: true }) };
    const akses = new McuAksesService({} as unknown as PrismaService);
    const controller = new McuDashboardController(service as unknown as McuDashboardService, akses);

    return { controller, service };
  }

  const aktor = (role: UserRole): AktorMcu => ({ id: 1, role, username: 'u' });

  it.each([UserRole.HC, UserRole.DOKTER, UserRole.ADMIN, UserRole.SUPER_ADMIN])('mengizinkan %s', (role) => {
    const { controller, service } = buatController();

    controller.penyakitTerbanyak(aktor(role), 'TAHUN', '2026');

    expect(service.penyakitTerbanyak).toHaveBeenCalledWith('TAHUN', 2026, expect.any(Number));
  });

  it.each([UserRole.ADMIN_DEPT, UserRole.KARYAWAN, UserRole.SHE, UserRole.KLINIK])(
    'menolak %s (data medis)',
    (role) => {
      const { controller, service } = buatController();

      expect(() => controller.penyakitTerbanyak(aktor(role), 'TAHUN', '2026')).toThrow(ForbiddenException);
      expect(service.penyakitTerbanyak).not.toHaveBeenCalled();
    },
  );

  it('menolak periode, tahun, dan bulan yang tidak valid', () => {
    const { controller } = buatController();

    expect(() => controller.penyakitTerbanyak(aktor(UserRole.HC), 'HARI', '2026')).toThrow(BadRequestException);
    expect(() => controller.penyakitTerbanyak(aktor(UserRole.HC), 'TAHUN', '1999')).toThrow(BadRequestException);
    expect(() => controller.penyakitTerbanyak(aktor(UserRole.HC), 'TAHUN', 'abc')).toThrow(BadRequestException);
    expect(() => controller.penyakitTerbanyak(aktor(UserRole.HC), 'BULAN', '2026', '13')).toThrow(BadRequestException);
  });

  it('periode bawaan TAHUN dan bulan valid diteruskan untuk mode BULAN', () => {
    const { controller, service } = buatController();

    controller.penyakitTerbanyak(aktor(UserRole.HC), undefined, '2026');
    expect(service.penyakitTerbanyak).toHaveBeenLastCalledWith('TAHUN', 2026, expect.any(Number));

    controller.penyakitTerbanyak(aktor(UserRole.HC), 'bulan', '2026', '5');
    expect(service.penyakitTerbanyak).toHaveBeenLastCalledWith('BULAN', 2026, 5);
  });
});
