// ==================================================
// FILE: backend/src/mcu/karyawan/mcu-karyawan.service.ts
// FUNGSI: Master karyawan/departemen + reminder H-3 bulan
// Referensi: Bagian 4.1 & 4.11 alur-workflow-mcu-periodik-v3.md
// ==================================================

import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  GenderKaryawan,
  Prisma,
  StatusKerja,
  StatusKesehatanDirumahkan,
  TipeNotifikasiMcu,
  UserRole,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as XLSX from 'xlsx';
import { PrismaService } from '../../prisma/prisma.service';
import { WhatsappService } from '../../whatsapp/whatsapp.service';
import { sapaanKaryawan } from '../../common/sapaan.util';
import { hasilHalaman, paramHalaman } from '../../common/pagination.util';
import {
  BULAN_MASA_BERLAKU_MCU,
  BULAN_REMINDER_KEDUA_SEBELUM_EXPIRED,
  BULAN_REMINDER_SEBELUM_EXPIRED,
} from '../mcu.constants';
import {
  formatTanggalIndonesia,
  hariIni,
  kurangBulan,
  selisihHari,
  tambahBulan,
  tanggalSaja,
} from '../mcu-date.util';
import { McuNotifikasiService } from '../notifikasi/mcu-notifikasi.service';
import {
  BuatDepartemenDto,
  BuatKaryawanDto,
  UbahDepartemenDto,
  UbahKaryawanDto,
  UbahStatusKerjaDto,
} from './dto/mcu-karyawan.dto';

const KARYAWAN_INCLUDE = {
  departemen: {
    select: {
      id: true,
      namaDepartemen: true,
      adminAkunId: true,
      adminAkun: { select: { id: true, name: true, email: true } },
    },
  },
  akun: { select: { id: true, name: true, username: true, email: true } },
} satisfies Prisma.KaryawanInclude;

@Injectable()
export class McuKaryawanService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifikasi: McuNotifikasiService,
    private readonly whatsapp: WhatsappService,
  ) {}

  async importMasterExcel(buffer: Buffer, replace = false) {
    const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: false });
    const sheet = workbook.Sheets['PPA ADW'];
    if (!sheet) throw new BadRequestException('Sheet PPA ADW tidak ditemukan');
    const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: null });
    const header = rows.findIndex((r) => r.some((v) => String(v ?? '').trim().toUpperCase() === 'NRP'));
    if (header < 0) throw new BadRequestException('Header NRP tidak ditemukan');
    const clean = (v: unknown) => String(v ?? '').trim();
    const headers = new Map(rows[header].map((v, i) => [String(v ?? '').trim().toUpperCase(), i]));
    const at = (r: unknown[], name: string) => r[headers.get(name) ?? -1];
    const norm = (v: unknown) => clean(v).toUpperCase().replace(/\s+/g, ' ');
    const dept = (v: unknown) => {
      const s = norm(v);
      if (s.includes('SCM') || s.includes('FAW')) return 'SCM - FAW';
      if (s === 'MNG' || s.includes('MANAGEMENT')) return 'MANAGEMENT';
      if (s === 'ENG' || s === 'ENGINEER') return 'ENGINEER';
      if (s === 'PLT' || s === 'PLANT') return 'PLANT';
      if (s === 'PRO' || s.includes('PRODUKSI')) return 'PRODUKSI';
      if (s === 'HCG' || s === 'HCGA') return 'HCGA';
      if (s.includes('ICT') || s === 'MD') return 'ICT MD';
      if (s.includes('HCGA') || s === 'HC' || s === 'GA') return 'HCGA';
      if (s.includes('PRODUKSI')) return 'PRODUKSI';
      if (s.includes('SHE')) return 'SHE';
      if (s.includes('ENGINEER')) return 'ENGINEER';
      if (s.includes('PLANT')) return 'PLANT';
      return null;
    };
    const status = (v: unknown): StatusKerja => {
      const s = norm(v);
      if (s.includes('RESIGN') || s.includes('OUT') || s.includes('MUTASI')) return StatusKerja.RESIGN;
      if (s.includes('DIRUMAH') || s.includes('NON AKTIF')) return StatusKerja.DIRUMAHKAN;
      return StatusKerja.AKTIF;
    };
    const gender = (v: unknown): GenderKaryawan | null => {
      const s = norm(v);
      return s === 'L' || s === 'MALE' || s.includes('LAKI') ? GenderKaryawan.LAKI_LAKI : s === 'P' || s === 'FEMALE' || s.includes('PEREMPUAN') ? GenderKaryawan.PEREMPUAN : null;
    };
    const data = rows.slice(header + 1).filter((r) => clean(at(r, 'NRP')) && clean(at(r, 'NAMA')));
    if (!data.length) throw new BadRequestException('Sheet PPA ADW tidak memiliki data karyawan');
    const unknown = [...new Set(data.map((r) => clean(at(r, 'DEPT.'))).filter((v) => v && !dept(v)))];
    if (unknown.length) throw new BadRequestException(`Departemen belum dimapping: ${unknown.join(', ')}`);
    const result = await this.prisma.$transaction(async (tx) => {
      const names = ['ICT MD', 'HCGA', 'MANAGEMENT', 'PRODUKSI', 'SHE', 'ENGINEER', 'PLANT', 'SCM - FAW'];
      const map = new Map<string, number>();
      for (const name of names) {
        const row = await tx.departemen.upsert({ where: { namaDepartemen: name }, update: { aktif: true }, create: { namaDepartemen: name, aktif: true } });
        map.set(name, row.id);
      }
      if (replace) await tx.karyawan.deleteMany({});
      let inserted = 0;
      for (const r of data) {
        const nik = clean(at(r, 'NRP'));
        const nama = clean(at(r, 'NAMA'));
        const jabatan = clean(at(r, 'JABATAN')) || null;
        const email = clean(at(r, 'EMAIL')) || null;
        const noTelepon = clean(at(r, 'NO HP')) || null;
        const statusKerja = status(at(r, 'STATUS'));
        const akunLama = await tx.user.findFirst({ where: { OR: [{ nrp: nik }, { username: nik }] }, select: { id: true, accessKeys: true } });
        const nomorDipakai = noTelepon ? await tx.user.findFirst({ where: { phoneNumber: noTelepon, ...(akunLama ? { NOT: { id: akunLama.id } } : {}) }, select: { id: true } }) : null;
        const emailDipakai = email ? await tx.user.findFirst({ where: { email, ...(akunLama ? { NOT: { id: akunLama.id } } : {}) }, select: { id: true } }) : null;
        const akun = akunLama
          ? await tx.user.update({ where: { id: akunLama.id }, data: { name: nama, nrp: nik, email: emailDipakai ? null : email, phoneNumber: nomorDipakai ? null : noTelepon, jabatan, isActive: statusKerja !== StatusKerja.RESIGN, accessKeys: Array.from(new Set([...akunLama.accessKeys, 'HC_MCU', 'HC_DEKLARASI'])) } })
          : await tx.user.create({ data: { name: nama, username: nik, nrp: nik, passwordHash: await bcrypt.hash(nik, 12), role: UserRole.KARYAWAN, accessKeys: ['HC_MCU', 'HC_DEKLARASI'], email: emailDipakai ? null : email, phoneNumber: nomorDipakai ? null : noTelepon, jabatan, isActive: statusKerja !== StatusKerja.RESIGN } });
        const payload = { nik, nama, gender: gender(at(r, 'GENDER')), departemenId: map.get(dept(at(r, 'DEPT.'))!)!, jabatan, email, noTelepon, statusKerja, akunId: akun.id };
        await tx.karyawan.upsert({ where: { nik }, update: payload, create: payload });
        inserted++;
      }
      return { inserted, departments: names };
    }, { maxWait: 30000, timeout: 600000 });
    return result;
  }

  // ==================================================
  // DEPARTEMEN
  // ==================================================

  async daftarDepartemen() {
    return this.prisma.departemen.findMany({
      include: {
        adminAkun: { select: { id: true, name: true, email: true } },
        _count: { select: { karyawan: true } },
      },
      orderBy: { namaDepartemen: 'asc' },
    });
  }

  async buatDepartemen(dto: BuatDepartemenDto) {
    const nama = dto.namaDepartemen.trim();

    const duplikat = await this.prisma.departemen.findUnique({
      where: { namaDepartemen: nama },
    });

    if (duplikat) {
      throw new BadRequestException('Nama departemen sudah terdaftar');
    }

    return this.prisma.departemen.create({
      data: {
        namaDepartemen: nama,
        adminAkunId: dto.adminAkunId ?? null,
        aktif: dto.aktif ?? true,
      },
    });
  }

  async ubahDepartemen(id: number, dto: UbahDepartemenDto) {
    await this.cariDepartemen(id);

    return this.prisma.departemen.update({
      where: { id },
      data: {
        ...(dto.namaDepartemen !== undefined
          ? { namaDepartemen: dto.namaDepartemen.trim() }
          : {}),
        ...(dto.adminAkunId !== undefined
          ? { adminAkunId: dto.adminAkunId }
          : {}),
        ...(dto.aktif !== undefined ? { aktif: dto.aktif } : {}),
      },
    });
  }

  async hapusDepartemen(id: number) {
    const departemen = await this.prisma.departemen.findUnique({
      where: { id },
      include: { _count: { select: { karyawan: true } } },
    });

    if (!departemen) {
      throw new NotFoundException('Departemen tidak ditemukan');
    }

    if (departemen._count.karyawan > 0) {
      throw new BadRequestException(
        'Departemen masih memiliki karyawan dan tidak dapat dihapus',
      );
    }

    await this.prisma.departemen.delete({ where: { id } });

    return { message: 'Departemen berhasil dihapus' };
  }

  private async cariDepartemen(id: number) {
    const departemen = await this.prisma.departemen.findUnique({
      where: { id },
    });

    if (!departemen) {
      throw new NotFoundException('Departemen tidak ditemukan');
    }

    return departemen;
  }

  // ==================================================
  // KARYAWAN
  // ==================================================

  /**
   * `halaman` opsional: kalau tidak dikirim, kembalikan array biasa (dipakai
   * halaman Data Karyawan & Reminder MCU yang butuh SELURUH baris untuk
   * menghitung jumlah jatuh tempo & filter di sisi client). Kalau `halaman`
   * dikirim, kembalikan bentuk { data, total, halaman, ukuranHalaman }
   * (dipakai halaman Database Karyawan yang murni menampilkan daftar).
   */
  async daftarKaryawan(filter: {
    departemenId?: number;
    statusKerja?: StatusKerja;
    cari?: string;
    halaman?: number;
    ukuranHalaman?: number;
  }) {
    const where = {
      ...(filter.departemenId ? { departemenId: filter.departemenId } : {}),
      ...(filter.statusKerja ? { statusKerja: filter.statusKerja } : {}),
      ...(filter.cari
        ? {
            OR: [
              { nama: { contains: filter.cari, mode: 'insensitive' as const } },
              { nik: { contains: filter.cari, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };
    const orderBy = [{ departemenId: 'asc' as const }, { nama: 'asc' as const }];

    if (filter.halaman) {
      const param = paramHalaman(filter.halaman, filter.ukuranHalaman);
      const [daftar, total] = await Promise.all([
        this.prisma.karyawan.findMany({
          where,
          include: KARYAWAN_INCLUDE,
          orderBy,
          skip: param.skip,
          take: param.take,
        }),
        this.prisma.karyawan.count({ where }),
      ]);

      return hasilHalaman(
        daftar.map((karyawan) => this.lengkapiStatusMcu(karyawan)),
        total,
        param,
      );
    }

    const daftar = await this.prisma.karyawan.findMany({
      where,
      include: KARYAWAN_INCLUDE,
      orderBy,
    });

    return daftar.map((karyawan) => this.lengkapiStatusMcu(karyawan));
  }

  async detailKaryawan(id: number) {
    const karyawan = await this.prisma.karyawan.findUnique({
      where: { id },
      include: KARYAWAN_INCLUDE,
    });

    if (!karyawan) {
      throw new NotFoundException('Karyawan tidak ditemukan');
    }

    return this.lengkapiStatusMcu(karyawan);
  }

  /** Cek nomor telepon karyawan terdaftar WhatsApp atau tidak lewat Fonnte /validate. */
  async cekStatusWa(id: number) {
    const karyawan = await this.prisma.karyawan.findUnique({ where: { id } });

    if (!karyawan) {
      throw new NotFoundException('Karyawan tidak ditemukan');
    }

    if (!karyawan.noTelepon?.trim()) {
      throw new BadRequestException('Karyawan ini belum punya nomor telepon');
    }

    // Tidak bisa dipastikan (nomor salah format, device Fonnte bermasalah, dll)
    // dianggap tidak terdaftar — supaya hasilnya selalu tegas: ada WA atau tidak.
    const terdaftar = (await this.whatsapp.validasiTerdaftar(karyawan.noTelepon)) ?? false;

    return this.prisma.karyawan.update({
      where: { id },
      data: { waTerdaftar: terdaftar, waDicekPada: new Date() },
      select: { id: true, waTerdaftar: true, waDicekPada: true },
    });
  }

  async buatKaryawan(dto: BuatKaryawanDto) {
    await this.cariDepartemen(dto.departemenId);

    const nik = dto.nik.trim();

    const duplikat = await this.prisma.karyawan.findUnique({ where: { nik } });

    if (duplikat) {
      throw new BadRequestException(`NIK ${nik} sudah terdaftar`);
    }

    const tanggalMcuExpired = dto.tanggalMcuExpired
      ? tanggalSaja(dto.tanggalMcuExpired)
      : null;

    // Setiap karyawan baru langsung memiliki akun portal dengan akses dasar
    // MCU dan Deklarasi Dinas. NIK dipakai sebagai username sekaligus
    // password awal agar akun dapat langsung dipakai dan kemudian diganti.
    const aksesDasar = ['HC_MCU', 'HC_DEKLARASI'];
    let akunId = dto.akunId ?? null;
    const userModel = (this.prisma as PrismaService & { user?: PrismaService['user'] }).user;
    if (!akunId && userModel) {
      const akunLama = await userModel.findFirst({
        where: { OR: [{ nrp: nik }, { username: nik }] },
        select: { id: true, accessKeys: true },
      });
      if (akunLama) {
        akunId = akunLama.id;
        await userModel.update({
          where: { id: akunLama.id },
          data: { accessKeys: Array.from(new Set([...akunLama.accessKeys, ...aksesDasar])) },
        });
      } else {
        const passwordHash = await bcrypt.hash(nik, 12);
        const akunBaru = await userModel.create({
          data: {
            name: dto.nama.trim(),
            username: nik,
            nrp: nik,
            passwordHash,
            role: UserRole.KARYAWAN,
            accessKeys: aksesDasar,
            email: dto.email?.trim() || null,
            phoneNumber: dto.noTelepon?.trim() || null,
            jabatan: dto.jabatan?.trim() || null,
          },
          select: { id: true },
        });
        akunId = akunBaru.id;
      }
    }

    return this.prisma.karyawan.create({
      data: {
        nik,
        nama: dto.nama.trim(),
        gender: dto.gender ?? null,
        departemenId: dto.departemenId,
        jabatan: dto.jabatan?.trim() || null,
        email: dto.email?.trim() || null,
        noTelepon: dto.noTelepon?.trim() || null,
        tanggalLahir: dto.tanggalLahir ? tanggalSaja(dto.tanggalLahir) : null,
        tanggalMcuTerakhir: dto.tanggalMcuTerakhir
          ? tanggalSaja(dto.tanggalMcuTerakhir)
          : null,
        tanggalMcuExpired,
        tanggalMcuBerikutnya: tanggalMcuExpired
          ? kurangBulan(tanggalMcuExpired, BULAN_REMINDER_SEBELUM_EXPIRED)
          : null,
        statusKerja: dto.statusKerja ?? StatusKerja.AKTIF,
        statusKesehatanDirumahkan: dto.statusKesehatanDirumahkan ?? null,
        akunId,
      },
      include: KARYAWAN_INCLUDE,
    });
  }

  async ubahKaryawan(id: number, dto: UbahKaryawanDto) {
    const karyawan = await this.prisma.karyawan.findUnique({ where: { id } });

    if (!karyawan) {
      throw new NotFoundException('Karyawan tidak ditemukan');
    }

    if (dto.departemenId !== undefined) {
      await this.cariDepartemen(dto.departemenId);
    }

    if (dto.nik !== undefined && dto.nik.trim() !== karyawan.nik) {
      const duplikat = await this.prisma.karyawan.findUnique({
        where: { nik: dto.nik.trim() },
      });

      if (duplikat) {
        throw new BadRequestException(`NIK ${dto.nik} sudah terdaftar`);
      }
    }

    const tanggalMcuExpired =
      dto.tanggalMcuExpired !== undefined
        ? dto.tanggalMcuExpired
          ? tanggalSaja(dto.tanggalMcuExpired)
          : null
        : undefined;

    const hasil = await this.prisma.karyawan.update({
      where: { id },
      data: {
        ...(dto.nik !== undefined ? { nik: dto.nik.trim() } : {}),
        ...(dto.nama !== undefined ? { nama: dto.nama.trim() } : {}),
        ...(dto.gender !== undefined ? { gender: dto.gender } : {}),
        ...(dto.departemenId !== undefined
          ? { departemenId: dto.departemenId }
          : {}),
        ...(dto.jabatan !== undefined
          ? { jabatan: dto.jabatan?.trim() || null }
          : {}),
        ...(dto.email !== undefined
          ? { email: dto.email?.trim() || null }
          : {}),
        ...(dto.noTelepon !== undefined
          ? { noTelepon: dto.noTelepon?.trim() || null }
          : {}),
        ...(dto.tanggalLahir !== undefined
          ? {
              tanggalLahir: dto.tanggalLahir
                ? tanggalSaja(dto.tanggalLahir)
                : null,
            }
          : {}),
        ...(dto.tanggalMcuTerakhir !== undefined
          ? {
              tanggalMcuTerakhir: dto.tanggalMcuTerakhir
                ? tanggalSaja(dto.tanggalMcuTerakhir)
                : null,
            }
          : {}),
        ...(tanggalMcuExpired !== undefined
          ? {
              tanggalMcuExpired,
              tanggalMcuBerikutnya: tanggalMcuExpired
                ? kurangBulan(tanggalMcuExpired, BULAN_REMINDER_SEBELUM_EXPIRED)
                : null,
            }
          : {}),
        ...(dto.statusKerja !== undefined
          ? { statusKerja: dto.statusKerja }
          : {}),
        ...(dto.statusKesehatanDirumahkan !== undefined
          ? { statusKesehatanDirumahkan: dto.statusKesehatanDirumahkan }
          : {}),
        ...(dto.akunId !== undefined ? { akunId: dto.akunId } : {}),
      },
      include: KARYAWAN_INCLUDE,
    });

    if (dto.statusKerja !== undefined && karyawan.akunId) {
      await this.sinkronkanStatusAkun(karyawan.akunId, dto.statusKerja);
    }
    return hasil;
  }

  async hapusKaryawan(id: number) {
    const karyawan = await this.prisma.karyawan.findUnique({
      where: { id },
      include: { _count: { select: { jadwalMcu: true } } },
    });

    if (!karyawan) {
      throw new NotFoundException('Karyawan tidak ditemukan');
    }

    if (karyawan._count.jadwalMcu > 0) {
      throw new BadRequestException(
        'Karyawan sudah memiliki riwayat MCU dan tidak dapat dihapus',
      );
    }

    await this.prisma.karyawan.delete({ where: { id } });

    return { message: 'Karyawan berhasil dihapus' };
  }

  /**
   * Alur karyawan dirumahkan (Bagian 4.11):
   * FIT dari sakit (tahap 1) -> MCU lengkap -> FIT MCU (tahap 2) -> aktif.
   */
  async ubahStatusKerja(id: number, dto: UbahStatusKerjaDto) {
    const karyawan = await this.prisma.karyawan.findUnique({ where: { id } });

    if (!karyawan) {
      throw new NotFoundException('Karyawan tidak ditemukan');
    }

    if (
      dto.statusKerja === StatusKerja.DIRUMAHKAN &&
      !dto.statusKesehatanDirumahkan
    ) {
      throw new BadRequestException(
        'Status kesehatan wajib diisi untuk karyawan dirumahkan',
      );
    }

    if (
      dto.statusKerja === StatusKerja.AKTIF &&
      karyawan.statusKerja === StatusKerja.DIRUMAHKAN &&
      karyawan.statusKesehatanDirumahkan !== StatusKesehatanDirumahkan.FIT_SAKIT
    ) {
      throw new BadRequestException(
        'Karyawan dirumahkan harus FIT dari sakit (tahap 1) sebelum diaktifkan kembali',
      );
    }

    const hasil = await this.prisma.karyawan.update({
      where: { id },
      data: {
        statusKerja: dto.statusKerja,
        statusKesehatanDirumahkan:
          dto.statusKerja === StatusKerja.DIRUMAHKAN
            ? (dto.statusKesehatanDirumahkan ?? null)
            : null,
      },
      include: KARYAWAN_INCLUDE,
    });
    if (karyawan.akunId) {
      await this.sinkronkanStatusAkun(karyawan.akunId, dto.statusKerja);
    }
    return hasil;
  }

  private async sinkronkanStatusAkun(akunId: number, statusKerja: StatusKerja) {
    await this.prisma.user.update({
      where: { id: akunId },
      data: { isActive: statusKerja !== StatusKerja.RESIGN },
    });
  }

  // ==================================================
  // REMINDER H-3 BULAN (Bagian 4.1)
  // ==================================================

  /**
   * Karyawan yang sudah menyentuh tanggal_mcu_berikutnya dan belum punya
   * jadwal MCU berjalan. Karyawan dirumahkan/resign dikecualikan.
   */
  async karyawanJatuhTempo(hariKeDepan = 0) {
    const batas = tambahBulan(hariIni(), 0);
    batas.setUTCDate(batas.getUTCDate() + hariKeDepan);

    const daftar = await this.prisma.karyawan.findMany({
      where: {
        statusKerja: StatusKerja.AKTIF,
        tanggalMcuBerikutnya: { not: null, lte: batas },
        jadwalMcu: {
          none: {
            statusPendaftaran: { in: ['DRAFT', 'TERKUNCI'] },
          },
        },
      },
      include: KARYAWAN_INCLUDE,
      orderBy: { tanggalMcuBerikutnya: 'asc' },
    });

    return daftar.map((karyawan) => this.lengkapiStatusMcu(karyawan));
  }

  /**
   * Kirim reminder ke Admin Dept masing-masing karyawan, tembusan HC.
   * Dijalankan manual dari halaman HC atau oleh penjadwal harian.
   */
  async jalankanReminderJatuhTempo() {
    const daftar = await this.karyawanJatuhTempo();

    if (!daftar.length) {
      return { dikirim: 0, karyawan: 0 };
    }

    const tembusanHc = await this.notifikasi.penerimaPeran(UserRole.HC);
    let dikirim = 0;

    for (const karyawan of daftar) {
      const judul = `Reminder MCU periodik: ${karyawan.nama}`;
      const pesan =
        `MCU ${karyawan.nama} (NIK ${karyawan.nik}, ${karyawan.departemen.namaDepartemen}) ` +
        `akan expired pada ${formatTanggalIndonesia(karyawan.tanggalMcuExpired)}. ` +
        'Mohon Admin Dept menentukan tanggal pelaksanaan MCU dan klinik tujuan.';

      const target = [
        {
          penerimaId: karyawan.departemen.adminAkunId,
          penerimaEmail: karyawan.departemen.adminAkun?.email ?? null,
        },
        ...tembusanHc,
      ].filter((item) => item.penerimaId);

      const payload = target.flatMap((item) =>
        this.notifikasi.duaKanal({
          tipe: TipeNotifikasiMcu.REMINDER_H3_BULAN,
          refTabel: 'karyawan',
          refId: karyawan.id,
          judul,
          pesan,
          penerimaId: item.penerimaId,
          penerimaEmail: item.penerimaEmail,
        }),
      );

      await this.notifikasi.kirimBanyak(payload);
      dikirim += payload.length;

      await this.kirimWaReminderKaryawan(
        karyawan,
        `🩺 MCU Anda akan *expired* pada ${formatTanggalIndonesia(karyawan.tanggalMcuExpired)} (± ${BULAN_REMINDER_SEBELUM_EXPIRED} bulan lagi).\n\n` +
          'Mohon segera koordinasikan dengan Admin Departemen Anda untuk penjadwalan MCU berikutnya.',
      );
    }

    return { dikirim, karyawan: daftar.length };
  }

  // ==================================================
  // REMINDER SUSULAN SISA 1 BULAN (lebih mendesak, WA ke karyawan)
  // ==================================================

  /**
   * Karyawan yang MCU-nya tinggal <= 1 bulan lagi expired dan masih
   * belum juga terjadwal (H-3 bulan sudah lewat tanpa tindak lanjut).
   */
  async karyawanSisaSatuBulan() {
    const batas = tambahBulan(hariIni(), BULAN_REMINDER_KEDUA_SEBELUM_EXPIRED);

    const daftar = await this.prisma.karyawan.findMany({
      where: {
        statusKerja: StatusKerja.AKTIF,
        tanggalMcuExpired: { not: null, lte: batas },
        jadwalMcu: {
          none: {
            statusPendaftaran: { in: ['DRAFT', 'TERKUNCI'] },
          },
        },
      },
      include: KARYAWAN_INCLUDE,
      orderBy: { tanggalMcuExpired: 'asc' },
    });

    return daftar.map((karyawan) => this.lengkapiStatusMcu(karyawan));
  }

  /**
   * Reminder WA susulan langsung ke karyawan (bukan Admin Dept) — nadanya
   * lebih mendesak karena H-3 bulan sudah lewat tapi belum ada jadwal.
   * Dijalankan oleh penjadwal harian.
   */
  async jalankanReminderSisaSatuBulan() {
    const daftar = await this.karyawanSisaSatuBulan();
    let dikirim = 0;

    for (const karyawan of daftar) {
      const terkirim = await this.kirimWaReminderKaryawan(
        karyawan,
        `⚠️ MCU Anda akan *expired* pada ${formatTanggalIndonesia(karyawan.tanggalMcuExpired)} (tinggal ± ${BULAN_REMINDER_KEDUA_SEBELUM_EXPIRED} bulan lagi) dan *belum ada jadwal* yang terdaftar.\n\n` +
          'Mohon segera hubungi Admin Departemen Anda agar MCU segera dijadwalkan.',
      );

      if (terkirim) {
        dikirim += 1;
      }
    }

    return { dikirim, karyawan: daftar.length };
  }

  /** Kirim satu pesan WA reminder MCU ke karyawan yang bersangkutan (bukan Admin Dept). */
  private async kirimWaReminderKaryawan(
    karyawan: { nama: string; gender: GenderKaryawan | null; noTelepon: string | null },
    isiUtama: string,
  ): Promise<boolean> {
    if (!this.whatsapp.aktif || !karyawan.noTelepon) {
      return false;
    }

    const pesan =
      `Halo ${sapaanKaryawan(karyawan.gender)} *${karyawan.nama}* 👋\n\n` +
      `*Reminder MCU Periodik* Anda\n\n${isiUtama}\n\n` +
      'Terima kasih 🙏';

    // Pakai device WA GA (default) dulu - device HC masih paket terbatas.
    return this.whatsapp.kirim(karyawan.noTelepon, pesan);
  }

  /**
   * Set masa berlaku MCU baru setelah karyawan dinyatakan FIT,
   * sekaligus menghitung ulang pemicu siklus berikutnya.
   */
  async perbaruiMasaBerlaku(
    karyawanId: number,
    tanggalMcu: Date,
    tx?: Prisma.TransactionClient,
  ) {
    const klien = tx ?? this.prisma;
    const expired = tambahBulan(tanggalMcu, BULAN_MASA_BERLAKU_MCU);

    return klien.karyawan.update({
      where: { id: karyawanId },
      data: {
        tanggalMcuTerakhir: tanggalSaja(tanggalMcu),
        tanggalMcuExpired: expired,
        tanggalMcuBerikutnya: kurangBulan(
          expired,
          BULAN_REMINDER_SEBELUM_EXPIRED,
        ),
      },
    });
  }

  /** Tambahkan penanda jatuh tempo agar tabel di web mudah dibaca. */
  private lengkapiStatusMcu<
    T extends {
      tanggalMcuExpired: Date | null;
      tanggalMcuBerikutnya: Date | null;
      statusKerja: StatusKerja;
    },
  >(karyawan: T) {
    const acuan = hariIni();

    const sisaHariExpired = karyawan.tanggalMcuExpired
      ? selisihHari(acuan, karyawan.tanggalMcuExpired)
      : null;

    const sisaHariReminder = karyawan.tanggalMcuBerikutnya
      ? selisihHari(acuan, karyawan.tanggalMcuBerikutnya)
      : null;

    return {
      ...karyawan,
      sisaHariExpired,
      sisaHariReminder,
      sudahJatuhTempo:
        karyawan.statusKerja === StatusKerja.AKTIF &&
        sisaHariReminder !== null &&
        sisaHariReminder <= 0,
      mcuKedaluwarsa: sisaHariExpired !== null && sisaHariExpired < 0,
    };
  }
}
