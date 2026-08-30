import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { StatusApprovalEprom, UserRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { EpromAksesService } from '../common/eprom-akses.service';
import { AktorEprom } from '../common/eprom-aktor';
import { EpromFileService } from '../common/eprom-file.service';
import { WhatsappService } from '../../whatsapp/whatsapp.service';
import { EpromEngineerService } from './eprom-engineer.service';
import { EpromEngineerSigningService } from './eprom-engineer-signing.service';

function aktor(role: UserRole, overrides: Partial<AktorEprom> = {}): AktorEprom {
  return { id: 1, username: 'test', role, ...overrides };
}

function itemFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    projectId: 1,
    fileUrl: 'eprom/project/1/engineer/shop-drawing/a.pdf',
    originalFileName: 'a.pdf',
    status: StatusApprovalEprom.PENDING,
    komentar: null,
    namaPekerjaan: 'Pekerjaan A',
    ...overrides,
  };
}

function buatService(overrides: {
  item?: unknown;
  projectAkses?: unknown;
  approvals?: unknown[];
  approvalTerakhir?: unknown;
  projectDetail?: unknown;
} = {}) {
  const modelFindMany = jest.fn().mockResolvedValue([]);
  const modelFindUnique = jest.fn().mockResolvedValue('item' in overrides ? overrides.item : itemFixture());
  const modelCreate = jest.fn(({ data }) => Promise.resolve({ id: 1, ...data }));
  const modelUpdate = jest.fn(({ data }) => Promise.resolve({ id: 1, ...data }));
  const modelDelete = jest.fn().mockResolvedValue({});
  const modelCount = jest.fn().mockResolvedValue(0);

  const sharedModel = {
    findMany: modelFindMany,
    findUnique: modelFindUnique,
    create: modelCreate,
    update: modelUpdate,
    delete: modelDelete,
    count: modelCount,
  };

  const approvalCreate = jest.fn(({ data }) => Promise.resolve({ id: 1, ...data }));
  const approvalFindFirst = jest.fn().mockResolvedValue('approvalTerakhir' in overrides ? overrides.approvalTerakhir : null);
  const approvalFindMany = jest.fn().mockResolvedValue(overrides.approvals ?? []);

  const projectFindUnique = jest.fn().mockImplementation(({ select }: any) => {
    if (select) {
      return Promise.resolve('projectAkses' in overrides ? overrides.projectAkses : { kontrak: { vendorId: 1 } });
    }
    return Promise.resolve('projectDetail' in overrides ? overrides.projectDetail : { id: 1, kontrak: { vendor: {}, tender: {} } });
  });

  const prisma = {
    shopDrawing: sharedModel,
    materialApproval: sharedModel,
    metodePekerjaan: sharedModel,
    sertifikasiPekerjaan: sharedModel,
    peralatanList: sharedModel,
    komisioningAlatBerat: sharedModel,
    project: { findUnique: projectFindUnique },
    user: { findUnique: jest.fn().mockResolvedValue({ name: 'Pengunggah' }) },
    engineerDocumentApproval: {
      create: approvalCreate,
      findFirst: approvalFindFirst,
      findMany: approvalFindMany,
    },
    $transaction: jest.fn((callback) => callback({
      shopDrawing: sharedModel,
      materialApproval: sharedModel,
      metodePekerjaan: sharedModel,
      sertifikasiPekerjaan: sharedModel,
      peralatanList: sharedModel,
      komisioningAlatBerat: sharedModel,
      engineerDocumentApproval: { create: approvalCreate },
    })),
  } as unknown as PrismaService;

  const akses = new EpromAksesService(prisma);
  const file = {
    simpanDokumen: jest.fn().mockReturnValue('eprom/project/1/engineer/shop-drawing/a.pdf'),
    hapus: jest.fn().mockReturnValue(true),
  } as unknown as EpromFileService;
  const signing = {
    daftarTandaTangan: jest.fn().mockReturnValue([{ filename: 'ttd.png' }]),
    buatPdfSigned: jest.fn().mockResolvedValue('eprom/project/1/engineer/shop-drawing/signed.pdf'),
  } as unknown as EpromEngineerSigningService;
  const whatsapp = {
    aktif: false,
    kirim: jest.fn().mockResolvedValue(true),
  } as unknown as WhatsappService;

  const service = new EpromEngineerService(prisma, akses, file, signing, whatsapp);

  return { service, prisma, akses, file, signing, whatsapp, sharedModel, approvalCreate, approvalFindFirst };
}

describe('EpromEngineerService.validasiTipe', () => {
  const service = buatService().service;

  it('menerima tipe yang valid', () => {
    expect(service.validasiTipe('shop-drawing')).toBe('shop-drawing');
  });

  it('menolak tipe yang tidak dikenal', () => {
    expect(() => service.validasiTipe('tipe-ngasal')).toThrow(BadRequestException);
  });
});

describe('EpromEngineerService.buat', () => {
  it('menolak Vendor yang bukan pemilik project', async () => {
    const { service } = buatService({ projectAkses: { kontrak: { vendorId: 999 } } });

    await expect(
      service.buat(aktor(UserRole.VENDOR, { vendorId: 1 }), 'shop-drawing', 1, { nama: 'A' } as any),
    ).rejects.toThrow(ForbiddenException);
  });

  it('menolak kalau nama wajib (shop-drawing) tidak diisi', async () => {
    const { service } = buatService();

    await expect(service.buat(aktor(UserRole.OWNER), 'shop-drawing', 1, {} as any)).rejects.toThrow(
      'Nama wajib diisi untuk Shop Drawing',
    );
  });

  it('tidak mewajibkan nama untuk tipe tanpa field nama (sertifikasi-pekerjaan)', async () => {
    const { service, sharedModel } = buatService();

    await service.buat(aktor(UserRole.OWNER), 'sertifikasi-pekerjaan', 1, {} as any);

    expect(sharedModel.create).toHaveBeenCalled();
  });

  it('menolak komisioning-alat-berat tanpa file', async () => {
    const { service } = buatService();

    await expect(service.buat(aktor(UserRole.OWNER), 'komisioning-alat-berat', 1, {} as any)).rejects.toThrow(
      'File Komisioning Alat Berat wajib diunggah',
    );
  });

  it('menolak komisioning-alat-berat dengan file bukan PDF', async () => {
    const { service } = buatService();
    const file = { originalname: 'a.jpg' } as Express.Multer.File;

    await expect(service.buat(aktor(UserRole.OWNER), 'komisioning-alat-berat', 1, {} as any, file)).rejects.toThrow(
      'harus berformat PDF',
    );
  });

  it('berhasil membuat item dengan fileUrl dan nama ter-trim', async () => {
    const { service, sharedModel, file } = buatService();
    const dummyFile = { originalname: 'a.pdf' } as Express.Multer.File;

    await service.buat(aktor(UserRole.OWNER), 'shop-drawing', 1, { nama: '  Pekerjaan A  ' } as any, dummyFile);

    expect(file.simpanDokumen).toHaveBeenCalled();
    expect(sharedModel.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ namaPekerjaan: 'Pekerjaan A', fileUrl: 'eprom/project/1/engineer/shop-drawing/a.pdf' }),
    });
  });

  it('tidak mengirim notifikasi WA kalau whatsapp tidak aktif', async () => {
    const { service, whatsapp } = buatService();

    await service.buat(aktor(UserRole.OWNER), 'sertifikasi-pekerjaan', 1, {} as any);

    expect(whatsapp.kirim).not.toHaveBeenCalled();
  });
});

describe('EpromEngineerService.review', () => {
  it('menolak role selain Owner', async () => {
    const { service } = buatService();

    await expect(service.review(aktor(UserRole.VENDOR), 'shop-drawing', 1, { status: 'REJECTED', komentar: 'x' } as any)).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('melempar NotFoundException kalau item tidak ada', async () => {
    const { service } = buatService({ item: null });

    await expect(
      service.review(aktor(UserRole.OWNER), 'shop-drawing', 1, { status: 'REJECTED', komentar: 'x' } as any),
    ).rejects.toThrow(NotFoundException);
  });

  it('menolak review ulang item yang sudah tidak PENDING', async () => {
    const { service } = buatService({ item: itemFixture({ status: StatusApprovalEprom.APPROVED }) });

    await expect(
      service.review(aktor(UserRole.OWNER), 'shop-drawing', 1, { status: 'REJECTED', komentar: 'x' } as any),
    ).rejects.toThrow('sudah direview sebelumnya');
  });

  it('menolak kalau komentar kosong', async () => {
    const { service } = buatService();

    await expect(
      service.review(aktor(UserRole.OWNER), 'shop-drawing', 1, { status: 'REJECTED', komentar: '   ' } as any),
    ).rejects.toThrow('Alasan penolakan wajib diisi');
  });

  it('berhasil menolak item dengan komentar ter-trim', async () => {
    const { service, sharedModel } = buatService();

    await service.review(aktor(UserRole.OWNER), 'shop-drawing', 1, { status: 'REJECTED', komentar: '  Tidak sesuai  ' } as any);

    expect(sharedModel.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { status: StatusApprovalEprom.REJECTED, komentar: 'Tidak sesuai' },
    });
  });
});

describe('EpromEngineerService.detailApproval', () => {
  it('menolak role selain Owner', () => {
    const { service } = buatService();

    expect(() => service.daftarTandaTangan(aktor(UserRole.VENDOR))).toThrow(ForbiddenException);
  });

  it('melempar NotFoundException kalau item tidak ada', async () => {
    const { service } = buatService({ item: null });

    await expect(service.detailApproval(aktor(UserRole.OWNER), 'shop-drawing', 1)).rejects.toThrow(NotFoundException);
  });

  it('melempar NotFoundException kalau project tidak ditemukan', async () => {
    const { service } = buatService({ projectDetail: null });

    await expect(service.detailApproval(aktor(UserRole.OWNER), 'shop-drawing', 1)).rejects.toThrow(
      'Project tidak ditemukan',
    );
  });

  it('canSign true untuk file PDF, false untuk file non-PDF', async () => {
    const { service } = buatService({ item: itemFixture({ fileUrl: 'a.jpg' }) });

    const hasil = await service.detailApproval(aktor(UserRole.OWNER), 'shop-drawing', 1);

    expect(hasil.canSign).toBe(false);
  });
});

describe('EpromEngineerService.approveDenganTandaTangan', () => {
  it('menolak item yang sudah tidak PENDING', async () => {
    const { service } = buatService({ item: itemFixture({ status: StatusApprovalEprom.APPROVED }) });

    await expect(
      service.approveDenganTandaTangan(aktor(UserRole.OWNER), 'shop-drawing', 1, { placements: [{}] } as any),
    ).rejects.toThrow('sudah direview sebelumnya');
  });

  it('menolak dokumen non-PDF', async () => {
    const { service } = buatService({ item: itemFixture({ fileUrl: 'a.jpg' }) });

    await expect(
      service.approveDenganTandaTangan(aktor(UserRole.OWNER), 'shop-drawing', 1, { placements: [{}] } as any),
    ).rejects.toThrow('hanya dapat ditempatkan pada dokumen PDF');
  });

  it('berhasil approve dan mengembalikan effectiveFileUrl dari hasil signing', async () => {
    const { service, signing } = buatService();
    const dto = { placements: [{ signatureFile: '/tmp/ttd.png', signaturePage: 1, signatureXRatio: 0.1, signatureYRatio: 0.1, signatureWidthRatio: 0.2, signatureHeightRatio: 0.1 }] };

    const hasil = await service.approveDenganTandaTangan(aktor(UserRole.OWNER), 'shop-drawing', 1, dto as any);

    expect(signing.buatPdfSigned).toHaveBeenCalled();
    expect(hasil.effectiveFileUrl).toBe('eprom/project/1/engineer/shop-drawing/signed.pdf');
    expect(hasil.status).toBe(StatusApprovalEprom.APPROVED);
  });

  it('menghapus file hasil signing kalau transaksi gagal (race condition item sudah direview)', async () => {
    const { service, sharedModel, file } = buatService();
    sharedModel.findUnique
      .mockResolvedValueOnce(itemFixture())
      .mockResolvedValueOnce(itemFixture({ status: StatusApprovalEprom.APPROVED }));
    const dto = { placements: [{ signatureFile: '/tmp/ttd.png', signaturePage: 1, signatureXRatio: 0.1, signatureYRatio: 0.1, signatureWidthRatio: 0.2, signatureHeightRatio: 0.1 }] };

    await expect(service.approveDenganTandaTangan(aktor(UserRole.OWNER), 'shop-drawing', 1, dto as any)).rejects.toThrow(
      'sudah direview sebelumnya',
    );
    expect(file.hapus).toHaveBeenCalledWith('eprom/project/1/engineer/shop-drawing/signed.pdf');
  });
});

describe('EpromEngineerService.approveTanpaTandaTangan', () => {
  it('menolak item yang sudah tidak PENDING', async () => {
    const { service } = buatService({ item: itemFixture({ status: StatusApprovalEprom.REJECTED }) });

    await expect(service.approveTanpaTandaTangan(aktor(UserRole.OWNER), 'shop-drawing', 1)).rejects.toThrow(
      'sudah direview sebelumnya',
    );
  });

  it('menolak kalau dokumen belum diunggah', async () => {
    const { service } = buatService({ item: itemFixture({ fileUrl: null }) });

    await expect(service.approveTanpaTandaTangan(aktor(UserRole.OWNER), 'shop-drawing', 1)).rejects.toThrow(
      'Dokumen belum diunggah',
    );
  });

  it('berhasil approve tanpa tanda tangan', async () => {
    const { service } = buatService();

    const hasil = await service.approveTanpaTandaTangan(aktor(UserRole.OWNER), 'shop-drawing', 1);

    expect(hasil.status).toBe(StatusApprovalEprom.APPROVED);
    expect(hasil.latestApproval.adaTandaTangan).toBe(false);
  });
});

describe('EpromEngineerService.hapus', () => {
  it('melempar NotFoundException kalau item tidak ada', async () => {
    const { service } = buatService({ item: null });

    await expect(service.hapus(aktor(UserRole.OWNER), 'shop-drawing', 1)).rejects.toThrow(NotFoundException);
  });

  it('menolak Vendor yang bukan pemilik project item tersebut', async () => {
    const { service } = buatService({ projectAkses: { kontrak: { vendorId: 999 } } });

    await expect(service.hapus(aktor(UserRole.VENDOR, { vendorId: 1 }), 'shop-drawing', 1)).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('menolak hapus item yang sudah direview', async () => {
    const { service } = buatService({ item: itemFixture({ status: StatusApprovalEprom.APPROVED }) });

    await expect(service.hapus(aktor(UserRole.OWNER), 'shop-drawing', 1)).rejects.toThrow(
      'sudah direview tidak dapat dihapus',
    );
  });

  it('berhasil hapus item PENDING dan menghapus file fisiknya', async () => {
    const { service, sharedModel, file } = buatService();

    const hasil = await service.hapus(aktor(UserRole.OWNER), 'shop-drawing', 1);

    expect(sharedModel.delete).toHaveBeenCalledWith({ where: { id: 1 } });
    expect(file.hapus).toHaveBeenCalledWith('eprom/project/1/engineer/shop-drawing/a.pdf');
    expect(hasil.message).toMatch(/berhasil dihapus/);
  });
});

describe('EpromEngineerService.ringkasanPending', () => {
  it('menghitung PENDING untuk keenam tipe engineer', async () => {
    const { service, sharedModel } = buatService();
    sharedModel.count.mockResolvedValue(3);

    const hasil = await service.ringkasanPending(aktor(UserRole.OWNER), 1);

    expect(Object.keys(hasil)).toHaveLength(6);
    expect(hasil['shop-drawing']).toBe(3);
  });
});

describe('EpromEngineerService.daftar — denganApproval', () => {
  it('effectiveFileUrl jatuh balik ke fileUrl asli kalau belum pernah di-approve', async () => {
    const { service, sharedModel } = buatService();
    sharedModel.findMany.mockResolvedValue([itemFixture()]);

    const [hasil] = await service.daftar(aktor(UserRole.OWNER), 'shop-drawing', 1);

    expect(hasil.effectiveFileUrl).toBe(itemFixture().fileUrl);
    expect(hasil.latestApproval).toBeNull();
  });

  it('effectiveFileUrl memakai signedFilePath dari approval terbaru', async () => {
    const { service, sharedModel } = buatService({
      approvals: [{ documentId: 1, signedFilePath: 'eprom/signed-final.pdf' }],
    });
    sharedModel.findMany.mockResolvedValue([itemFixture()]);

    const [hasil] = await service.daftar(aktor(UserRole.OWNER), 'shop-drawing', 1);

    expect(hasil.effectiveFileUrl).toBe('eprom/signed-final.pdf');
  });
});
