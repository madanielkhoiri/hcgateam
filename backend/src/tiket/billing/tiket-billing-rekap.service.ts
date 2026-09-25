// ==================================================
// FILE: backend/src/tiket/billing/tiket-billing-rekap.service.ts
// FUNGSI: Gabungkan banyak PDF invoice (dari 1 file ZIP) jadi satu PDF
// rekap dalam grid 8 kotak (2 kolom x 4 baris) per halaman. Urutan
// pengisian: kiri-kanan per baris, baru turun ke baris berikutnya.
//
// Tiap invoice dipotong dulu dari atas halaman sampai baris "Grand
// Total" (bagian "Note" syarat & ketentuan di bawahnya dibuang) —
// posisi Grand Total dicari otomatis lewat ekstraksi teks PDF (posisi
// baris ini beda-beda tiap invoice tergantung jumlah penumpangnya).
// Kalau ada invoice yang setelah dipotong masih tidak muat proporsional
// di slot 8-grid, halaman itu otomatis turun jadi 6 kotak (2 kolom x 3
// baris) supaya tetap terbaca, sisanya lanjut ke halaman berikutnya.
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
const TOLERANSI_TINGGI = 0.5; // pt, jaga-jaga pembulatan

type UkuranSel = { width: number; height: number };

function ukuranSel(baris: number): UkuranSel {
  return {
    width: (PAGE_WIDTH - MARGIN * 2 - GUTTER * (KOLOM - 1)) / KOLOM,
    height: (PAGE_HEIGHT - MARGIN * 2 - GUTTER * (baris - 1)) / baris,
  };
}

const SEL_8 = ukuranSel(4);
const SEL_6 = ukuranSel(3);

type InvoiceSumber = {
  nama: string;
  halaman: PDFPage;
  width: number;
  /** Tinggi EFEKTIF setelah dipotong sampai Grand Total (bukan tinggi halaman asli). */
  height: number;
  /** Batas bawah potongan, satuan Y PDF (dari dasar halaman) - untuk boundingBox saat embed. */
  batasBawah: number;
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

  /** Cek apakah invoice muat proporsional (tanpa terpotong) di ukuran sel tertentu saat diskalakan mengikuti lebar sel. */
  private muatDiSel(item: { width: number; height: number }, sel: UkuranSel): boolean {
    const skalaMengikutiLebar = sel.width / item.width;
    return item.height * skalaMengikutiLebar <= sel.height + TOLERANSI_TINGGI;
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

      sumber.push({
        nama: berkas.nama,
        halaman: halamanPertama,
        width,
        height: height - batasBawah,
        batasBawah,
      });
    }

    if (sumber.length === 0) {
      throw new BadRequestException('Tidak ada halaman PDF yang bisa diproses dari ZIP ini');
    }

    const dokumenHasil = await PDFDocument.create();

    let index = 0;

    while (index < sumber.length) {
      const kandidat8 = sumber.slice(index, index + 8);
      const genap8 = kandidat8.length === 8;
      const semuaMuat8 = kandidat8.every((item) => this.muatDiSel(item, SEL_8));
      const pakai8Grid = genap8 && semuaMuat8;

      const sel = pakai8Grid ? SEL_8 : SEL_6;
      const jumlahDipakai = pakai8Grid ? 8 : Math.min(6, sumber.length - index);
      const kelompok = sumber.slice(index, index + jumlahDipakai);

      const halamanBaru = dokumenHasil.addPage([PAGE_WIDTH, PAGE_HEIGHT]);

      for (let i = 0; i < kelompok.length; i += 1) {
        const item = kelompok[i];
        const embedded = await dokumenHasil.embedPage(item.halaman, {
          left: 0,
          right: item.width,
          bottom: item.batasBawah,
          top: item.batasBawah + item.height,
        });

        const barisKe = Math.floor(i / KOLOM);
        const kolomKe = i % KOLOM;

        const skala = Math.min(sel.width / item.width, sel.height / item.height);
        const gambarWidth = item.width * skala;
        const gambarHeight = item.height * skala;

        const selX = MARGIN + kolomKe * (sel.width + GUTTER);
        const selYAtas =
          PAGE_HEIGHT - MARGIN - (barisKe + 1) * sel.height - barisKe * GUTTER;

        // Tengahkan invoice di dalam selnya (biar rapi walau proporsi beda-beda).
        const x = selX + (sel.width - gambarWidth) / 2;
        const y = selYAtas + (sel.height - gambarHeight) / 2;

        halamanBaru.drawPage(embedded, {
          x,
          y,
          width: gambarWidth,
          height: gambarHeight,
        });
      }

      index += jumlahDipakai;
    }

    const bytes = await dokumenHasil.save();
    return Buffer.from(bytes);
  }
}

// ==================================================
// SELESAI: backend/src/tiket/billing/tiket-billing-rekap.service.ts
// ==================================================
