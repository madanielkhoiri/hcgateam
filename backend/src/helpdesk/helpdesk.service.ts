// ==================================================
// FILE: backend/src/helpdesk/helpdesk.service.ts
// FUNGSI: Logika Helpdesk Center - buat tiket, daftar, proses, selesaikan
// ==================================================

import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, StatusTiketHelpdesk, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SelesaikanTiketDto } from './dto/selesaikan-tiket.dto';
import {
  KATEGORI_TIKET_HELPDESK,
  masalahValid,
  POHON_KATEGORI_HELPDESK,
  subKategoriValid,
} from './helpdesk.constants';

export type AktorHelpdesk = {
  id: number;
  role: UserRole;
};

const tiketSelect = {
  id: true,
  nomorTiket: true,
  kategori: true,
  subKategori: true,
  masalah: true,
  deskripsi: true,
  lampiran: true,
  namaFileAsli: true,
  status: true,
  level: true,
  catatanPenyelesaian: true,
  dibuatPada: true,
  diprosesPada: true,
  selesaiPada: true,
  pembuat: {
    select: {
      id: true,
      name: true,
      role: true,
      departemen: true,
      jabatan: true,
      phoneNumber: true,
    },
  },
  pic: { select: { id: true, name: true } },
} satisfies Prisma.TiketHelpdeskSelect;

@Injectable()
export class HelpdeskService {
  constructor(private readonly prisma: PrismaService) {}

  private isPic(aktor: AktorHelpdesk): boolean {
    return aktor.role === UserRole.ADMIN || aktor.role === UserRole.SUPER_ADMIN;
  }

  kategoriTersedia() {
    return POHON_KATEGORI_HELPDESK;
  }

  private async nomorTiketBerikutnya(
    tx: Prisma.TransactionClient,
    tanggal: Date,
  ) {
    const hasil = await tx.tiketHelpdesk.aggregate({
      _max: { sequenceNumber: true },
    });
    const sequenceNumber = (hasil._max.sequenceNumber ?? 0) + 1;
    const bulan = String(tanggal.getMonth() + 1).padStart(2, '0');
    const tahun = String(tanggal.getFullYear()).slice(-2);
    const nomorTiket = `TCKT/${bulan}/${tahun}/${String(sequenceNumber).padStart(5, '0')}`;

    return { sequenceNumber, nomorTiket };
  }

  async buat(
    aktor: AktorHelpdesk,
    data: {
      kategori?: string;
      subKategori?: string;
      masalah?: string;
      deskripsi?: string;
    },
    file?: Express.Multer.File,
  ) {
    const kategori = data.kategori?.trim();
    const subKategori = data.subKategori?.trim();
    const masalah = data.masalah?.trim();
    const deskripsi = data.deskripsi?.trim();

    if (
      !kategori ||
      !(KATEGORI_TIKET_HELPDESK as readonly string[]).includes(kategori)
    ) {
      throw new BadRequestException('Kategori masalah tidak valid');
    }

    if (!subKategori || !subKategoriValid(kategori, subKategori)) {
      throw new BadRequestException('Sub kategori tidak valid');
    }

    const daftarMasalah = (
      POHON_KATEGORI_HELPDESK as Record<string, Record<string, readonly string[]>>
    )[kategori][subKategori];

    if (daftarMasalah.length > 0) {
      if (!masalah || !masalahValid(kategori, subKategori, masalah)) {
        throw new BadRequestException('Masalah tidak valid');
      }
    }

    if (!deskripsi || deskripsi.length < 5) {
      throw new BadRequestException('Deskripsi masalah minimal 5 karakter');
    }

    const tanggal = new Date();

    return this.prisma.$transaction(async (tx) => {
      const { sequenceNumber, nomorTiket } = await this.nomorTiketBerikutnya(
        tx,
        tanggal,
      );

      return tx.tiketHelpdesk.create({
        data: {
          nomorTiket,
          sequenceNumber,
          kategori,
          subKategori,
          masalah: daftarMasalah.length > 0 ? masalah : null,
          deskripsi,
          lampiran: file ? `/uploads/helpdesk/${file.filename}` : null,
          namaFileAsli: file?.originalname ?? null,
          pembuatId: aktor.id,
        },
        select: tiketSelect,
      });
    });
  }

  async daftar(aktor: AktorHelpdesk, status?: string) {
    const statusValid =
      status &&
      (Object.values(StatusTiketHelpdesk) as string[]).includes(status)
        ? (status as StatusTiketHelpdesk)
        : undefined;

    return this.prisma.tiketHelpdesk.findMany({
      where: {
        ...(statusValid ? { status: statusValid } : {}),
        ...(this.isPic(aktor) ? {} : { pembuatId: aktor.id }),
      },
      select: tiketSelect,
      orderBy: { dibuatPada: 'desc' },
    });
  }

  async ringkasan(aktor: AktorHelpdesk) {
    const antrian = await this.prisma.tiketHelpdesk.count({
      where: {
        status: {
          in: [StatusTiketHelpdesk.TERBUKA, StatusTiketHelpdesk.DIPROSES],
        },
        ...(this.isPic(aktor) ? {} : { pembuatId: aktor.id }),
      },
    });

    return { antrian };
  }

  async detail(id: number, aktor: AktorHelpdesk) {
    const tiket = await this.prisma.tiketHelpdesk.findUnique({
      where: { id },
      select: tiketSelect,
    });

    if (!tiket) {
      throw new NotFoundException('Tiket tidak ditemukan');
    }

    if (!this.isPic(aktor) && tiket.pembuat.id !== aktor.id) {
      throw new ForbiddenException('Anda tidak dapat mengakses tiket ini');
    }

    return tiket;
  }

  async proses(id: number, aktor: AktorHelpdesk) {
    if (!this.isPic(aktor)) {
      throw new ForbiddenException(
        'Hanya Admin/Admin HC yang dapat memproses tiket',
      );
    }

    const tiket = await this.prisma.tiketHelpdesk.findUnique({
      where: { id },
    });

    if (!tiket) {
      throw new NotFoundException('Tiket tidak ditemukan');
    }

    if (tiket.status !== StatusTiketHelpdesk.TERBUKA) {
      throw new BadRequestException('Tiket sudah diproses sebelumnya');
    }

    return this.prisma.tiketHelpdesk.update({
      where: { id },
      data: {
        status: StatusTiketHelpdesk.DIPROSES,
        picId: aktor.id,
        diprosesPada: new Date(),
      },
      select: tiketSelect,
    });
  }

  async selesaikan(id: number, aktor: AktorHelpdesk, dto: SelesaikanTiketDto) {
    if (!this.isPic(aktor)) {
      throw new ForbiddenException(
        'Hanya Admin/Admin HC yang dapat menyelesaikan tiket',
      );
    }

    const tiket = await this.prisma.tiketHelpdesk.findUnique({
      where: { id },
    });

    if (!tiket) {
      throw new NotFoundException('Tiket tidak ditemukan');
    }

    if (tiket.status === StatusTiketHelpdesk.SELESAI) {
      throw new BadRequestException('Tiket sudah selesai');
    }

    return this.prisma.tiketHelpdesk.update({
      where: { id },
      data: {
        status: StatusTiketHelpdesk.SELESAI,
        picId: tiket.picId ?? aktor.id,
        diprosesPada: tiket.diprosesPada ?? new Date(),
        selesaiPada: new Date(),
        catatanPenyelesaian: dto.catatanPenyelesaian.trim(),
        level: dto.level ?? tiket.level,
      },
      select: tiketSelect,
    });
  }
}
