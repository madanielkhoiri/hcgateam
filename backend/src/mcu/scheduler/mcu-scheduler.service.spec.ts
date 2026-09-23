import { McuFollowUpService } from '../follow-up/mcu-follow-up.service';
import { McuJadwalService } from '../jadwal/mcu-jadwal.service';
import { McuKaryawanService } from '../karyawan/mcu-karyawan.service';
import { McuSchedulerService } from './mcu-scheduler.service';

function buatScheduler(overrides: {
  kunciJadwalJatuhTempo?: jest.Mock;
  jalankanReminderJatuhTempo?: jest.Mock;
  tandaiSeluruhFuTerlambat?: jest.Mock;
} = {}) {
  const jadwal = {
    kunciJadwalJatuhTempo:
      overrides.kunciJadwalJatuhTempo ?? jest.fn().mockResolvedValue({ terkunci: 2 }),
  } as unknown as McuJadwalService;

  const karyawan = {
    jalankanReminderJatuhTempo:
      overrides.jalankanReminderJatuhTempo ?? jest.fn().mockResolvedValue({ dikirim: 4, karyawan: 2 }),
  } as unknown as McuKaryawanService;

  const followUp = {
    tandaiSeluruhFuTerlambat:
      overrides.tandaiSeluruhFuTerlambat ?? jest.fn().mockResolvedValue({ diproses: 1 }),
  } as unknown as McuFollowUpService;

  return { scheduler: new McuSchedulerService(jadwal, karyawan, followUp), jadwal, karyawan, followUp };
}

describe('McuSchedulerService', () => {
  it('kunciJadwalJatuhTempo memanggil McuJadwalService tanpa perlu aktor', async () => {
    const { scheduler, jadwal } = buatScheduler();

    await scheduler.kunciJadwalJatuhTempo();

    expect(jadwal.kunciJadwalJatuhTempo).toHaveBeenCalledWith();
  });

  it('reminderH3Bulan memanggil McuKaryawanService tanpa perlu aktor', async () => {
    const { scheduler, karyawan } = buatScheduler();

    await scheduler.reminderH3Bulan();

    expect(karyawan.jalankanReminderJatuhTempo).toHaveBeenCalledWith();
  });

  it('reminderFuTerlambat memanggil McuFollowUpService dengan aktor sistem ber-role HC', async () => {
    const { scheduler, followUp } = buatScheduler();

    await scheduler.reminderFuTerlambat();

    expect(followUp.tandaiSeluruhFuTerlambat).toHaveBeenCalledWith(
      expect.objectContaining({ role: 'HC' }),
    );
  });

  it('tidak melempar error kalau salah satu proses gagal — proses lain tetap bisa dipanggil terpisah', async () => {
    const { scheduler } = buatScheduler({
      kunciJadwalJatuhTempo: jest.fn().mockRejectedValue(new Error('DB down')),
    });

    await expect(scheduler.kunciJadwalJatuhTempo()).resolves.toBeUndefined();
  });
});
