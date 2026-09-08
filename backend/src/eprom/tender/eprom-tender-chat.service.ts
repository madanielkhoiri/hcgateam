// ==================================================
// FILE: backend/src/eprom/tender/eprom-tender-chat.service.ts
// FUNGSI: Chat undangan tender — vendor tetap balas lewat email biasa,
// staff (Owner) lihat & balas sebagai chat real-time di web. Satu
// TenderUndangan = satu "ruang chat" per vendor per tender.
// Referensi: workflow-email-chat-websocket.md
// ==================================================

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ArahPesanTenderChat } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { EpromFileService } from '../common/eprom-file.service';
import { AktorEprom } from '../common/eprom-aktor';
import { MailgunService } from '../../mailgun/mailgun.service';
import { EpromTenderChatGateway } from './eprom-tender-chat.gateway';
import { alamatInboundUndangan, ekstrakUndanganIdDariRecipient } from './eprom-tender-chat.util';

const PESAN_INCLUDE = {
  lampiran: true,
  pengirim: { select: { id: true, name: true } },
} as const;

@Injectable()
export class EpromTenderChatService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly file: EpromFileService,
    private readonly mailgun: MailgunService,
    private readonly gateway: EpromTenderChatGateway,
  ) {}

  private async undanganAtauThrow(tenderId: number, vendorId: number) {
    const undangan = await this.prisma.tenderUndangan.findUnique({
      where: { tenderId_vendorId: { tenderId, vendorId } },
      include: { tender: { select: { namaTender: true } }, vendor: { select: { namaVendor: true, email: true } } },
    });

    if (!undangan) {
      throw new NotFoundException('Undangan tidak ditemukan');
    }

    return undangan;
  }

  async daftarPesan(tenderId: number, vendorId: number) {
    const undangan = await this.undanganAtauThrow(tenderId, vendorId);

    const pesan = await this.prisma.tenderPesan.findMany({
      where: { undanganId: undangan.id },
      include: PESAN_INCLUDE,
      orderBy: { createdAt: 'asc' },
    });

    return {
      undanganId: undangan.id,
      vendor: undangan.vendor,
      mailAktif: this.mailgun.aktif,
      pesan,
    };
  }

  /** Staff (Owner) kirim pesan dari web — dicatat sebagai KELUAR, lalu dikirim ke vendor lewat email. */
  async kirimPesanKeluar(
    aktor: AktorEprom,
    tenderId: number,
    vendorId: number,
    isi: string,
    files: Express.Multer.File[] = [],
  ) {
    if (!isi?.trim() && files.length === 0) {
      throw new BadRequestException('Isi pesan atau lampiran wajib diisi');
    }

    const undangan = await this.undanganAtauThrow(tenderId, vendorId);

    const pesanTerakhir = await this.prisma.tenderPesan.findFirst({
      where: { undanganId: undangan.id },
      orderBy: { createdAt: 'desc' },
    });

    const lampiranTersimpan = files.map((berkas) => ({
      namaFile: berkas.originalname,
      urlFile: this.file.simpanDokumen(berkas, `tender/${tenderId}/pesan/${undangan.id}`),
    }));

    const pesan = await this.prisma.tenderPesan.create({
      data: {
        undanganId: undangan.id,
        arah: ArahPesanTenderChat.KELUAR,
        isiPesan: isi?.trim() || '(Tidak ada isi pesan — lihat lampiran)',
        pengirimId: aktor.id,
        inReplyTo: pesanTerakhir?.messageId ?? undefined,
        lampiran: { create: lampiranTersimpan },
      },
      include: PESAN_INCLUDE,
    });

    if (undangan.vendor.email) {
      const hasil = await this.mailgun.kirim({
        to: undangan.vendor.email,
        subjek: `Tender: ${undangan.tender.namaTender}`,
        teks: isi?.trim() || '(Lihat lampiran)',
        replyTo: alamatInboundUndangan(undangan.id, this.mailgun.domainAktif),
        inReplyTo: pesanTerakhir?.messageId ?? undefined,
        references: pesanTerakhir?.messageId ?? undefined,
        lampiran: files.map((berkas) => ({ namaFile: berkas.originalname, data: berkas.buffer })),
      });

      if (hasil.berhasil && hasil.messageId) {
        await this.prisma.tenderPesan.update({
          where: { id: pesan.id },
          data: { messageId: hasil.messageId },
        });
      }
    }

    this.gateway.emitPesanBaru(undangan.id, pesan);

    return pesan;
  }

  /** Dipanggil webhook Mailgun setelah signature terverifikasi — balasan vendor jadi pesan MASUK. */
  async terimaPesanMasuk(payload: Record<string, string>, files: Express.Multer.File[] = []) {
    const undanganId = ekstrakUndanganIdDariRecipient(payload.recipient);

    if (!undanganId) {
      return null;
    }

    const undangan = await this.prisma.tenderUndangan.findUnique({ where: { id: undanganId } });

    if (!undangan) {
      return null;
    }

    const isiPesan =
      payload['stripped-text']?.trim() || payload['body-plain']?.trim() || '(Email tanpa isi teks)';

    const lampiranTersimpan = files.map((berkas) => ({
      namaFile: berkas.originalname,
      urlFile: this.file.simpanDokumen(berkas, `tender/${undangan.tenderId}/pesan/${undangan.id}`),
    }));

    const pesan = await this.prisma.tenderPesan.create({
      data: {
        undanganId: undangan.id,
        arah: ArahPesanTenderChat.MASUK,
        isiPesan,
        messageId: payload['Message-Id'] || payload['message-id'] || undefined,
        inReplyTo: payload['In-Reply-To'] || payload['in-reply-to'] || undefined,
        lampiran: { create: lampiranTersimpan },
      },
      include: PESAN_INCLUDE,
    });

    this.gateway.emitPesanBaru(undangan.id, pesan);

    return pesan;
  }
}
