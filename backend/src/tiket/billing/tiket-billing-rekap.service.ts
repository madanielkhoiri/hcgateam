// ==================================================
// FILE: backend/src/tiket/billing/tiket-billing-rekap.service.ts
// FUNGSI: Gabungkan banyak PDF invoice (dari 1 file ZIP) jadi satu PDF
// rekap, 2 kolom per baris, urutan kiri-kanan baru turun ke baris
// berikutnya, maksimal 8 invoice per halaman.
//
// Tiap invoice dipotong dulu dari atas halaman sampai baris "Grand
// Total" (bagian "Note" syarat & ketentuan di bawahnya dibuang) —
// posisi Grand Total dicari otomatis lewat ekstraksi teks PDF (posisi
// baris ini beda-beda tiap invoice tergantung jumlah penumpangnya).
//
// Tinggi tiap baris MENGIKUTI tinggi konten invoice yang sebenarnya
// (bukan sel tetap 1/4 atau 1/6 halaman) supaya tidak ada jarak kosong
// besar di antara baris. Kalau invoice-nya panjang, baris berikutnya
// otomatis tidak muat lagi di halaman yang sama -> halaman itu berhenti
// di bawah 8 (mis. 6 atau 4), sisanya lanjut ke halaman berikutnya.
// ==================================================

import { BadRequestException, Injectable } from '@nestjs/common';
import { PDFDocument, PDFPage } from 'pdf-lib';
import AdmZip from 'adm-zip';

/** Jarak aman di bawah baseline teks "Grand Total" sebelum dipotong (pt). */
const PADDING_BAWAH_GRAND_TOTAL = 8;

const PAGE_WIDTH = 595.28; // A4 potrait, satuan pt
const PAGE_HEIGHT = 841.89;
const MARGIN = 24;
const GUTTER = 10;
const KOLOM = 2;
const MAKS_PER_HALAMAN = 8;

const LEBAR_SEL = (PAGE_WIDTH - MARGIN * 2 - GUTTER * (KOLOM - 1)) / KOLOM;

type InvoiceSumber = {
  nama: string;
  halaman: PDFPage;
  width: number;
  /** Tinggi EFEKTIF setelah dipotong sampai Grand Total (bukan tinggi halaman asli). */
  height: number;
  /** Batas bawah potongan, satuan Y PDF (dari dasar halaman) - untuk boundingBox saat embed. */
  batasBawah: number;
  /** Tinggi invoice setelah diskalakan mengikuti lebar 1 kolom (dipakai untuk susun baris rapat). */
  tinggiTerskala: number;
};

@Injectable()
export class TiketBillingRekapService {
  /** Ambil seluruh entry .pdf dari ZIP, urut berdasarkan nama file (mengikuti urutan penomoran invoice). */
  private bacaZip(zipBuffer: Buffer): { nama: string; data: Buffer }[] {
    let zip: AdmZip;

    try {
      zip = new AdmZip(zipBuffer);
    } catch {
      throw new BadRequestException('File ZIP tidak valid atau rusak');
    }

    const entries = zip
      .getEntries()
      .filter(
        (entry) =>
          !entry.isDirectory && entry.entryName.toLowerCase().endsWith('.pdf'),
      )
      .sort((a, b) =>
        a.entryName.localeCompare(b.entryName, undefined, { numeric: true }),
      );

    if (entries.length === 0) {
      throw new BadRequestException('ZIP tidak berisi file PDF sama sekali');
    }

    return entries.map((entry) => ({
      nama: entry.entryName,
      data: entry.getData(),
    }));
  }

  /**
   * Cari posisi Y (dari dasar halaman, satuan pt) baris yang memuat teks
   * "Grand Total". Instance method (bukan fungsi lepas) supaya bisa
   * di-mock via jest.spyOn di test — pdfjs-dist v5 murni ESM dan tidak
   * bisa di-load langsung di lingkungan Jest (CommonJS) tanpa
   * --experimental-vm-modules, padahal jalan normal di runtime Nest asli.
   */
  private async cariBatasGrandTotal(pdfBytes: Buffer): Promise<number | null> {
    const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');

    const dokumen = await pdfjsLib.getDocument({
      data: new Uint8Array(pdfBytes),
      useSystemFonts: false,
      isEvalSupported: false,
    }).promise;

    try {
      const halaman = await dokumen.getPage(1);
      const konten = await halaman.getTextContent();

      // Kelompokkan per baris (Y dibulatkan) - "Grand" & "Total" kadang jadi
      // 2 text-run terpisah tapi tetap satu baris yang sama.
      const baris = new Map<number, string>();

      for (const item of konten.items) {
        if (!('str' in item) || !('transform' in item)) {
          continue;
        }

        const y = Math.round(item.transform[5]);
        baris.set(y, `${baris.get(y) ?? ''}${item.str}`);
      }

      for (const [y, teks] of baris) {
        if (teks.toLowerCase().replace(/\s+/g, '').includes('grandtotal')) {
          return y;
        }
      }

      return null;
    } finally {
      await dokumen.destroy();
    }
  }

  async generate(zipBuffer: Buffer): Promise<Buffer> {
    const berkasPdf = this.bacaZip(zipBuffer);

    const sumber: InvoiceSumber[] = [];

    for (const berkas of berkasPdf) {
      let dokumenSumber: PDFDocument;

      try {
        dokumenSumber = await PDFDocument.load(berkas.data);
      } catch {
        throw new BadRequestException(
          `File ${berkas.nama} bukan PDF yang valid`,
        );
      }

      const [halamanPertama] = dokumenSumber.getPages();

      if (!halamanPertama) {
        continue;
      }

      const { width, height } = halamanPertama.getSize();

      // Potong dari atas halaman sampai baris "Grand Total" - bagian Note
      // syarat & ketentuan di bawahnya tidak ikut ditampilkan di grid.
      // Kalau baris Grand Total tidak ketemu (layout tidak terduga),
      // pakai tinggi halaman penuh sebagai fallback aman.
      const yGrandTotal = await this.cariBatasGrandTotal(berkas.data);
      const batasBawah =
        yGrandTotal !== null
          ? Math.max(0, yGrandTotal - PADDING_BAWAH_GRAND_TOTAL)
          : 0;

      const tinggiEfektif = height - batasBawah;

      sumber.push({
        nama: berkas.nama,
        halaman: halamanPertama,
        width,
        height: tinggiEfektif,
        batasBawah,
        tinggiTerskala: tinggiEfektif * (LEBAR_SEL / width),
      });
    }

    if (sumber.length === 0) {
      throw new BadRequestException('Tidak ada halaman PDF yang bisa diproses dari ZIP ini');
    }

    const dokumenHasil = await PDFDocument.create();
    const batasBawahHalaman = MARGIN;

    let index = 0;

    while (index < sumber.length) {
      const halamanBaru = dokumenHasil.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      let yAtasBaris = PAGE_HEIGHT - MARGIN;
      let jumlahDiHalamanIni = 0;

      while (index < sumber.length && jumlahDiHalamanIni < MAKS_PER_HALAMAN) {
        const kiri = sumber[index];
        const kanan = sumber[index + 1];
        const tinggiBaris = Math.max(
          kiri.tinggiTerskala,
          kanan?.tinggiTerskala ?? 0,
        );

        // Kalau baris ini bikin melewati batas bawah halaman, berhenti di
        // sini (kecuali halaman masih kosong sama sekali - tetap ditaruh
        // supaya invoice yang sangat panjang tidak hilang/infinite loop).
        if (
          jumlahDiHalamanIni > 0 &&
          yAtasBaris - tinggiBaris < batasBawahHalaman
        ) {
          break;
        }

        await this.gambarInvoice(dokumenHasil, halamanBaru, kiri, MARGIN, yAtasBaris);
        index += 1;
        jumlahDiHalamanIni += 1;

        if (kanan) {
          await this.gambarInvoice(
            dokumenHasil,
            halamanBaru,
            kanan,
            MARGIN + LEBAR_SEL + GUTTER,
            yAtasBaris,
          );
          index += 1;
          jumlahDiHalamanIni += 1;
        }

        yAtasBaris -= tinggiBaris + GUTTER;
      }
    }

    const bytes = await dokumenHasil.save();
    return Buffer.from(bytes);
  }

  /** Gambar 1 invoice (rata kolom kiri-atas selnya) di posisi (x, yAtas ke bawah). */
  private async gambarInvoice(
    dokumenHasil: PDFDocument,
    halaman: PDFPage,
    item: InvoiceSumber,
    x: number,
    yAtas: number,
  ): Promise<void> {
    const embedded = await dokumenHasil.embedPage(item.halaman, {
      left: 0,
      right: item.width,
      bottom: item.batasBawah,
      top: item.batasBawah + item.height,
    });

    halaman.drawPage(embedded, {
      x,
      y: yAtas - item.tinggiTerskala,
      width: LEBAR_SEL,
      height: item.tinggiTerskala,
    });
  }
}

// ==================================================
// SELESAI: backend/src/tiket/billing/tiket-billing-rekap.service.ts
// ==================================================
