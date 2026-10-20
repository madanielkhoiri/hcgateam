import { BadRequestException } from '@nestjs/common';
import { EpromEvaluasiVendorService } from './eprom-evaluasi-vendor.service';

const complete = { adminScore: 10, hseScore: 10, response: 'ikut', invitationDate: '2026-01-01', responseDate: '2026-01-02', durationDays: 10, sphRounds: [{ deadline: '2026-01-03', receivedAt: '2026-01-02', value: 100, verification: 'yes' }], presentation: { method: 10, hsePresentation: 10, finance: 10, warranty: 10, experience: 10, boq: 10, organization: 10, equipmentReadiness: 10, workSchedule: 10, mobilization: 10, riskMitigation: 10, progressReporting: 10 }, manpowerOffered: 10, localWorkers: 8 };
function service(tender: any) {
  const prisma: any = { tenderProcess: { findUnique: jest.fn().mockResolvedValue(tender) } };
  return new EpromEvaluasiVendorService(prisma, {} as any, {} as any);
}

describe('EpromEvaluasiVendorService - format Revisi 16', () => {
  it('menghitung ranking lengkap menjadi 100', async () => {
    const evaluasi = { vendorId: 1, evaluasiData: complete, dokumenAdminFiles: ['a.pdf'], dokumenHseFiles: ['h.pdf'] };
    const hasil = await service({ id: 1, namaTender: 'Tender', jenisTender: 'VENDOR', evaluasiConfig: { manpowerRequirement: 10 }, undangan: [{ vendorId: 1, vendor: { id: 1, namaVendor: 'PT A' } }], evaluasiVendor: [evaluasi] }).daftar(1);
    expect(hasil.vendors[0]).toMatchObject({ eligible: true, score: 100, localPercent: 80 });
  });

  it('menolak evaluasi untuk tender internal', async () => {
    await expect(service({ id: 1, jenisTender: 'INTERNAL' }).daftar(1)).rejects.toBeInstanceOf(BadRequestException);
  });
});
