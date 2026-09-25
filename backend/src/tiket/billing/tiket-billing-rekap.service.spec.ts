import { BadRequestException } from '@nestjs/common';
import { PDFDocument } from 'pdf-lib';
import AdmZip from 'adm-zip';
import { TiketBillingRekapService } from './tiket-billing-rekap.service';

/**
 * cariBatasGrandTotal() sungguhan pakai pdfjs-dist (ESM murni) yang tidak
 * bisa di-load di lingkungan Jest tanpa --experimental-vm-modules — sudah
 * diverifikasi terpisah lewat ts-node bahwa kodenya jalan normal di
 * runtime Nest asli. Di test ini di-mock lewat jest.spyOn supaya fokus
 * menguji logika grid/potongan milik service sendiri, bukan pdfjs-nya.
 */
function mockBatasGrandTotal(...urutanY: (number | null)[]) {
  const spy = jest.spyOn(
    TiketBillingRekapService.prototype as any,
    'cariBatasGrandTotal',
  );

  for (const y of urutanY) {
    spy.mockResolvedValueOnce(y);
  }

  return spy;
}

async function buatPdfPolos(width = 595, height = 842): Promise<Buffer> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([width, height]);
  // pdf-lib tidak bisa embed halaman tanpa content stream sama sekali -
  // gambar 1 titik nyaris tak terlihat supaya halaman punya isi minimal.
  page.drawRectangle({ x: 0, y: 0, width: 1, height: 1, opacity: 0 });
  const bytes = await doc.save();
  return Buffer.from(bytes);
}

function buatZip(files: { nama: string; data: Buffer }[]): Buffer {
  const zip = new AdmZip();

  for (const file of files) {
    zip.addFile(file.nama, file.data);
  }

  return zip.toBuffer();
}

afterEach(() => {
  jest.restoreAllMocks();
});

describe('TiketBillingRekapService.generate', () => {
  it('menolak ZIP yang rusak/bukan format ZIP', async () => {
    const service = new TiketBillingRekapService();

    await expect(
      service.generate(Buffer.from('bukan zip sama sekali')),
    ).rejects.toThrow(BadRequestException);
  });

  it('menolak ZIP yang tidak berisi file PDF sama sekali', async () => {
    const service = new TiketBillingRekapService();
    const zip = buatZip([{ nama: 'catatan.txt', data: Buffer.from('halo') }]);

    await expect(service.generate(zip)).rejects.toThrow(
      'ZIP tidak berisi file PDF sama sekali',
    );
  });

  it('menolak kalau salah satu entry .pdf ternyata bukan PDF valid', async () => {
    const service = new TiketBillingRekapService();
    const zip = buatZip([
      { nama: '001.pdf', data: Buffer.from('bukan pdf beneran') },
    ]);

    await expect(service.generate(zip)).rejects.toThrow(
      '001.pdf bukan PDF yang valid',
    );
  });

  it('8 invoice yang muat proporsional -> jadi 1 halaman rekap (grid 8)', async () => {
    mockBatasGrandTotal(450, 450, 450, 450, 450, 450, 450, 450);

    const service = new TiketBillingRekapService();
    const data = await buatPdfPolos();
    const files = Array.from({ length: 8 }, (_, i) => ({
      nama: `${String(i + 1).padStart(3, '0')}.pdf`,
      data,
    }));

    const hasil = await service.generate(buatZip(files));
    const dokumenHasil = await PDFDocument.load(hasil);

    expect(dokumenHasil.getPageCount()).toBe(1);
  });

  it('9 invoice yang muat proporsional -> jadi 2 halaman rekap (8 + 1)', async () => {
    mockBatasGrandTotal(450, 450, 450, 450, 450, 450, 450, 450, 450);

    const service = new TiketBillingRekapService();
    const data = await buatPdfPolos();
    const files = Array.from({ length: 9 }, (_, i) => ({
      nama: `${String(i + 1).padStart(3, '0')}.pdf`,
      data,
    }));

    const hasil = await service.generate(buatZip(files));
    const dokumenHasil = await PDFDocument.load(hasil);

    expect(dokumenHasil.getPageCount()).toBe(2);
  });

  it('8 invoice yang "kepanjangan" (Grand Total jauh dari atas) cuma muat 6 di halaman pertama, sisanya lanjut halaman kedua', async () => {
    // Semua invoice sama-sama panjang (potongan tinggi) - baris demi baris
    // dipasang rapat mengikuti tinggi asli, begitu baris ke-4 (item 7 & 8)
    // sudah tidak muat lagi di sisa halaman, berhenti di 6 (3 baris) dan
    // sisa 2 invoice lanjut ke halaman berikutnya.
    mockBatasGrandTotal(300, 300, 300, 300, 300, 300, 300, 300);

    const service = new TiketBillingRekapService();
    const data = await buatPdfPolos();
    const files = Array.from({ length: 8 }, (_, i) => ({
      nama: `${String(i + 1).padStart(3, '0')}.pdf`,
      data,
    }));

    const hasil = await service.generate(buatZip(files));
    const dokumenHasil = await PDFDocument.load(hasil);

    expect(dokumenHasil.getPageCount()).toBe(2);
  });

  it('invoice tanpa baris "Grand Total" tetap diproses (fallback tinggi halaman penuh, tidak error)', async () => {
    mockBatasGrandTotal(null);

    const service = new TiketBillingRekapService();
    const data = await buatPdfPolos();
    const hasil = await service.generate(buatZip([{ nama: '001.pdf', data }]));

    const dokumenHasil = await PDFDocument.load(hasil);
    expect(dokumenHasil.getPageCount()).toBe(1);
  });

  it('mengurutkan file berdasarkan nama secara numerik sebelum diproses', async () => {
    mockBatasGrandTotal(450, 450, 450);

    const service = new TiketBillingRekapService();
    const data = await buatPdfPolos();

    // Nama sengaja dibalik urutan penulisannya di ZIP.
    const hasil = await service.generate(
      buatZip([
        { nama: '2.pdf', data },
        { nama: '10.pdf', data },
        { nama: '1.pdf', data },
      ]),
    );

    const dokumenHasil = await PDFDocument.load(hasil);
    expect(dokumenHasil.getPageCount()).toBe(1);
  });

  it('mengabaikan entry ZIP yang bukan .pdf (mis. gambar/README)', async () => {
    mockBatasGrandTotal(450);

    const service = new TiketBillingRekapService();
    const data = await buatPdfPolos();

    const hasil = await service.generate(
      buatZip([
        { nama: '001.pdf', data },
        { nama: 'readme.txt', data: Buffer.from('bukan invoice') },
      ]),
    );

    const dokumenHasil = await PDFDocument.load(hasil);
    expect(dokumenHasil.getPageCount()).toBe(1);
  });
});
