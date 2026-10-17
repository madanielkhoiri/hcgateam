import { NotFoundException } from '@nestjs/common';
import { CivilMonitoringProjectService } from './civil-monitoring-project.service';

const aktor = { id: 7, nama: 'Daniel', username: 'daniel' };
const fixture = {
  id: 1,
  namaPekerjaan: 'Jalan Tambang',
  pengajuanProjectCharter: false,
  reviewApprovalAi: false,
  pengecekanArea: false,
  dokumenProject: false,
  kickOffMeeting: false,
  pelaksanaan: false,
  komisioning: false,
  selesai: false,
};

function setup(item: any = fixture) {
  const project = {
    findMany: jest.fn().mockResolvedValue([fixture]),
    findUnique: jest.fn().mockResolvedValue(item),
    create: jest.fn().mockImplementation(({ data }) => ({ id: 1, ...data })),
    update: jest.fn().mockImplementation(({ data }) => ({ ...fixture, ...data })),
    delete: jest.fn().mockResolvedValue(fixture),
  };
  const riwayat = { findMany: jest.fn().mockResolvedValue([]), create: jest.fn().mockResolvedValue({}) };
  const prisma: any = {
    monitoringProjectTambang: project,
    monitoringProjectTambangRiwayat: riwayat,
    $transaction: jest.fn((callback) => callback({ monitoringProjectTambang: project, monitoringProjectTambangRiwayat: riwayat })),
  };
  return { service: new CivilMonitoringProjectService(prisma), project, riwayat };
}

describe('CivilMonitoringProjectService', () => {
  it('membuat pekerjaan dan riwayat awal', async () => {
    const { service, project, riwayat } = setup();
    await service.buat(aktor, { namaPekerjaan: '  Jalan Tambang  ' });
    expect(project.create).toHaveBeenCalledWith({ data: expect.objectContaining({ namaPekerjaan: 'Jalan Tambang', createdById: 7 }) });
    expect(riwayat.create).toHaveBeenCalledWith({ data: expect.objectContaining({ field: 'namaPekerjaan', actorName: 'Daniel' }) });
  });

  it('mengubah checkbox secara bebas dan mencatat riwayat', async () => {
    const { service, project, riwayat } = setup();
    await service.ubahTahapan(1, aktor, { field: 'selesai', value: true });
    expect(project.update).toHaveBeenCalledWith({ where: { id: 1 }, data: expect.objectContaining({ selesai: true }) });
    expect(riwayat.create).toHaveBeenCalledWith({ data: expect.objectContaining({ field: 'selesai', nilaiSebelum: 'false', nilaiSesudah: 'true' }) });
  });

  it('mengubah nama dan mencatat nilai lama serta baru', async () => {
    const { service, riwayat } = setup();
    await service.ubahNama(1, aktor, { namaPekerjaan: 'Drainase Tambang' });
    expect(riwayat.create).toHaveBeenCalledWith({ data: expect.objectContaining({ nilaiSebelum: 'Jalan Tambang', nilaiSesudah: 'Drainase Tambang' }) });
  });

  it('menolak detail yang tidak ditemukan', async () => {
    const { service } = setup(null);
    await expect(service.detail(99)).rejects.toThrow(NotFoundException);
  });
});
