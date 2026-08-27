// ==================================================
// FILE: backend/src/eprom/tender/eprom-tender.service.ts
// FUNGSI: Tender, Undangan Tender, dan Klasifikasi & Evaluasi (SPH)
// Referensi: alur-workflow-tender-kontrak-project-area.md bagian 4.1
// ==================================================

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PartialType } from '@nestjs/mapped-types';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { StatusTender } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { EpromFileService } from '../common/eprom-file.service';
import { AktorEprom } from '../common/eprom-aktor';
import { MailService } from '../../mail/mail.service';

export class BuatTenderDto {
  @IsString()
  @IsNotEmpty()
  namaTender: string;

  @IsOptional()
  @IsDateString()
  tanggalMulai?: string;

  @IsOptional()
  @IsDateString()
  tanggalSelesai?: string;
}

export class UbahTenderDto extends PartialType(BuatTenderDto) {}

export class KirimUndanganDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsInt({ each: true })
  vendorIds: number[];
}

@Injectable()
export class EpromTenderService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly file: EpromFileService,
    private readonly mail: MailService,
  ) {}

  async daftar() {
    const list = await this.prisma.tenderProcess.findMany({
      include: {
        _count: { select: { undangan: true, sph: true } },
        kontrak: { select: { id: true } },
        sph: {
          where: { statusPemenang: true },
          take: 1,
          include: { vendor: { select: { id: true, namaVendor: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return list.map(({ sph, ...tender }) => ({ ...tender, pemenang: sph[0] ?? null }));
  }

  async detail(id: number) {
    const tender = await this.prisma.tenderProcess.findUnique({
      where: { id },
      include: {
        undangan: {
          include: { vendor: true, files: { orderBy: { id: 'asc' } } },
          orderBy: { id: 'asc' },
        },
        sph: { include: { vendor: true }, orderBy: [{ vendorId: 'asc' }, { roundKe: 'asc' }] },
        kontrak: true,
      },
    });

    if (!tender) {
      throw new NotFoundException('Tender tidak ditemukan');
    }

    return tender;
  }

  async buat(dto: BuatTenderDto) {
    return this.prisma.tenderProcess.create({
      data: {
        namaTender: dto.namaTender.trim(),
        tanggalMulai: dto.tanggalMulai ? new Date(dto.tanggalMulai) : null,
        tanggalSelesai: dto.tanggalSelesai ? new Date(dto.tanggalSelesai) : null,
      },
    });
  }

  async ubah(id: number, dto: UbahTenderDto) {
    await this.detail(id);

    return this.prisma.tenderProcess.update({
      where: { id },
      data: {
        ...(dto.namaTender !== undefined ? { namaTender: dto.namaTender.trim() } : {}),
        ...(dto.tanggalMulai !== undefined
          ? { tanggalMulai: dto.tanggalMulai ? new Date(dto.tanggalMulai) : null }
          : {}),
        ...(dto.tanggalSelesai !== undefined
          ? { tanggalSelesai: dto.tanggalSelesai ? new Date(dto.tanggalSelesai) : null }
          : {}),
      },
    });
  }

  async hapus(id: number) {
    const tender = await this.prisma.tenderProcess.findUnique({
      where: { id },
      include: { kontrak: { select: { id: true } } },
    });

    if (!tender) {
      throw new NotFoundException('Tender tidak ditemukan');
    }

    if (tender.kontrak) {
      throw new BadRequestException(
        'Tender ini sudah memiliki Kontrak, tidak dapat dihapus',
      );
    }

    await this.prisma.tenderProcess.delete({ where: { id } });

    return { message: 'Tender berhasil dihapus' };
  }

  async kirimUndangan(
    tenderId: number,
    dto: KirimUndanganDto,
    filesPerVendor: Map<number, Express.Multer.File[]>,
  ) {
    const tender = await this.detail(tenderId);

    const vendors = await this.prisma.vendor.findMany({
      where: { id: { in: dto.vendorIds } },
      select: { id: true, namaVendor: true, email: true },
    });

    const lampiranPerVendor = new Map<number, { namaFile: string; urlFile: string }[]>();
    for (const vendorId of dto.vendorIds) {
      const files = filesPerVendor.get(vendorId) ?? [];
      lampiranPerVendor.set(
        vendorId,
        files.map((file) => ({
          namaFile: file.originalname,
          urlFile: this.file.simpanDokumen(file, `tender/${tenderId}/undangan/${vendorId}`),
        })),
      );
    }

    await this.prisma.$transaction(async (tx) => {
      for (const vendorId of dto.vendorIds) {
        const undangan = await tx.tenderUndangan.upsert({
          where: { tenderId_vendorId: { tenderId, vendorId } },
          update: { tanggalKirim: new Date() },
          create: { tenderId, vendorId, tanggalKirim: new Date() },
        });

        const lampiran = lampiranPerVendor.get(vendorId) ?? [];
        if (lampiran.length > 0) {
          await tx.tenderUndanganFile.createMany({
            data: lampiran.map((item) => ({
              undanganId: undangan.id,
              namaFile: item.namaFile,
              urlFile: item.urlFile,
            })),
          });
        }
      }

      if (tender.status === StatusTender.PERSIAPAN) {
        await tx.tenderProcess.update({
          where: { id: tenderId },
          data: { status: StatusTender.UNDANGAN_TERKIRIM },
        });
      }
    });

    const ringkasanEmail = await this.kirimEmailUndangan(
      tender.namaTender,
      vendors,
      lampiranPerVendor,
    );

    return { ...(await this.detail(tenderId)), ringkasanEmail };
  }

  /**
   * Kirim email undangan (SMTP Outlook/M365) ke email yang terdaftar di data
   * vendor — masing-masing vendor cuma menerima lampiran file miliknya sendiri.
   */
  private async kirimEmailUndangan(
    namaTender: string,
    vendors: { id: number; namaVendor: string; email: string | null }[],
    lampiranPerVendor: Map<number, { namaFile: string; urlFile: string }[]>,
  ) {
    const ringkasan = {
      mailAktif: this.mail.aktif,
      terkirim: [] as string[],
      gagal: [] as string[],
      tanpaEmail: [] as string[],
    };

    if (!this.mail.aktif) {
      return ringkasan;
    }

    for (const vendor of vendors) {
      if (!vendor.email) {
        ringkasan.tanpaEmail.push(vendor.namaVendor);
        continue;
      }

      const lampiranEmail = (lampiranPerVendor.get(vendor.id) ?? []).map((item) => ({
        filename: item.namaFile,
        path: this.file.resolveAbsolut(item.urlFile),
      }));

      const sukses = await this.mail.kirim({
        to: vendor.email,
        subjek: `Undangan Tender: ${namaTender}`,
        teks:
          `Yth. ${vendor.namaVendor},\n\n` +
          `Dengan ini kami mengundang perusahaan Anda untuk berpartisipasi pada tender "${namaTender}". ` +
          `Dokumen undangan terlampir pada email ini.\n\nTerima kasih.`,
        lampiran: lampiranEmail,
      });

      (sukses ? ringkasan.terkirim : ringkasan.gagal).push(vendor.namaVendor);
    }

    return ringkasan;
  }

  /** Batalkan undangan vendor — hanya boleh sebelum vendor punya SPH sama sekali. */
  async hapusUndangan(tenderId: number, vendorId: number) {
    const undangan = await this.prisma.tenderUndangan.findUnique({
      where: { tenderId_vendorId: { tenderId, vendorId } },
    });

    if (!undangan) {
      throw new NotFoundException('Undangan tidak ditemukan');
    }

    const jumlahSph = await this.prisma.tenderSPH.count({ where: { tenderId, vendorId } });

    if (jumlahSph > 0) {
      throw new BadRequestException(
        'Vendor ini sudah mengunggah SPH, undangan tidak dapat dibatalkan',
      );
    }

    await this.prisma.tenderUndangan.delete({
      where: { tenderId_vendorId: { tenderId, vendorId } },
    });

    return { message: 'Undangan berhasil dibatalkan' };
  }

  /**
   * Menambah SPH baru (SPH 1, SPH 2, dst — independen per vendor). Harga
   * penawaran opsional dan TIDAK otomatis final — vendor/owner tetap bisa
   * menambah SPH baru lagi kapan pun (negosiasi bisa berkali-kali). Owner
   * yang menentukan kapan "cukup" lewat aksi finalisasiVendor terpisah.
   */
  async buatRoundSph(
    aktor: AktorEprom,
    tenderId: number,
    vendorId: number,
    file?: Express.Multer.File,
    hargaPenawaran?: number,
  ) {
    const undangan = await this.prisma.tenderUndangan.findUnique({
      where: { tenderId_vendorId: { tenderId, vendorId } },
    });

    if (!undangan) {
      throw new BadRequestException('Vendor ini belum diundang pada tender tersebut');
    }

    const roundTerakhir = await this.prisma.tenderSPH.findFirst({
      where: { tenderId, vendorId },
      orderBy: { roundKe: 'desc' },
    });

    if (roundTerakhir?.isFinal) {
      throw new BadRequestException('SPH vendor ini sudah final, tidak bisa menambah SPH baru');
    }

    const roundKe = (roundTerakhir?.roundKe ?? 0) + 1;
    const fileSph = file
      ? this.file.simpan(file, `tender/${tenderId}/sph`, this.file.tebakTipe(file.originalname))
      : null;

    const round = await this.prisma.tenderSPH.create({
      data: { tenderId, vendorId, roundKe, fileSph, hargaPenawaran },
    });

    await this.prisma.tenderProcess.updateMany({
      where: { id: tenderId, status: StatusTender.UNDANGAN_TERKIRIM },
      data: { status: StatusTender.EVALUASI_SPH },
    });

    return round;
  }

  /**
   * Ubah file/harga pada satu SPH yang sudah ada (bukan bikin round baru) —
   * dipakai untuk membetulkan salah unggah/harga sebelum SPH itu final.
   */
  async ubahRoundSph(
    tenderId: number,
    vendorId: number,
    roundId: number,
    file?: Express.Multer.File,
    hargaPenawaran?: number,
  ) {
    const round = await this.prisma.tenderSPH.findUnique({ where: { id: roundId } });

    if (!round || round.tenderId !== tenderId || round.vendorId !== vendorId) {
      throw new NotFoundException('SPH tidak ditemukan');
    }

    if (round.isFinal) {
      throw new BadRequestException('SPH ini sudah final, tidak dapat diubah lagi');
    }

    const fileSph = file
      ? this.file.simpan(file, `tender/${tenderId}/sph`, this.file.tebakTipe(file.originalname))
      : undefined;

    return this.prisma.tenderSPH.update({
      where: { id: roundId },
      data: {
        ...(fileSph !== undefined ? { fileSph } : {}),
        ...(hargaPenawaran !== undefined ? { hargaPenawaran } : {}),
      },
    });
  }

  /** Hapus satu SPH yang belum final (salah unggah, batal negosiasi). */
  async hapusRoundSph(tenderId: number, vendorId: number, roundId: number) {
    const round = await this.prisma.tenderSPH.findUnique({ where: { id: roundId } });

    if (!round || round.tenderId !== tenderId || round.vendorId !== vendorId) {
      throw new NotFoundException('SPH tidak ditemukan');
    }

    if (round.isFinal) {
      throw new BadRequestException('SPH ini sudah final, tidak dapat dihapus');
    }

    await this.prisma.tenderSPH.delete({ where: { id: roundId } });

    return { message: 'SPH berhasil dihapus' };
  }

  /**
   * Owner menandai SPH terbaru SEMUA vendor undangan sebagai final sekaligus
   * (satu tombol Final untuk seluruh tender) — setiap vendor wajib sudah
   * mengisi harga pada SPH terbarunya. Pemenang TIDAK lagi ditentukan
   * otomatis dari harga termurah — Owner memilih sendiri lewat
   * tetapkanPemenang(), mempertimbangkan harga (SPH) DAN Evaluasi Vendor.
   */
  async finalisasiTender(tenderId: number) {
    const undangan = await this.prisma.tenderUndangan.findMany({
      where: { tenderId },
      include: { vendor: { select: { namaVendor: true } } },
    });

    if (undangan.length === 0) {
      throw new BadRequestException('Belum ada vendor diundang pada tender ini');
    }

    const roundTerakhirPerVendor = await Promise.all(
      undangan.map(({ vendorId, vendor }) =>
        this.prisma.tenderSPH
          .findFirst({ where: { tenderId, vendorId }, orderBy: { roundKe: 'desc' } })
          .then((round) => ({ vendorId, namaVendor: vendor.namaVendor, round })),
      ),
    );

    const belumSiap = roundTerakhirPerVendor.filter(
      ({ round }) => !round || round.hargaPenawaran === null,
    );

    if (belumSiap.length > 0) {
      throw new BadRequestException(
        `Vendor berikut belum isi harga penawaran: ${belumSiap.map((v) => v.namaVendor).join(', ')}`,
      );
    }

    const perluDifinalkan = roundTerakhirPerVendor.filter(({ round }) => !round!.isFinal);

    if (perluDifinalkan.length > 0) {
      await this.prisma.$transaction(
        perluDifinalkan.map(({ round }) =>
          this.prisma.tenderSPH.update({ where: { id: round!.id }, data: { isFinal: true } }),
        ),
      );
    }

    return this.detail(tenderId);
  }

  /**
   * Owner menetapkan pemenang secara manual (mempertimbangkan harga SPH dan
   * Evaluasi Vendor bersamaan) — vendor yang dipilih wajib sudah punya SPH
   * final berharga. Menggantikan tender lain yang mungkin pernah ditetapkan.
   */
  async tetapkanPemenang(tenderId: number, vendorId: number) {
    await this.detail(tenderId);

    const roundFinal = await this.prisma.tenderSPH.findFirst({
      where: { tenderId, vendorId, isFinal: true, hargaPenawaran: { not: null } },
      orderBy: { roundKe: 'desc' },
    });

    if (!roundFinal) {
      throw new BadRequestException(
        'Vendor ini belum memiliki SPH final berharga — finalisasi SPH terlebih dahulu',
      );
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.tenderSPH.updateMany({
        where: { tenderId, statusPemenang: true },
        data: { statusPemenang: false },
      });

      await tx.tenderSPH.update({
        where: { id: roundFinal.id },
        data: { statusPemenang: true },
      });

      await tx.tenderProcess.update({
        where: { id: tenderId },
        data: { status: StatusTender.SELESAI },
      });
    });

    return this.detail(tenderId);
  }
}
