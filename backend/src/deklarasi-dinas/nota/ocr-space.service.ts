import { Injectable } from '@nestjs/common';
import * as fs from 'fs';

type OcrSpaceWord = {
  WordText?: string;
  Left?: number;
  Top?: number;
  Height?: number;
  Width?: number;
};

type OcrSpaceLine = {
  LineText?: string;
  Words?: OcrSpaceWord[];
  MaxHeight?: number;
  MinTop?: number;
};

type OcrSpaceParsedResult = {
  ParsedText?: string;
  TextOverlay?: {
    Lines?: OcrSpaceLine[];
    HasOverlay?: boolean;
    Message?: string;
  };
};

type OcrSpaceResponse = {
  ParsedResults?: OcrSpaceParsedResult[];
  OCRExitCode?: number;
  IsErroredOnProcessing?: boolean;
  ErrorMessage?: string | string[];
};

type TokenNominal = {
  teks: string;
  nilai: number;
  index: number;
};

type BarisOcr = {
  teks: string;
  lower: string;
  top: number;
  left: number;
  right: number;
  words: OcrSpaceWord[];
};

@Injectable()
export class OcrSpaceService {
  private readonly apiKey = process.env.OCR_SPACE_API_KEY || '';

  async bacaNota(filePath: string): Promise<{
    hasil_ocr_text: string;
    nominal_ocr: number;
  }> {
    if (!this.apiKey) {
      return {
        hasil_ocr_text:
          'OCR otomatis belum aktif. OCR_SPACE_API_KEY belum diisi.',
        nominal_ocr: 0,
      };
    }

    if (!fs.existsSync(filePath)) {
      return {
        hasil_ocr_text:
          'OCR otomatis gagal. File nota tidak ditemukan di server.',
        nominal_ocr: 0,
      };
    }

    const formData = new FormData();

    const fileBuffer = fs.readFileSync(filePath);
    const blob = new Blob([fileBuffer]);

    formData.append('file', blob, filePath);
    formData.append('apikey', this.apiKey);
    formData.append('language', 'eng');
    formData.append('isOverlayRequired', 'true');
    formData.append('detectOrientation', 'true');
    formData.append('scale', 'true');
    formData.append('OCREngine', '2');

    const response = await fetch('https://api.ocr.space/parse/image', {
      method: 'POST',
      body: formData,
    });

    const hasil = (await response.json()) as OcrSpaceResponse;

    if (!response.ok || hasil.IsErroredOnProcessing) {
      return {
        hasil_ocr_text: Array.isArray(hasil.ErrorMessage)
          ? hasil.ErrorMessage.join(', ')
          : hasil.ErrorMessage || 'OCR otomatis gagal membaca nota.',
        nominal_ocr: 0,
      };
    }

    const parsedResults = hasil.ParsedResults || [];

    const teks =
      parsedResults
        .map((item) => item.ParsedText || '')
        .join('\n')
        .trim() || '';

    /*
     * Khusus Pertamina/SPBU diprioritaskan sebelum logika umum.
     * Supaya tidak salah ambil Total Harga 249.444 atau Uang Tunai 300.000.
     */
    const nominalPertamina = this.ambilNominalPertamina(teks);

    if (nominalPertamina > 0) {
      return {
        hasil_ocr_text: teks || 'OCR tidak menemukan teks pada nota.',
        nominal_ocr: nominalPertamina,
      };
    }

    const barisOverlay = this.ambilBarisDariOverlay(parsedResults);

    const nominalDariOverlay = this.ambilNominalDariLayoutOverlay(barisOverlay);

    const nominal =
      nominalDariOverlay > 0
        ? nominalDariOverlay
        : this.ambilNominalDariTeksFallback(teks);

    return {
      hasil_ocr_text: teks || 'OCR tidak menemukan teks pada nota.',
      nominal_ocr: nominal,
    };
  }

  private bersihkanSpasi(teks: string): string {
    return teks.replace(/\r?\n/g, ' ').replace(/\s+/g, ' ').trim();
  }

  private ambilBarisDariOverlay(
    parsedResults: OcrSpaceParsedResult[],
  ): BarisOcr[] {
    const semuaBaris: BarisOcr[] = [];

    for (const result of parsedResults) {
      const lines = result.TextOverlay?.Lines || [];

      for (const line of lines) {
        const words = line.Words || [];

        const teks =
          line.LineText ||
          words
            .map((word) => word.WordText || '')
            .join(' ')
            .trim();

        if (!teks) {
          continue;
        }

        const teksBersih = this.bersihkanSpasi(teks);

        const posisiTop =
          typeof line.MinTop === 'number'
            ? line.MinTop
            : words.length > 0
              ? Math.min(
                  ...words.map((word) =>
                    typeof word.Top === 'number' ? word.Top : 0,
                  ),
                )
              : 0;

        const posisiLeft =
          words.length > 0
            ? Math.min(
                ...words.map((word) =>
                  typeof word.Left === 'number' ? word.Left : 0,
                ),
              )
            : 0;

        const posisiRight =
          words.length > 0
            ? Math.max(
                ...words.map((word) => {
                  const left = typeof word.Left === 'number' ? word.Left : 0;
                  const width = typeof word.Width === 'number' ? word.Width : 0;

                  return left + width;
                }),
              )
            : 0;

        semuaBaris.push({
          teks: teksBersih,
          lower: teksBersih.toLowerCase(),
          top: posisiTop,
          left: posisiLeft,
          right: posisiRight,
          words,
        });
      }
    }

    return semuaBaris.sort((a, b) => a.top - b.top);
  }

  private ambilNominalDariLayoutOverlay(baris: BarisOcr[]): number {
    if (baris.length === 0) {
      return 0;
    }

    const grandTotal = this.cariNominalDenganLabelOverlay(baris, [
      'grand total',
      'grandtotal',
      'g total',
      'g.total',
    ]);

    if (grandTotal > 0) {
      return grandTotal;
    }

    const labelFinalKuat = this.cariNominalDenganLabelOverlay(baris, [
      'total amount',
      'amount due',
      'balance due',
      'total paid',
      'total payment',
      'total payable',
      'total bayar',
      'jumlah bayar',
      'total pembayaran',
      'jumlah pembayaran',
      'total tagihan',
      'jumlah tagihan',
      'total belanja',
      'net total',
      'nett total',
      'net amount',
    ]);

    if (labelFinalKuat > 0) {
      return labelFinalKuat;
    }

    const totalBiasa = this.cariNominalTotalBiasaOverlay(baris);

    if (totalBiasa > 0) {
      return totalBiasa;
    }

    return 0;
  }

  private cariNominalDenganLabelOverlay(
    baris: BarisOcr[],
    daftarLabel: string[],
  ): number {
    const kandidatBaris = baris.filter((item) => {
      const cocokLabel = daftarLabel.some((label) =>
        item.lower.includes(label),
      );

      if (!cocokLabel) {
        return false;
      }

      if (this.apakahBarisBukanTotalFinal(item.lower)) {
        return false;
      }

      return true;
    });

    for (let i = kandidatBaris.length - 1; i >= 0; i--) {
      const barisLabel = kandidatBaris[i];

      const nominalSatuBaris = this.ambilNominalDariBarisLabel(barisLabel);

      if (nominalSatuBaris > 0) {
        return nominalSatuBaris;
      }

      const nominalDekat = this.ambilNominalDariBarisTerdekat(
        baris,
        barisLabel,
      );

      if (nominalDekat > 0) {
        return nominalDekat;
      }
    }

    return 0;
  }

  private cariNominalTotalBiasaOverlay(baris: BarisOcr[]): number {
    const kandidatBaris = baris.filter((item) => {
      if (!/\btotal\b/.test(item.lower)) {
        return false;
      }

      if (item.lower.includes('grand total')) {
        return false;
      }

      if (this.apakahBarisBukanTotalFinal(item.lower)) {
        return false;
      }

      return true;
    });

    for (let i = kandidatBaris.length - 1; i >= 0; i--) {
      const barisLabel = kandidatBaris[i];

      const nominalSatuBaris = this.ambilNominalDariBarisLabel(barisLabel);

      if (nominalSatuBaris > 0) {
        return nominalSatuBaris;
      }

      const nominalDekat = this.ambilNominalDariBarisTerdekat(
        baris,
        barisLabel,
      );

      if (nominalDekat > 0) {
        return nominalDekat;
      }
    }

    return 0;
  }

  private ambilNominalDariBarisLabel(barisLabel: BarisOcr): number {
    const semuaNominal = this.ambilSemuaNominalDenganPosisi(barisLabel.teks);

    if (semuaNominal.length === 0) {
      return 0;
    }

    if (barisLabel.lower.includes('grand total')) {
      return this.pilihNominalGrandTotalDariDaftar(
        semuaNominal.map((item) => item.nilai),
      );
    }

    const indexLabel = this.ambilIndexLabelDalamBaris(barisLabel.lower);

    if (indexLabel === -1) {
      return semuaNominal[0].nilai;
    }

    const nominalSetelahLabel = semuaNominal.filter(
      (nominal) => nominal.index >= indexLabel,
    );

    if (nominalSetelahLabel.length > 0) {
      return nominalSetelahLabel[0].nilai;
    }

    return semuaNominal[0].nilai;
  }

  private ambilIndexLabelDalamBaris(lower: string): number {
    const daftarLabel = [
      'grand total',
      'grandtotal',
      'g total',
      'g.total',
      'total amount',
      'amount due',
      'balance due',
      'total paid',
      'total payment',
      'total payable',
      'total bayar',
      'jumlah bayar',
      'total pembayaran',
      'jumlah pembayaran',
      'total tagihan',
      'jumlah tagihan',
      'total belanja',
      'net total',
      'nett total',
      'net amount',
      'total',
      'jumlah',
      'tagihan',
    ];

    for (const label of daftarLabel) {
      const index = lower.indexOf(label);

      if (index !== -1) {
        return index + label.length;
      }
    }

    return -1;
  }

  private ambilNominalDariBarisTerdekat(
    semuaBaris: BarisOcr[],
    barisLabel: BarisOcr,
  ): number {
    const indexBaris = semuaBaris.findIndex(
      (item) => item.top === barisLabel.top && item.teks === barisLabel.teks,
    );

    if (indexBaris === -1) {
      return 0;
    }

    const kandidat: {
      nilai: number;
      jarak: number;
      prioritas: number;
    }[] = [];

    for (let offset = 1; offset <= 4; offset++) {
      const barisBawah = semuaBaris[indexBaris + offset];

      if (!barisBawah) {
        continue;
      }

      if (this.apakahBarisPembayaranAtauInfo(barisBawah.lower)) {
        break;
      }

      const nominal = this.ambilSemuaNominalDenganPosisi(barisBawah.teks);

      for (const item of nominal) {
        kandidat.push({
          nilai: item.nilai,
          jarak: offset,
          prioritas: this.hitungPrioritasNominal(barisBawah.lower),
        });
      }
    }

    if (kandidat.length === 0) {
      return 0;
    }

    kandidat.sort((a, b) => {
      if (b.prioritas !== a.prioritas) {
        return b.prioritas - a.prioritas;
      }

      if (a.jarak !== b.jarak) {
        return a.jarak - b.jarak;
      }

      return b.nilai - a.nilai;
    });

    return kandidat[0].nilai;
  }

  private hitungPrioritasNominal(lower: string): number {
    if (lower.includes('grand total')) return 100;
    if (/\btotal\b/.test(lower)) return 90;
    if (lower.includes('jumlah')) return 80;
    if (lower.includes('tagihan')) return 80;

    return 50;
  }

  private apakahBarisBukanTotalFinal(lower: string): boolean {
    const kataBukanFinal = [
      'subtotal',
      'sub total',
      'harga jual',
      'total harga',
      'total price item',
      'total produk',
      'total item',
      'total qty',
      'total quantity',
      'total sementara',
      'diskon total',
      'total diskon',
      'tax total',
      'pajak total',
      'ppn total',
      'total pajak',
      'total ppn',
      'total discount',
      'total disc',
    ];

    if (kataBukanFinal.some((kata) => lower.includes(kata))) {
      return true;
    }

    const setelahTotal = lower.includes('total')
      ? lower.slice(lower.indexOf('total') + 'total'.length).trim()
      : '';

    const kataSetelahTotalBukanFinal = [
      'harga',
      'jual',
      'produk',
      'item',
      'qty',
      'quantity',
      'sementara',
      'diskon',
      'discount',
      'pajak',
      'tax',
      'ppn',
    ];

    if (
      setelahTotal &&
      kataSetelahTotalBukanFinal.some((kata) => setelahTotal.startsWith(kata))
    ) {
      return true;
    }

    return false;
  }

  private apakahBarisPembayaranAtauInfo(lower: string): boolean {
    const kata = [
      'tunai',
      'cash',
      'uang',
      'bayar',
      'kembali',
      'change',
      'kembalian',
      'received',
      'anda hemat',
      'hemat',
      'call',
      'sms',
      'email',
      'www',
      'http',
      'promo',
      'terima kasih',
      'thank you',
      'layanan',
      'kontak',
      'customer',
      'telp',
      'telepon',
      'phone',
      'wa',
      'whatsapp',
      'npwp',
    ];

    return kata.some((item) => lower.includes(item));
  }

  private pilihNominalGrandTotalDariDaftar(daftarNominal: number[]): number {
    if (daftarNominal.length === 0) {
      return 0;
    }

    const unikNominal = Array.from(new Set(daftarNominal)).sort(
      (a, b) => b - a,
    );

    if (unikNominal.length === 1) {
      return unikNominal[0];
    }

    const angkaTerbesar = unikNominal[0];

    for (let i = 1; i < unikNominal.length; i++) {
      const kandidatTotal = unikNominal[i];
      const selisih = angkaTerbesar - kandidatTotal;

      const adaKembalian = unikNominal.some(
        (angka) => Math.abs(angka - selisih) <= 100,
      );

      if (adaKembalian && kandidatTotal > 0) {
        return kandidatTotal;
      }
    }

    return angkaTerbesar;
  }

  private ambilNominalDariTeksFallback(teks: string): number {
    if (!teks) return 0;

    const teksSatuBaris = this.bersihkanSpasi(teks);

    const nominalPertamina = this.ambilNominalPertamina(teksSatuBaris);

    if (nominalPertamina > 0) {
      return nominalPertamina;
    }

    const grandTotal = this.ambilNominalGrandTotalFallback(teksSatuBaris);

    if (grandTotal > 0) {
      return grandTotal;
    }

    const labelFinalKuat = this.ambilNominalDariLabelFallback(teksSatuBaris, [
      'total amount',
      'amount due',
      'balance due',
      'total paid',
      'total payment',
      'total payable',
      'total bayar',
      'jumlah bayar',
      'total pembayaran',
      'jumlah pembayaran',
      'total tagihan',
      'jumlah tagihan',
      'total belanja',
      'net total',
      'nett total',
      'net amount',
    ]);

    if (labelFinalKuat > 0) {
      return labelFinalKuat;
    }

    const totalBiasa = this.ambilNominalTotalFinalBiasaFallback(teksSatuBaris);

    if (totalBiasa > 0) {
      return totalBiasa;
    }

    const jumlahAtauTagihan = this.ambilNominalDariLabelFallback(
      teksSatuBaris,
      ['jumlah', 'tagihan'],
    );

    if (jumlahAtauTagihan > 0) {
      return jumlahAtauTagihan;
    }

    const baris = teks
      .split(/\r?\n/)
      .map((item) => item.trim())
      .filter(Boolean);

    return this.ambilNominalTerbesarYangMasukAkal(baris);
  }

  // <--- aturan khusus nota Pertamina / SPBU --->
  private ambilNominalPertamina(teks: string): number {
    if (!teks) {
      return 0;
    }

    const teksSatuBaris = this.bersihkanSpasi(teks);
    const lower = teksSatuBaris.toLowerCase();

    const apakahNotaPertamina =
      lower.includes('pertamina') ||
      lower.includes('spbu') ||
      lower.includes('pulau/pompa') ||
      lower.includes('pulau pompa') ||
      lower.includes('pompa') ||
      lower.includes('pertamax') ||
      lower.includes('pertalite') ||
      lower.includes('solar') ||
      lower.includes('dexlite');

    if (!apakahNotaPertamina) {
      return 0;
    }

    /*
     * Pola yang sering muncul di nota SPBU:
     * TOTAL : Rp 250,00
     * TUNAI : Rp 300,00
     * KEMBALI : Rp 50,00
     *
     * Atau OCR menjadi:
     * TUNAI : Rp 250,00 Rp 300,00 : Rp 50,00
     *
     * Untuk kebutuhan sistem ini, nominal transaksi yang benar adalah:
     * - angka setelah TOTAL jika ada,
     * - jika tidak ada, angka pertama setelah TUNAI.
     */

    const nominalTotalBlok = this.ambilNominalPertaminaSetelahLabel(
      teksSatuBaris,
      ['total'],
    );

    if (nominalTotalBlok > 0) {
      return nominalTotalBlok;
    }

    const nominalTunai = this.ambilNominalPertaminaSetelahLabel(teksSatuBaris, [
      'tunai kembali',
      'tunai',
    ]);

    if (nominalTunai > 0) {
      return nominalTunai;
    }

    return 0;
  }
  // <--- end --->

  private ambilNominalPertaminaSetelahLabel(
    teks: string,
    daftarLabel: string[],
  ): number {
    const lower = teks.toLowerCase();

    for (const label of daftarLabel) {
      const posisiLabel = lower.lastIndexOf(label);

      if (posisiLabel === -1) {
        continue;
      }

      const potongan = teks.slice(posisiLabel + label.length);
      const potonganAman = this.potongSebelumKataKeras(potongan);
      const daftarNominal = this.ambilSemuaNominalPertamina(potonganAman);

      const nominalTransaksi = daftarNominal.find((nominal) => {
        return nominal.nilai >= 10000 && nominal.nilai <= 5000000;
      });

      if (nominalTransaksi) {
        return nominalTransaksi.nilai;
      }
    }

    return 0;
  }

  private ambilSemuaNominalPertamina(teks: string): TokenNominal[] {
    const regex =
      /(?:rp|idr)?\s*([0-9]{1,3}(?:\s*[.,]\s*[0-9]{2,3})+|[0-9]{4,})(?:\s*,\s*\d{2})?/gi;

    const hasil: TokenNominal[] = [];

    let cocok: RegExpExecArray | null;

    while ((cocok = regex.exec(teks)) !== null) {
      const teksNominal = cocok[0];
      const nilai = this.normalisasiNominalPertamina(teksNominal);

      if (nilai >= 1000 && nilai <= 100000000) {
        hasil.push({
          teks: teksNominal,
          nilai,
          index: cocok.index,
        });
      }
    }

    return hasil;
  }

  private normalisasiNominalPertamina(nilai: string): number {
    if (!nilai) {
      return 0;
    }

    let teks = nilai
      .toLowerCase()
      .replace(/rp/g, '')
      .replace(/idr/g, '')
      .replace(/[^\d.,]/g, '')
      .trim();

    if (!teks) {
      return 0;
    }

    teks = teks.replace(/\s+/g, '');

    /*
     * Khusus OCR SPBU:
     * Rp 250,00 berarti Rp 250.000
     * Rp 300,00 berarti Rp 300.000
     * Rp 50,00 berarti Rp 50.000
     */
    if (teks.includes(',') && !teks.includes('.')) {
      const bagian = teks.split(',');
      const depan = bagian[0];
      const belakang = bagian[1] || '';

      if (belakang.length === 2 && depan.length <= 3) {
        const angkaRibuan = Number(depan) * 1000;

        return Number.isFinite(angkaRibuan) ? angkaRibuan : 0;
      }
    }

    return this.normalisasiNominal(nilai);
  }

  private ambilNominalGrandTotalFallback(teks: string): number {
    const lower = teks.toLowerCase();
    const posisiGrandTotal = lower.lastIndexOf('grand total');

    if (posisiGrandTotal === -1) {
      return 0;
    }

    let potongan = teks.slice(posisiGrandTotal + 'grand total'.length);
    potongan = this.potongSebelumKataKeras(potongan);

    const daftarNominal = this.ambilSemuaNominalDenganPosisi(potongan).map(
      (item) => item.nilai,
    );

    return this.pilihNominalGrandTotalDariDaftar(daftarNominal);
  }

  private ambilNominalDariLabelFallback(
    teks: string,
    daftarLabel: string[],
  ): number {
    const lower = teks.toLowerCase();

    for (const label of daftarLabel) {
      const daftarPosisi = this.cariSemuaPosisiLabel(lower, label);

      for (let i = daftarPosisi.length - 1; i >= 0; i--) {
        const posisiLabel = daftarPosisi[i];

        if (this.apakahLabelIniBukanTotalFinal(lower, posisiLabel, label)) {
          continue;
        }

        const nominal = this.ambilNominalSetelahLabelFallback(
          teks,
          posisiLabel + label.length,
        );

        if (nominal > 0) {
          return nominal;
        }
      }
    }

    return 0;
  }

  private ambilNominalTotalFinalBiasaFallback(teks: string): number {
    const lower = teks.toLowerCase();
    const daftarPosisi = this.cariSemuaPosisiLabel(lower, 'total');

    for (let i = daftarPosisi.length - 1; i >= 0; i--) {
      const posisiTotal = daftarPosisi[i];

      if (this.apakahLabelIniBukanTotalFinal(lower, posisiTotal, 'total')) {
        continue;
      }

      const nominal = this.ambilNominalSetelahLabelFallback(
        teks,
        posisiTotal + 'total'.length,
      );

      if (nominal > 0) {
        return nominal;
      }
    }

    return 0;
  }

  private ambilNominalSetelahLabelFallback(
    teks: string,
    posisiMulai: number,
  ): number {
    let potongan = teks.slice(posisiMulai);
    potongan = this.potongSebelumKataKeras(potongan);

    const semuaNominal = this.ambilSemuaNominalDenganPosisi(potongan);

    if (semuaNominal.length === 0) {
      return 0;
    }

    return semuaNominal[0].nilai;
  }

  private cariSemuaPosisiLabel(teksLower: string, label: string): number[] {
    const posisi: number[] = [];
    let posisiCari = 0;

    while (true) {
      const index = teksLower.indexOf(label, posisiCari);

      if (index === -1) {
        break;
      }

      posisi.push(index);
      posisiCari = index + label.length;
    }

    return posisi;
  }

  private apakahLabelIniBukanTotalFinal(
    teksLower: string,
    posisiLabel: number,
    label: string,
  ): boolean {
    const sebelum = teksLower.slice(Math.max(0, posisiLabel - 18), posisiLabel);
    const sesudah = teksLower.slice(posisiLabel + label.length).trim();

    const gabunganDekat = `${sebelum} ${label} ${sesudah.slice(0, 25)}`;

    const kataBukanFinal = [
      'subtotal',
      'sub total',
      'harga jual',
      'total harga',
      'total price item',
      'total produk',
      'total item',
      'total qty',
      'total quantity',
      'total sementara',
      'diskon total',
      'total diskon',
      'tax total',
      'pajak total',
      'ppn total',
      'total pajak',
      'total ppn',
      'total discount',
      'total disc',
    ];

    if (kataBukanFinal.some((kata) => gabunganDekat.includes(kata))) {
      return true;
    }

    const sesudahLangsungBukanFinal = [
      'harga',
      'jual',
      'produk',
      'item',
      'qty',
      'quantity',
      'sementara',
      'diskon',
      'discount',
      'pajak',
      'tax',
      'ppn',
    ];

    if (sesudahLangsungBukanFinal.some((kata) => sesudah.startsWith(kata))) {
      return true;
    }

    return false;
  }

  private potongSebelumKataKeras(teks: string): string {
    const batasKeras = [
      'call',
      'sms',
      'email',
      'www',
      'http',
      'promo',
      'layanan',
      'kontak',
      'customer',
      'telp',
      'telepon',
      'phone',
      'wa',
      'whatsapp',
      'terima kasih',
      'thank you',
      'npwp',
      'contact',
      'center',
    ];

    let potongan = teks;

    for (const batas of batasKeras) {
      const posisiBatas = potongan.toLowerCase().indexOf(batas);

      if (posisiBatas !== -1) {
        potongan = potongan.slice(0, posisiBatas);
      }
    }

    return potongan;
  }

  private ambilNominalTerbesarYangMasukAkal(baris: string[]): number {
    const daftarNominal: number[] = [];

    for (const item of baris) {
      const lower = item.toLowerCase();

      if (this.apakahBarisHarusDiabaikanUntukFallback(lower)) {
        continue;
      }

      const nominal = this.ambilSemuaNominalDenganPosisi(item);

      daftarNominal.push(...nominal.map((data) => data.nilai));
    }

    if (daftarNominal.length === 0) {
      return 0;
    }

    return Math.max(...daftarNominal);
  }

  private apakahBarisHarusDiabaikanUntukFallback(lower: string): boolean {
    const kataAbaikan = [
      'subtotal',
      'sub total',
      'harga jual',
      'total harga',
      'ppn',
      'pajak',
      'tax',
      'diskon',
      'discount',
      'disc',
      'cash',
      'tunai',
      'uang bayar',
      'bayar tunai',
      'kembali',
      'change',
      'balance',
      'kembalian',
      'received',
      'payment method',
      'call',
      'sms',
      'wa',
      'whatsapp',
      'telp',
      'telepon',
      'phone',
      'email',
      'www',
      'http',
      'promo',
      'kontak',
      'layanan konsumen',
      'npwp',
      'struk',
      'receipt',
      'invoice',
      'no nota',
      'no trans',
      'no transaksi',
    ];

    const kemungkinanTanggal =
      lower.includes('tanggal') ||
      lower.includes('date') ||
      lower.includes('tgl') ||
      /\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b/.test(lower);

    if (kemungkinanTanggal) {
      return true;
    }

    const kemungkinanJam =
      /\b\d{1,2}[:.]\d{2}\b/.test(lower) ||
      /\b\d{1,2}[.]\d{2}[.]\d{2}\b/.test(lower);

    if (kemungkinanJam) {
      return true;
    }

    const adaKataAbaikan = kataAbaikan.some((kata) => lower.includes(kata));

    if (adaKataAbaikan) {
      return true;
    }

    const angkaBersih = lower.replace(/\D/g, '');

    const kemungkinanNomorTelepon =
      angkaBersih.length >= 8 &&
      !lower.includes('total') &&
      !lower.includes('jumlah') &&
      !lower.includes('tagihan') &&
      !lower.includes('amount') &&
      !lower.includes('due');

    if (kemungkinanNomorTelepon) {
      return true;
    }

    return false;
  }

  private ambilSemuaNominalDenganPosisi(teks: string): TokenNominal[] {
    const regex =
      /(?:rp|idr)?\s*([0-9]{1,3}(?:\s*[.,]\s*[0-9]{3})+|[0-9]{4,})(?:\s*,\s*\d{2})?/gi;

    const hasil: TokenNominal[] = [];

    let cocok: RegExpExecArray | null;

    while ((cocok = regex.exec(teks)) !== null) {
      const teksNominal = cocok[0];
      const nilai = this.normalisasiNominal(teksNominal);

      if (nilai >= 1000 && nilai <= 100000000) {
        hasil.push({
          teks: teksNominal,
          nilai,
          index: cocok.index,
        });
      }
    }

    return hasil;
  }

  private normalisasiNominal(nilai: string): number {
    if (!nilai) {
      return 0;
    }

    let teks = nilai
      .toLowerCase()
      .replace(/rp/g, '')
      .replace(/idr/g, '')
      .replace(/[^\d.,]/g, '')
      .trim();

    if (!teks) {
      return 0;
    }

    teks = teks.replace(/\s+/g, '');

    if (teks.includes('.') && teks.includes(',')) {
      teks = teks.replace(/\./g, '').replace(',', '.');

      const hasil = Number(teks);

      return Number.isFinite(hasil) ? Math.round(hasil) : 0;
    }

    if (teks.includes('.') && !teks.includes(',')) {
      const bagian = teks.split('.');
      const bagianTerakhir = bagian[bagian.length - 1];

      if (bagianTerakhir.length === 3) {
        teks = teks.replace(/\./g, '');
      }

      const hasil = Number(teks);

      return Number.isFinite(hasil) ? Math.round(hasil) : 0;
    }

    if (teks.includes(',') && !teks.includes('.')) {
      const bagian = teks.split(',');
      const bagianTerakhir = bagian[bagian.length - 1];

      if (bagianTerakhir.length === 3) {
        teks = teks.replace(/,/g, '');
      } else {
        teks = teks.replace(',', '.');
      }

      const hasil = Number(teks);

      return Number.isFinite(hasil) ? Math.round(hasil) : 0;
    }

    const hasil = Number(teks);

    return Number.isFinite(hasil) ? Math.round(hasil) : 0;
  }
}