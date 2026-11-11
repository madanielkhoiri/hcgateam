// ==================================================
// FILE: backend/src/kwh/kwh.service.ts
// FUNGSI: Perhitungan KWH - pencatatan stand meter bulanan.
// Pemakaian bulan berjalan = stand bulan ini - stand bulan lalu (meter yang sama).
// Jadwal pencatatan: tanggal 1 setiap bulan, di atas pukul 10.00 WITA
// (di luar itu tetap boleh disimpan, hanya ditandai tepatWaktu = false).
// ==================================================

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogService } from '../audit/audit-log.service';
import { BuatPencatatanKwhDto, UbahPencatatanKwhDto } from './dto/kwh.dto';

const WITA_OFFSET_MS = 8 * 60 * 60 * 1000;

export type AktorKwh = { id: number; username?: string; nama?: string; nrp?: string };

/** Pecah waktu ke komponen WITA (tahun, bulan 1-12, tanggal, jam). */
function komponenWita(waktu: Date) {
  const wita = new Date(waktu.getTime() + WITA_OFFSET_MS);
  return {
    tahun: wita.getUTCFullYear(),
    bulan: wita.getUTCMonth() + 1,
    tanggal: wita.getUTCDate(),
    jam: wita.getUTCHours(),
  };
}

const skor = (tahun: number, bulan: number) => tahun * 12 + (bulan - 1);

type Baris = { id: number; meterId: number; tahun: number; bulan: number; stand: number };

/** Map `meterId:skor` ke stand meter. */
function petaStand(baris: Baris[]) {
  const peta = new Map<string, number>();
  for (const b of baris) peta.set(`${b.meterId}:${skor(b.tahun, b.bulan)}`, b.stand);
  return peta;
}

function pemakaianDari(peta: Map<string, number>, meterId: number, tahun: number, bulan: number): number | null {
  const sekarang = peta.get(`${meterId}:${skor(tahun, bulan)}`);
  const lalu = peta.get(`${meterId}:${skor(tahun, bulan) - 1}`);
  if (sekarang === undefined || lalu === undefined) return null;
  return Math.round((sekarang - lalu) * 100) / 100;
}

const bulatDua = (n: number) => Math.round(n * 100) / 100;

@Injectable()
export class KwhService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogService,
  ) {}

  private async semuaBaris(): Promise<Baris[]> {
    const data = await this.prisma.kwhPencatatan.findMany({
      select: { id: true, meterId: true, tahun: true, bulan: true, standMeter: true },
    });
    return data.map((d) => ({
      id: d.id,
      meterId: d.meterId,
      tahun: d.tahun,
      bulan: d.bulan,
      stand: Number(d.standMeter),
    }));
  }

  // ---------- Meter ----------

  daftarMeter() {
    return this.prisma.kwhMeter.findMany({ where: { aktif: true }, orderBy: { nama: 'asc' } });
  }

  // ---------- Pencatatan ----------

  async daftarPencatatan(filter: { tahun?: number; meterId?: number }) {
    const [rows, semua] = await Promise.all([
      this.prisma.kwhPencatatan.findMany({
        where: {
          ...(filter.tahun ? { tahun: filter.tahun } : {}),
          ...(filter.meterId ? { meterId: filter.meterId } : {}),
        },
        include: {
          meter: { select: { id: true, nama: true, lokasi: true } },
          pencatat: { select: { id: true, name: true } },
        },
        orderBy: [{ tahun: 'desc' }, { bulan: 'desc' }, { meterId: 'asc' }],
      }),
      this.semuaBaris(),
    ]);
    const peta = petaStand(semua);

    return rows.map((r) => ({
      id: r.id,
      meterId: r.meterId,
      meter: r.meter,
      tahun: r.tahun,
      bulan: r.bulan,
      standMeter: Number(r.standMeter),
      standBulanLalu: peta.get(`${r.meterId}:${skor(r.tahun, r.bulan) - 1}`) ?? null,
      pemakaian: pemakaianDari(peta, r.meterId, r.tahun, r.bulan),
      tanggalCatat: r.tanggalCatat,
      tepatWaktu: r.tepatWaktu,
      catatan: r.catatan,
      pencatat: r.pencatat,
    }));
  }

  private tentukanWaktu(tanggalCatat?: string) {
    const waktu = tanggalCatat ? new Date(tanggalCatat) : new Date();
    if (Number.isNaN(waktu.getTime())) throw new BadRequestException('Tanggal pencatatan tidak valid');
    const k = komponenWita(waktu);
    return { waktu, tahun: k.tahun, bulan: k.bulan, tepatWaktu: k.tanggal === 1 && k.jam >= 10 };
  }

  /** Stand tidak boleh lebih kecil dari pencatatan sebelumnya, dan tidak boleh lebih besar dari berikutnya. */
  private async validasiUrutan(meterId: number, tahun: number, bulan: number, stand: number, abaikanId?: number) {
    const bukanIni = abaikanId ? { id: { not: abaikanId } } : {};
    const [lalu, depan] = await Promise.all([
      this.prisma.kwhPencatatan.findFirst({
        where: { meterId, ...bukanIni, OR: [{ tahun, bulan: { lt: bulan } }, { tahun: { lt: tahun } }] },
        orderBy: [{ tahun: 'desc' }, { bulan: 'desc' }],
      }),
      this.prisma.kwhPencatatan.findFirst({
        where: { meterId, ...bukanIni, OR: [{ tahun, bulan: { gt: bulan } }, { tahun: { gt: tahun } }] },
        orderBy: [{ tahun: 'asc' }, { bulan: 'asc' }],
      }),
    ]);
    if (lalu && stand < Number(lalu.standMeter)) {
      throw new BadRequestException(
        `Stand meter (${stand}) lebih kecil dari pencatatan sebelumnya (${Number(lalu.standMeter)}). Periksa kembali angka meter.`,
      );
    }
    if (depan && stand > Number(depan.standMeter)) {
      throw new BadRequestException(
        `Stand meter (${stand}) lebih besar dari pencatatan bulan berikutnya (${Number(depan.standMeter)}). Periksa kembali angka meter.`,
      );
    }
  }

  /**
   * Bila stand bulan lalu dikirim dan bulan lalu belum pernah dicatat untuk meter ini,
   * simpan sebagai pencatatan bulan lalu supaya pemakaian bulan ini bisa dihitung.
   * Jika bulan lalu sudah tercatat, angka yang tersimpan dipakai (tidak ditimpa dari sini).
   */
  private async catatStandBulanLalu(
    meterId: number,
    tahun: number,
    bulan: number,
    standIni: number,
    standLalu: number | undefined,
    aktor: AktorKwh,
    abaikanId?: number,
  ) {
    if (standLalu === undefined || standLalu === null) return;

    const tahunLalu = bulan === 1 ? tahun - 1 : tahun;
    const bulanLalu = bulan === 1 ? 12 : bulan - 1;

    const sudahAda = await this.prisma.kwhPencatatan.findFirst({
      where: { meterId, tahun: tahunLalu, bulan: bulanLalu, ...(abaikanId ? { id: { not: abaikanId } } : {}) },
      select: { id: true },
    });
    if (sudahAda) return;

    if (standLalu > standIni) {
      throw new BadRequestException(
        `Stand bulan lalu (${standLalu}) tidak boleh lebih besar dari stand bulan ini (${standIni}).`,
      );
    }
    await this.validasiUrutan(meterId, tahunLalu, bulanLalu, standLalu);

    // 10.00 WITA tanggal 1 bulan lalu = 02.00 UTC
    const waktuLalu = new Date(Date.UTC(tahunLalu, bulanLalu - 1, 1, 2, 0, 0));
    const dibuat = await this.prisma.kwhPencatatan.create({
      data: {
        meterId,
        tahun: tahunLalu,
        bulan: bulanLalu,
        standMeter: standLalu,
        tanggalCatat: waktuLalu,
        tepatWaktu: false,
        catatan: 'Stand bulan lalu (diinput bersama pencatatan bulan berikutnya)',
        dicatatOleh: aktor.id,
      },
    });
    await this.auditLog.catat({
      actorId: aktor.id,
      actorUsername: aktor.username,
      actorName: aktor.nama,
      actorNrp: aktor.nrp,
      aksi: 'KWH_DICATAT',
      entitas: 'KwhPencatatan',
      entitasId: dibuat.id,
      detail: { meterId, tahun: tahunLalu, bulan: bulanLalu, standMeter: standLalu, dariFormBulanBerikutnya: true },
    });
  }

  async buat(dto: BuatPencatatanKwhDto, aktor: AktorKwh) {
    let meterId = dto.meterId;
    const namaBaru = dto.namaMeterBaru?.trim();

    if (!meterId) {
      if (!namaBaru) throw new BadRequestException('Pilih meter atau isi nama meter baru');
      const meter = await this.prisma.kwhMeter.upsert({
        where: { nama: namaBaru },
        update: { aktif: true },
        create: { nama: namaBaru, lokasi: dto.lokasiMeterBaru?.trim() || null },
      });
      meterId = meter.id;
    } else {
      const meter = await this.prisma.kwhMeter.findUnique({ where: { id: meterId } });
      if (!meter) throw new NotFoundException('Meter tidak ditemukan');
    }

    const { waktu, tahun, bulan, tepatWaktu } = this.tentukanWaktu(dto.tanggalCatat);
    await this.validasiUrutan(meterId, tahun, bulan, dto.standMeter);
    await this.catatStandBulanLalu(meterId, tahun, bulan, dto.standMeter, dto.standBulanLalu, aktor);

    try {
      const dibuat = await this.prisma.kwhPencatatan.create({
        data: {
          meterId,
          tahun,
          bulan,
          standMeter: dto.standMeter,
          tanggalCatat: waktu,
          tepatWaktu,
          catatan: dto.catatan?.trim() || null,
          dicatatOleh: aktor.id,
        },
      });
      await this.auditLog.catat({
        actorId: aktor.id,
        actorUsername: aktor.username,
        actorName: aktor.nama,
        actorNrp: aktor.nrp,
        aksi: 'KWH_DICATAT',
        entitas: 'KwhPencatatan',
        entitasId: dibuat.id,
        detail: { meterId, tahun, bulan, standMeter: dto.standMeter, tepatWaktu },
      });
      return dibuat;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new BadRequestException('Meter ini sudah dicatat untuk bulan tersebut. Gunakan Edit untuk mengubahnya.');
      }
      throw error;
    }
  }

  async ubah(id: number, dto: UbahPencatatanKwhDto, aktor: AktorKwh) {
    const ada = await this.prisma.kwhPencatatan.findUnique({ where: { id } });
    if (!ada) throw new NotFoundException('Pencatatan KWH tidak ditemukan');

    const { waktu, tahun, bulan, tepatWaktu } = dto.tanggalCatat
      ? this.tentukanWaktu(dto.tanggalCatat)
      : { waktu: ada.tanggalCatat, tahun: ada.tahun, bulan: ada.bulan, tepatWaktu: ada.tepatWaktu };

    await this.validasiUrutan(ada.meterId, tahun, bulan, dto.standMeter, id);
    await this.catatStandBulanLalu(ada.meterId, tahun, bulan, dto.standMeter, dto.standBulanLalu, aktor, id);

    try {
      const diubah = await this.prisma.kwhPencatatan.update({
        where: { id },
        data: {
          tahun,
          bulan,
          standMeter: dto.standMeter,
          tanggalCatat: waktu,
          tepatWaktu,
          catatan: dto.catatan?.trim() || null,
        },
      });
      await this.auditLog.catat({
        actorId: aktor.id,
        actorUsername: aktor.username,
        actorName: aktor.nama,
        actorNrp: aktor.nrp,
        aksi: 'KWH_DIUBAH',
        entitas: 'KwhPencatatan',
        entitasId: id,
        detail: { standLama: Number(ada.standMeter), standBaru: dto.standMeter },
      });
      return diubah;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new BadRequestException('Meter ini sudah dicatat untuk bulan tersebut');
      }
      throw error;
    }
  }

  async hapus(id: number, aktor: AktorKwh) {
    const ada = await this.prisma.kwhPencatatan.findUnique({ where: { id } });
    if (!ada) throw new NotFoundException('Pencatatan KWH tidak ditemukan');
    await this.prisma.kwhPencatatan.delete({ where: { id } });
    await this.auditLog.catat({
      actorId: aktor.id,
      actorUsername: aktor.username,
      actorName: aktor.nama,
      actorNrp: aktor.nrp,
      aksi: 'KWH_DIHAPUS',
      entitas: 'KwhPencatatan',
      entitasId: id,
      detail: { meterId: ada.meterId, tahun: ada.tahun, bulan: ada.bulan, standMeter: Number(ada.standMeter) },
    });
    return { sukses: true };
  }

  // ---------- Dashboard ----------

  /** Angka kartu dashboard: pemakaian bulan berjalan vs bulan lalu (WITA). */
  async ringkasan() {
    const { tahun, bulan } = komponenWita(new Date());
    const skorIni = skor(tahun, bulan);
    const skorLalu = skorIni - 1;
    const [meterAktif, semua] = await Promise.all([
      this.prisma.kwhMeter.findMany({ where: { aktif: true }, select: { id: true } }),
      this.semuaBaris(),
    ]);
    const peta = petaStand(semua);

    let pemakaianIni = 0;
    let pemakaianLalu = 0;
    let belumDicatat = 0;
    for (const m of meterAktif) {
      const ini = peta.get(`${m.id}:${skorIni}`);
      const lalu = peta.get(`${m.id}:${skorLalu}`);
      const lalu2 = peta.get(`${m.id}:${skorLalu - 1}`);
      if (ini === undefined) belumDicatat += 1;
      if (ini !== undefined && lalu !== undefined) pemakaianIni += ini - lalu;
      if (lalu !== undefined && lalu2 !== undefined) pemakaianLalu += lalu - lalu2;
    }

    const selisihPersen = pemakaianLalu > 0 ? bulatDua(((pemakaianIni - pemakaianLalu) / pemakaianLalu) * 100) : null;

    return {
      tahun,
      bulan,
      totalMeter: meterAktif.length,
      pemakaianBulanIni: bulatDua(pemakaianIni),
      pemakaianBulanLalu: bulatDua(pemakaianLalu),
      selisihPersen,
      meterBelumDicatatBulanIni: belumDicatat,
    };
  }

  /** Tren pemakaian total per bulan (tahun berjalan) + porsi per meter bulan berjalan. */
  async tren() {
    const { tahun, bulan } = komponenWita(new Date());
    const [meter, semua] = await Promise.all([
      this.prisma.kwhMeter.findMany({ where: { aktif: true }, select: { id: true, nama: true } }),
      this.semuaBaris(),
    ]);
    const peta = petaStand(semua);

    const trenBulanan = Array.from({ length: 12 }, (_, i) => {
      const b = i + 1;
      let total = 0;
      for (const m of meter) {
        const p = pemakaianDari(peta, m.id, tahun, b);
        if (p !== null) total += p;
      }
      return { bulan: b, total: bulatDua(total) };
    });

    const perMeter = meter
      .map((m) => ({ meterId: m.id, nama: m.nama, total: pemakaianDari(peta, m.id, tahun, bulan) ?? 0 }))
      .filter((m) => m.total > 0);

    return { tahun, bulan, trenBulanan, perMeter };
  }
}
