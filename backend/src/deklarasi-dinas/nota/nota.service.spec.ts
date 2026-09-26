import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { SaldoService } from '../saldo/saldo.service';
import { OcrSpaceService } from './ocr-space.service';
import { NotaService } from './nota.service';

describe('NotaService.ubahStatusNota — akses', () => {
  it('menolak role yang bukan Admin/Admin HC/Section Head SEBELUM menyentuh database', async () => {
    const findUnique = jest.fn();
    const prisma = { nota: { findUnique } } as unknown as PrismaService;
    const saldoService = {} as unknown as SaldoService;
    const ocrSpaceService = {} as unknown as OcrSpaceService;
    const service = new NotaService(prisma, saldoService, ocrSpaceService);

    await expect(
      service.ubahStatusNota(1, 'DIVERIFIKASI', undefined, { role: UserRole.KARYAWAN }),
    ).rejects.toThrow(ForbiddenException);
    expect(findUnique).not.toHaveBeenCalled();
  });
});

describe('NotaService.ubahNota — karyawan ganti foto (OCR ulang) dan data nota', () => {
  function buatService(opsi: {
    statusDeklarasi?: string;
    statusNota?: string;
    statusSaldo?: string;
    nominalOcr?: number;
  } = {}) {
    const nota = {
      id: 5,
      idDeklarasi: 9,
      statusVerifikasi: opsi.statusNota ?? 'OCR_SELESAI',
      pathFile: '/uploads/nota/lama.jpg',
    };
    const deklarasi = {
      id: 9,
      idSaldo: 3,
      jenisDeklarasi: 'UANG_OPERASIONAL',
      status: opsi.statusDeklarasi ?? 'DRAFT',
    };

    const notaUpdate = jest.fn(({ data }) => Promise.resolve({ ...nota, ...data }));
    const prisma = {
      nota: {
        findUnique: jest.fn().mockResolvedValue(nota),
        update: notaUpdate,
        findMany: jest.fn().mockResolvedValue([]),
      },
      deklarasi: {
        findUnique: jest.fn().mockResolvedValue(deklarasi),
        update: jest.fn().mockResolvedValue({}),
      },
    } as unknown as PrismaService;

    const saldoService = {
      ambilSaldoBerdasarkanId: jest
        .fn()
        .mockResolvedValue({ statusSaldo: opsi.statusSaldo ?? 'AKTIF' }),
      hitungUlangSaldo: jest.fn().mockResolvedValue({}),
    } as unknown as SaldoService;

    const bacaNota = jest.fn().mockResolvedValue({
      hasil_ocr_text: 'GRAND TOTAL 130.500',
      nominal_ocr: opsi.nominalOcr ?? 130500,
    });
    const ocrSpaceService = { bacaNota } as unknown as OcrSpaceService;

    const service = new NotaService(prisma, saldoService, ocrSpaceService);

    return { service, notaUpdate, bacaNota, saldoService };
  }

  const fileBaru = () =>
    ({
      path: 'uploads/nota-uji/tidak-ada.png',
      filename: 'tidak-ada.png',
      originalname: 'nota.png',
      mimetype: 'image/png',
    }) as unknown as Express.Multer.File;

  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
  });

  afterEach(() => jest.restoreAllMocks());

  it.each(['DIAJUKAN', 'DIVERIFIKASI', 'DISETUJUI'])(
    'menolak ubah nota saat deklarasi berstatus %s',
    async (status) => {
      const { service, notaUpdate, bacaNota } = buatService({ statusDeklarasi: status });

      await expect(service.ubahNota(5, fileBaru(), {})).rejects.toThrow(BadRequestException);
      expect(notaUpdate).not.toHaveBeenCalled();
      expect(bacaNota).not.toHaveBeenCalled();
    },
  );

  it('menolak ubah nota yang sudah DIVERIFIKASI', async () => {
    const { service, notaUpdate } = buatService({ statusNota: 'DIVERIFIKASI' });

    await expect(service.ubahNota(5, fileBaru(), {})).rejects.toThrow(BadRequestException);
    expect(notaUpdate).not.toHaveBeenCalled();
  });

  it('menolak ubah nota bila saldo sudah SELESAI', async () => {
    const { service, notaUpdate } = buatService({ statusSaldo: 'SELESAI' });

    await expect(service.ubahNota(5, fileBaru(), {})).rejects.toThrow(BadRequestException);
    expect(notaUpdate).not.toHaveBeenCalled();
  });

  it('menolak kategori yang tidak sesuai jenis deklarasi', async () => {
    const { service, notaUpdate } = buatService();

    await expect(
      service.ubahNota(5, undefined, { kategoriNota: 'MAKAN' }),
    ).rejects.toThrow(BadRequestException);
    expect(notaUpdate).not.toHaveBeenCalled();
  });

  it('ganti foto: OCR dijalankan ulang, nominal & status diperbarui, total dihitung ulang', async () => {
    const { service, notaUpdate, bacaNota, saldoService } = buatService();

    await service.ubahNota(5, fileBaru(), {});

    expect(bacaNota).toHaveBeenCalledTimes(1);
    expect(notaUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 5 },
        data: expect.objectContaining({
          nominalOcr: 130500,
          nominalFinal: 130500,
          apakahDikoreksi: false,
          alasanKoreksi: null,
          statusVerifikasi: 'OCR_SELESAI',
          hasilOcrText: 'GRAND TOTAL 130.500',
        }),
      }),
    );
    expect(saldoService.hitungUlangSaldo).toHaveBeenCalled();
  });

  it('ganti foto: OCR tidak menemukan nominal -> status BELUM_OCR agar diisi manual', async () => {
    const { service, notaUpdate } = buatService({ nominalOcr: 0 });

    await service.ubahNota(5, fileBaru(), {});

    expect(notaUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ nominalFinal: 0, statusVerifikasi: 'BELUM_OCR' }),
      }),
    );
  });

  it('tanpa foto baru hanya mengubah data settlement dan TIDAK menjalankan OCR', async () => {
    const { service, notaUpdate, bacaNota } = buatService();

    await service.ubahNota(5, undefined, {
      kategoriNota: 'DANA_OPERASIONAL_W1',
      barangJasa: '  Makan siang ',
      jumlahItemSettlement: 3,
    });

    expect(bacaNota).not.toHaveBeenCalled();
    expect(notaUpdate).toHaveBeenCalledWith({
      where: { id: 5 },
      data: {
        kategoriNota: 'DANA_OPERASIONAL_W1',
        barangJasa: 'Makan siang',
        jumlahItemSettlement: 3,
      },
    });
  });

  it('menolak bila tidak ada perubahan yang dikirim', async () => {
    const { service, notaUpdate } = buatService();

    await expect(service.ubahNota(5, undefined, {})).rejects.toThrow(BadRequestException);
    expect(notaUpdate).not.toHaveBeenCalled();
  });
});
