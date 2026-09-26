// ==================================================
// FILE: backend/src/tiket/billing/tiket-billing.service.ts
// FUNGSI: Simpan histori rekap Billing (per bulan/tahun) + hitung
// rekonsiliasi Rekapan (Sub Total - PPN - PPH23 dibandingkan Grand
// Total tagihan vendor)
// ==================================================

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { mkdirSync, unlinkSync, writeFileSync, existsSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { join, normalize } from 'node:path';
import { PrismaService } from '../../prisma/prisma.service';
import {
  BuatTiketBillingDto,
  HitungRekapDto,
  UbahTiketBillingDto,
} from './dto/tiket-billing.dto';
import { TiketBillingRekapService } from './tiket-billing-rekap.service';

const TIKET_BILLING_INCLUDE = {
  pembuat: { select: { id: true, name: true } },
  penghitung: { select: { id: true, name: true } },
} satisfies Prisma.TiketBillingInclude;

const DIR_UPLOAD = join(process.cwd(), 'uploads', 'tiket-billing');

@Injectable()
export class TiketBillingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rekap: TiketBillingRekapService,
  ) {}

  private parseBulanTahun(dto: {
    bulan: string;
    tahun: string;
  }): { bulan: number; tahun: number } {
    const bulan = Number(dto.bulan);
    const tahun = Number(dto.tahun);

    if (!Number.isInteger(bulan) || bulan < 1 || bulan > 12) {
      throw new BadRequestException('Bulan tidak valid (1-12)');
    }

    if (!Number.isInteger(tahun) || tahun < 2000 || tahun > 2100) {
      throw new BadRequestException('Tahun tidak valid');
    }

    return { bulan, tahun };
  }

  async buat(
    dto: BuatTiketBillingDto,
    zipBuffer: Buffer,
    namaFileZip: string,
    aktorId: number,
  ) {
    const { bulan, tahun } = this.parseBulanTahun(dto);
    const hasil = await this.rekap.generate(zipBuffer);

    mkdirSync(DIR_UPLOAD, { recursive: true });

    const namaFilePdf = `billing-${Date.now()}-${randomUUID()}.pdf`;
    const pathAbsolut = join(DIR_UPLOAD, namaFilePdf);

    try {
      writeFileSync(pathAbsolut, hasil.pdf);

      return await this.prisma.tiketBilling.create({
        data: {
          namaRekapan: dto.namaRekapan.trim(),
          bulan,
          tahun,
          namaFileZip,
          jumlahInvoice: hasil.jumlahInvoice,
          subTotal: hasil.subTotal,
          filePdf: `/uploads/tiket-billing/${namaFilePdf}`,
          createdBy: aktorId,
        },
        include: TIKET_BILLING_INCLUDE,
      });
    } catch (error) {
      if (existsSync(pathAbsolut)) {
        unlinkSync(pathAbsolut);
      }
      throw error;
    }
  }

  async daftar(filter: { bulan?: number; tahun?: number }) {
    return this.prisma.tiketBilling.findMany({
      where: {
        ...(filter.bulan ? { bulan: filter.bulan } : {}),
        ...(filter.tahun ? { tahun: filter.tahun } : {}),
      },
      include: TIKET_BILLING_INCLUDE,
      orderBy: [{ tahun: 'desc' }, { bulan: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async detail(id: number) {
    const billing = await this.prisma.tiketBilling.findUnique({
      where: { id },
      include: TIKET_BILLING_INCLUDE,
    });

    if (!billing) {
      throw new NotFoundException('Rekap Billing tidak ditemukan');
    }

    return billing;
  }

  /**
   * Hitung rekonsiliasi: Sub Total (otomatis, dijumlah dari Grand Total
   * tiap invoice - JADI SUDAH TERMASUK PPN masing-masing tiket) dikurangi
   * PPH23 yang diinput admin, lalu dibandingkan dengan Grand Total dari
   * tagihan resmi vendor. PPN TIDAK dikurangi lagi di sini - sudah
   * "nempel" di Sub Total, dikurangi lagi = dobel hitung. PPN tetap
   * disimpan buat referensi/cocokkan dengan breakdown internal saja.
   * Divalidasi dengan data asli: Sub Total 243.545.987 - PPH23 49.560 =
   * 243.496.427, persis sama dengan SUBTOTAL final di rekap Excel.
   */
  async hitungRekap(id: number, dto: HitungRekapDto, aktorId: number) {
    const billing = await this.detail(id);
    const grandTotalHitung = billing.subTotal - dto.pph23;

    return this.prisma.tiketBilling.update({
      where: { id },
      data: {
        ppn: dto.ppn,
        pph23: dto.pph23,
        grandTotalVendor: dto.grandTotalVendor,
        grandTotalHitung,
        dihitungOlehId: aktorId,
        dihitungPada: new Date(),
      },
      include: TIKET_BILLING_INCLUDE,
    });
  }

  /** Edit metadata (nama/bulan/tahun) - tidak mengulang proses ZIP/PDF/Sub Total. */
  async ubah(id: number, dto: UbahTiketBillingDto) {
    await this.detail(id);

    let bulan: number | undefined;
    let tahun: number | undefined;

    if (dto.bulan !== undefined || dto.tahun !== undefined) {
      const existing = await this.detail(id);
      const parsed = this.parseBulanTahun({
        bulan: dto.bulan ?? String(existing.bulan),
        tahun: dto.tahun ?? String(existing.tahun),
      });

      bulan = dto.bulan !== undefined ? parsed.bulan : undefined;
      tahun = dto.tahun !== undefined ? parsed.tahun : undefined;
    }

    return this.prisma.tiketBilling.update({
      where: { id },
      data: {
        ...(dto.namaRekapan !== undefined
          ? { namaRekapan: dto.namaRekapan.trim() }
          : {}),
        ...(bulan !== undefined ? { bulan } : {}),
        ...(tahun !== undefined ? { tahun } : {}),
      },
      include: TIKET_BILLING_INCLUDE,
    });
  }

  async hapus(id: number) {
    const billing = await this.detail(id);

    await this.prisma.tiketBilling.delete({ where: { id } });
    this.hapusFilePdf(billing.filePdf);

    return { message: `Rekap "${billing.namaRekapan}" berhasil dihapus` };
  }

  /** Hapus file PDF fisik, dibatasi ke folder uploads/tiket-billing saja. */
  private hapusFilePdf(filePdf: string): void {
    const relatif = filePdf.replace(/^\/+/, '');

    if (!relatif.startsWith('uploads/tiket-billing/')) {
      return;
    }

    const absolut = normalize(join(process.cwd(), relatif));

    if (!absolut.startsWith(normalize(DIR_UPLOAD))) {
      return;
    }

    if (existsSync(absolut)) {
      unlinkSync(absolut);
    }
  }
}
