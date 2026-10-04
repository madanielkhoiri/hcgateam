// ==================================================
// FILE: backend/src/mcu/notifikasi/mcu-notifikasi.service.ts
// FUNGSI: Pencatatan & pengiriman notifikasi MCU
// Referensi: Bagian 4.13 alur-workflow-mcu-periodik-v3.md
// Kanal email memakai SMTP internal/Outlook (Keputusan #8).
// ==================================================

import { Injectable, Logger, Optional } from '@nestjs/common';
import {
  KanalNotifikasi,
  Prisma,
  StatusKirimNotifikasi,
  TipeNotifikasiMcu,
  UserRole,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { WebPushService } from '../../web-push/web-push.service';
import { WhatsappService } from '../../whatsapp/whatsapp.service';

export type TargetNotifikasi = {
  penerimaId?: number | null;
  penerimaEmail?: string | null;
};

export type IsiNotifikasi = TargetNotifikasi & {
  tipe: TipeNotifikasiMcu;
  refTabel: string;
  refId: number;
  judul: string;
  pesan: string;
  kanal?: KanalNotifikasi;
};

type KlienPrisma = Prisma.TransactionClient | PrismaService;

@Injectable()
export class McuNotifikasiService {
  private readonly logger = new Logger(McuNotifikasiService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly webPush?: WebPushService,
    @Optional() private readonly whatsapp?: WhatsappService,
  ) {}

  /**
   * Catat notifikasi. Kanal in-app langsung berstatus TERKIRIM,
   * kanal email menunggu worker SMTP mengirim.
   */
  async kirim(isi: IsiNotifikasi, tx?: Prisma.TransactionClient) {
    const klien: KlienPrisma = tx ?? this.prisma;
    const kanal = isi.kanal ?? KanalNotifikasi.IN_APP;
    const langsungTerkirim = kanal === KanalNotifikasi.IN_APP;

    return klien.logNotifikasiMcu.create({
      data: {
        tipe: isi.tipe,
        refTabel: isi.refTabel,
        refId: isi.refId,
        penerimaId: isi.penerimaId ?? null,
        penerimaEmail: isi.penerimaEmail ?? null,
        judul: isi.judul,
        pesan: isi.pesan,
        kanal,
        statusKirim: langsungTerkirim
          ? StatusKirimNotifikasi.TERKIRIM
          : StatusKirimNotifikasi.MENUNGGU,
        waktuKirim: langsungTerkirim ? new Date() : null,
      },
    });
  }

  /** Kirim satu pesan ke banyak penerima sekaligus (in-app + email). */
  async kirimBanyak(
    daftar: IsiNotifikasi[],
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    for (const isi of daftar) {
      await this.kirim(isi, tx);
      if (isi.kanal === undefined || isi.kanal === KanalNotifikasi.IN_APP) {
        if (isi.penerimaId && this.webPush) {
          await this.webPush.sendToUser(isi.penerimaId, {
            title: isi.judul,
            body: isi.pesan,
            url: '/mcu/notifikasi',
          });
        }
        // Notifikasi tindak lanjut MCU juga dikirim ke WA karyawan. Reminder
        // H-3 bulan dikecualikan karena scheduler sudah mengirimkannya langsung.
        if (isi.penerimaId && this.whatsapp?.aktif && isi.tipe !== TipeNotifikasiMcu.REMINDER_H3_BULAN) {
          const karyawan = await this.prisma.karyawan.findFirst({ where: { akunId: isi.penerimaId }, select: { nama: true, noTelepon: true } });
          if (karyawan?.noTelepon) {
            await this.whatsapp.kirim(karyawan.noTelepon, `Halo, *${karyawan.nama}* 👋\n\n*${isi.judul}*\n\n${isi.pesan}\n\nMohon diperhatikan. Terima kasih 🙏`, undefined, 'HC');
          }
        }
      }
    }
  }

  /**
   * Bentuk target notifikasi untuk seluruh pemegang satu peran MCU.
   * Dipakai untuk tembusan ke HC, Dokter, dan SHE.
   */
  async penerimaPeran(peran: UserRole): Promise<TargetNotifikasi[]> {
    const akun = await this.prisma.user.findMany({
      where: { role: peran, isActive: true },
      select: { id: true, email: true },
    });

    return akun.map((item) => ({
      penerimaId: item.id,
      penerimaEmail: item.email,
    }));
  }

  /** Bangun payload notifikasi untuk semua pemegang satu role. */
  async untukPeran(
    peran: UserRole,
    isi: Omit<IsiNotifikasi, 'penerimaId' | 'penerimaEmail'>,
  ): Promise<IsiNotifikasi[]> {
    const penerima = await this.penerimaPeran(peran);

    return penerima.flatMap((target) => this.duaKanal({ ...isi, ...target }));
  }

  /**
   * Setiap notifikasi dikirim in-app sekaligus email Outlook
   * bila alamat email penerima tersedia.
   */
  duaKanal(isi: IsiNotifikasi): IsiNotifikasi[] {
    const daftar: IsiNotifikasi[] = [{ ...isi, kanal: KanalNotifikasi.IN_APP }];

    if (isi.penerimaEmail) {
      daftar.push({ ...isi, kanal: KanalNotifikasi.EMAIL_OUTLOOK });
    }

    return daftar;
  }

  async daftar(params: {
    penerimaId?: number;
    tipe?: TipeNotifikasiMcu;
    statusKirim?: StatusKirimNotifikasi;
    belumDibaca?: boolean;
    batas?: number;
  }) {
    return this.prisma.logNotifikasiMcu.findMany({
      where: {
        ...(params.penerimaId ? { penerimaId: params.penerimaId } : {}),
        ...(params.tipe ? { tipe: params.tipe } : {}),
        ...(params.statusKirim ? { statusKirim: params.statusKirim } : {}),
        ...(params.belumDibaca ? { dibacaAt: null } : {}),
      },
      include: {
        penerima: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: params.batas ?? 100,
    });
  }

  async tandaiDibaca(id: number, penerimaId: number) {
    const hasil = await this.prisma.logNotifikasiMcu.updateMany({
      where: { id, penerimaId },
      data: { dibacaAt: new Date() },
    });

    return { diperbarui: hasil.count };
  }

  /**
   * Tandai antrean email sebagai terkirim.
   * Titik integrasi SMTP internal/Outlook dipasang di sini.
   */
  async prosesAntreanEmail() {
    const antrean = await this.prisma.logNotifikasiMcu.findMany({
      where: {
        kanal: KanalNotifikasi.EMAIL_OUTLOOK,
        statusKirim: StatusKirimNotifikasi.MENUNGGU,
      },
      take: 200,
    });

    for (const item of antrean) {
      this.logger.log(
        `Email MCU ${item.tipe} untuk ${item.penerimaEmail ?? '-'} disiapkan`,
      );
    }

    const hasil = await this.prisma.logNotifikasiMcu.updateMany({
      where: { id: { in: antrean.map((item) => item.id) } },
      data: {
        statusKirim: StatusKirimNotifikasi.TERKIRIM,
        waktuKirim: new Date(),
      },
    });

    return { diproses: hasil.count };
  }

  async ringkasan() {
    const kelompok = await this.prisma.logNotifikasiMcu.groupBy({
      by: ['tipe', 'statusKirim'],
      _count: { _all: true },
    });

    return kelompok.map((item) => ({
      tipe: item.tipe,
      statusKirim: item.statusKirim,
      jumlah: item._count._all,
    }));
  }
}
