import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EpromFileService } from '../common/eprom-file.service';
import { MailgunService } from '../../mailgun/mailgun.service';
import { EpromTenderChatGateway } from './eprom-tender-chat.gateway';
import { EpromTenderChatService } from './eprom-tender-chat.service';

function undanganFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    tenderId: 1,
    vendorId: 1,
    tender: { namaTender: 'Tender A' },
    vendor: { namaVendor: 'PT A', email: 'vendor@contoh.test' },
    ...overrides,
  };
}

function buatService(overrides: {
  undangan?: unknown;
  pesanTerakhir?: unknown;
  mailAktif?: boolean;
  domain?: string | undefined;
} = {}) {
  const pesanCreate = jest.fn(({ data }) => Promise.resolve({ id: 1, ...data }));
  const pesanUpdate = jest.fn(({ data }) => Promise.resolve({ id: 1, ...data }));
  const pesanFindMany = jest.fn().mockResolvedValue([]);
  const pesanFindFirst = jest.fn().mockResolvedValue('pesanTerakhir' in overrides ? overrides.pesanTerakhir : null);

  const prisma = {
    tenderUndangan: {
      findUnique: jest.fn().mockResolvedValue('undangan' in overrides ? overrides.undangan : undanganFixture()),
    },
    tenderPesan: {
      create: pesanCreate,
      update: pesanUpdate,
      findMany: pesanFindMany,
      findFirst: pesanFindFirst,
    },
  } as unknown as PrismaService;

  const file = {
    simpanDokumen: jest.fn((berkas: any, scope: string) => `eprom/${scope}/${berkas.originalname}`),
  } as unknown as EpromFileService;

  const mailgun = {
    aktif: overrides.mailAktif ?? true,
    domainAktif: 'domain' in overrides ? overrides.domain : 'mail.contoh.test',
    kirim: jest.fn().mockResolvedValue({ berhasil: true, messageId: '<baru@mailgun>' }),
  } as unknown as MailgunService;

  const gateway = {
    emitPesanBaru: jest.fn(),
  } as unknown as EpromTenderChatGateway;

  const service = new EpromTenderChatService(prisma, file, mailgun, gateway);

  return { service, prisma, file, mailgun, gateway, pesanCreate, pesanUpdate, pesanFindMany };
}

describe('EpromTenderChatService.daftarPesan', () => {
  it('melempar NotFoundException kalau undangan tidak ada', async () => {
    const { service } = buatService({ undangan: null });

    await expect(service.daftarPesan(1, 1)).rejects.toThrow(NotFoundException);
  });

  it('mengembalikan daftar pesan, info vendor, dan status mailAktif', async () => {
    const { service, pesanFindMany } = buatService({ mailAktif: false });
    pesanFindMany.mockResolvedValue([{ id: 1, isiPesan: 'Halo' }]);

    const hasil = await service.daftarPesan(1, 1);

    expect(hasil.undanganId).toBe(1);
    expect(hasil.vendor).toEqual({ namaVendor: 'PT A', email: 'vendor@contoh.test' });
    expect(hasil.mailAktif).toBe(false);
    expect(hasil.pesan).toEqual([{ id: 1, isiPesan: 'Halo' }]);
  });
});

describe('EpromTenderChatService.kirimPesanKeluar', () => {
  const aktor = { id: 9, username: 'owner', role: 'OWNER' } as any;

  it('menolak kalau isi kosong dan tidak ada lampiran', async () => {
    const { service } = buatService();

    await expect(service.kirimPesanKeluar(aktor, 1, 1, '   ', [])).rejects.toThrow(BadRequestException);
  });

  it('melempar NotFoundException kalau undangan tidak ada', async () => {
    const { service } = buatService({ undangan: null });

    await expect(service.kirimPesanKeluar(aktor, 1, 1, 'Halo', [])).rejects.toThrow(NotFoundException);
  });

  it('membuat TenderPesan arah KELUAR dengan pengirimId dari aktor', async () => {
    const { service, pesanCreate } = buatService();

    await service.kirimPesanKeluar(aktor, 1, 1, 'Halo vendor', []);

    expect(pesanCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ undanganId: 1, arah: 'KELUAR', isiPesan: 'Halo vendor', pengirimId: 9 }),
      }),
    );
  });

  it('mengirim email lewat Mailgun ke vendor dengan replyTo alamat inbound', async () => {
    const { service, mailgun } = buatService();

    await service.kirimPesanKeluar(aktor, 1, 1, 'Halo vendor', []);

    expect(mailgun.kirim).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'vendor@contoh.test', replyTo: 'tender-1@mail.contoh.test' }),
    );
  });

  it('menyertakan inReplyTo/references dari pesan terakhir kalau ada', async () => {
    const { service, mailgun } = buatService({ pesanTerakhir: { messageId: '<lama@mailgun>' } });

    await service.kirimPesanKeluar(aktor, 1, 1, 'Balasan', []);

    expect(mailgun.kirim).toHaveBeenCalledWith(
      expect.objectContaining({ inReplyTo: '<lama@mailgun>', references: '<lama@mailgun>' }),
    );
  });

  it('update messageId pesan setelah Mailgun sukses', async () => {
    const { service, pesanUpdate } = buatService();

    await service.kirimPesanKeluar(aktor, 1, 1, 'Halo', []);

    expect(pesanUpdate).toHaveBeenCalledWith({ where: { id: 1 }, data: { messageId: '<baru@mailgun>' } });
  });

  it('tidak kirim email kalau vendor tidak punya alamat email', async () => {
    const { service, mailgun } = buatService({ undangan: undanganFixture({ vendor: { namaVendor: 'PT A', email: null } }) });

    await service.kirimPesanKeluar(aktor, 1, 1, 'Halo', []);

    expect(mailgun.kirim).not.toHaveBeenCalled();
  });

  it('menyimpan lampiran lewat EpromFileService dengan scope yang benar', async () => {
    const { service, file } = buatService();
    const dummyFile = { originalname: 'dok.pdf', buffer: Buffer.from('x') } as Express.Multer.File;

    await service.kirimPesanKeluar(aktor, 1, 1, 'Halo', [dummyFile]);

    expect(file.simpanDokumen).toHaveBeenCalledWith(dummyFile, 'tender/1/pesan/1');
  });

  it('memanggil gateway.emitPesanBaru ke room undangan yang benar', async () => {
    const { service, gateway } = buatService();

    await service.kirimPesanKeluar(aktor, 1, 1, 'Halo', []);

    expect(gateway.emitPesanBaru).toHaveBeenCalledWith(1, expect.objectContaining({ arah: 'KELUAR' }));
  });
});

describe('EpromTenderChatService.terimaPesanMasuk', () => {
  it('return null kalau alamat recipient tidak sesuai format tender-{id}@domain', async () => {
    const { service, prisma } = buatService();

    const hasil = await service.terimaPesanMasuk({ recipient: 'salah@format.test' });

    expect(hasil).toBeNull();
    expect(prisma.tenderUndangan.findUnique).not.toHaveBeenCalled();
  });

  it('return null kalau undangan dengan id tersebut tidak ditemukan', async () => {
    const { service } = buatService({ undangan: null });

    const hasil = await service.terimaPesanMasuk({ recipient: 'tender-1@mail.contoh.test' });

    expect(hasil).toBeNull();
  });

  it('membuat TenderPesan arah MASUK dari body-plain/stripped-text', async () => {
    const { service, pesanCreate } = buatService();

    await service.terimaPesanMasuk({
      recipient: 'tender-1@mail.contoh.test',
      'stripped-text': 'Balasan vendor',
      'Message-Id': '<vendor@mail>',
    });

    expect(pesanCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ undanganId: 1, arah: 'MASUK', isiPesan: 'Balasan vendor', messageId: '<vendor@mail>' }),
      }),
    );
  });

  it('fallback ke body-plain kalau stripped-text kosong', async () => {
    const { service, pesanCreate } = buatService();

    await service.terimaPesanMasuk({ recipient: 'tender-1@mail.contoh.test', 'body-plain': 'Isi lengkap' });

    expect(pesanCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ isiPesan: 'Isi lengkap' }) }),
    );
  });

  it('menyimpan attachment inbound lewat EpromFileService', async () => {
    const { service, file } = buatService();
    const dummyFile = { originalname: 'lampiran.pdf', buffer: Buffer.from('x') } as Express.Multer.File;

    await service.terimaPesanMasuk({ recipient: 'tender-1@mail.contoh.test', 'body-plain': 'Halo' }, [dummyFile]);

    expect(file.simpanDokumen).toHaveBeenCalledWith(dummyFile, 'tender/1/pesan/1');
  });

  it('memanggil gateway.emitPesanBaru setelah pesan MASUK dibuat', async () => {
    const { service, gateway } = buatService();

    await service.terimaPesanMasuk({ recipient: 'tender-1@mail.contoh.test', 'body-plain': 'Halo' });

    expect(gateway.emitPesanBaru).toHaveBeenCalledWith(1, expect.objectContaining({ arah: 'MASUK' }));
  });
});
