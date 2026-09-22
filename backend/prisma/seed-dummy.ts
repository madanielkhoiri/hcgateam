// ==================================================
// FILE: backend/prisma/seed-dummy.ts
// FUNGSI: Data dummy lintas modul supaya semua dashboard & daftar
// terlihat terisi untuk keperluan presentasi. Hanya menambah data
// (tidak menghapus apa pun) - aman dijalankan di database yang sudah
// ada akun dari seed.ts (superadmin/admin/fa/karyawan/tamu/owner/
// vendor/driver/elektrik).
//
// Modul e-ProM sengaja hanya diisi Vendor/Tender/Kontrak - tabel
// Project/Engineer/Konstruksi/Meeting/Dokumen/Financial/Closing masih
// kosong tanpa UI aktif (lihat komentar schema.prisma bagian e-ProM).
//
// Jalankan: npx ts-node prisma/seed-dummy.ts
// ==================================================

import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import {
  PrismaClient,
  UserRole,
  InventoryScope,
  ItemCategory,
  ItemUnit,
  WorkOrderStatus,
  WorkOrderPriority,
  WorkOrderPic,
  StatusApprovalWorkOrder,
  DailyActivityType,
  DailyActivityStatus,
  DailyApprovalStatus,
  DailyApprovalDecision,
  JenisDeklarasi,
  StatusDeklarasi,
  KategoriNota,
  StatusVerifikasiNota,
  StatusDataDatabaseSettlement,
  StatusSaldo,
  StatusPengajuan,
  StatusKerja,
  JenisMcu,
  StatusPendaftaran,
  StatusSuratPengantar,
  StatusReview,
  StatusRekomendasi,
  StatusFollowUp,
  TipePengunggah,
  StatusInduksiUlang,
  TipeNotifikasiMcu,
  KanalNotifikasi,
  StatusKirimNotifikasi,
  StatusTiketHelpdesk,
  StatusSuratTugas,
  StatusAnakMagang,
  StatusLegalitasVendor,
  StatusTender,
  JenisTiket,
  StatusTravel,
  LokasiHousekeepingIndoor,
  StatusChecklistKip,
  KategoriDokumenIr,
  TipeAspirasiPertanyaan,
  TipePostingan,
  ScopeDrive,
  DivisiPengaduan,
  LokasiPengaduan,
  StatusPengaduan,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { ALL_ACCESS_KEYS } from '../src/access/access.constants';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL tidak ditemukan di file backend/.env');
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

// ==================================================
// HELPERS
// ==================================================

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickN<T>(arr: readonly T[], n: number): T[] {
  const copy = [...arr];
  const out: T[] = [];
  for (let i = 0; i < n && copy.length > 0; i++) {
    const idx = Math.floor(Math.random() * copy.length);
    out.push(copy.splice(idx, 1)[0]);
  }
  return out;
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function chance(probability: number): boolean {
  return Math.random() < probability;
}

const SEKARANG = new Date();
const TAHUN_INI = SEKARANG.getUTCFullYear();
const BULAN_INI = SEKARANG.getUTCMonth(); // 0-11

function utcDate(y: number, m1to12: number, d: number, h = 0, mi = 0): Date {
  return new Date(Date.UTC(y, m1to12 - 1, d, h, mi));
}

/** Tanggal acak antara awal tahun ini s.d. hari ini (untuk data "tahun berjalan"). */
function tanggalDalamTahunBerjalan(): Date {
  const bulan = randInt(0, BULAN_INI);
  const maksTanggal = bulan === BULAN_INI ? SEKARANG.getUTCDate() : 28;
  const tanggal = randInt(1, maksTanggal);
  return utcDate(TAHUN_INI, bulan + 1, tanggal, randInt(7, 17), randInt(0, 59));
}

/** Tanggal acak N hari ke depan dari hari ini (untuk jadwal mendatang). */
function tanggalMendatang(maksHari: number): Date {
  const d = new Date(SEKARANG);
  d.setUTCDate(d.getUTCDate() + randInt(1, maksHari));
  return d;
}

/** Tanggal acak N hari ke belakang dari hari ini. */
function tanggalLalu(maksHari: number): Date {
  const d = new Date(SEKARANG);
  d.setUTCDate(d.getUTCDate() - randInt(0, maksHari));
  return d;
}

function tambahHari(base: Date, hari: number): Date {
  const d = new Date(base);
  d.setUTCDate(d.getUTCDate() + hari);
  return d;
}

let urutGlobal = 1000;
function nomorUrutBerikutnya(): number {
  urutGlobal += 1;
  return urutGlobal;
}

const NAMA_DEPAN = [
  'Ahmad', 'Budi', 'Citra', 'Dewi', 'Eko', 'Fajar', 'Gita', 'Hendra', 'Indah',
  'Joko', 'Kartika', 'Lukman', 'Maya', 'Nanda', 'Oscar', 'Putri', 'Rian',
  'Sari', 'Taufik', 'Umar', 'Vina', 'Wahyu', 'Yanto', 'Zainal', 'Agus',
  'Bayu', 'Cahyo', 'Dian', 'Edi', 'Farah', 'Galih', 'Hana', 'Irfan', 'Julia',
  'Krisna', 'Lina', 'Made', 'Nita', 'Oki', 'Prasetyo', 'Qori', 'Rina', 'Siti',
  'Tio', 'Utami', 'Vera', 'Wulan', 'Yusuf', 'Zahra', 'Rahmat', 'Dedi',
  'Sinta', 'Bagus', 'Ira', 'Ferry', 'Novi', 'Anton', 'Dwi', 'Rudi', 'Ayu',
];

const NAMA_BELAKANG = [
  'Santoso', 'Wijaya', 'Kurniawan', 'Saputra', 'Pratama', 'Wibowo',
  'Setiawan', 'Hidayat', 'Gunawan', 'Nugroho', 'Susanto', 'Firmansyah',
  'Ramadhan', 'Permata', 'Utomo', 'Handoko', 'Kusuma', 'Halim', 'Suryadi',
  'Maulana', 'Rahmadi', 'Yulianto', 'Iskandar', 'Wahyudi', 'Purnomo',
  'Lestari', 'Anggraini', 'Puspita', 'Wardhana', 'Simanjuntak',
];

function namaAcak(): string {
  return `${pick(NAMA_DEPAN)} ${pick(NAMA_BELAKANG)}`;
}

const DEPARTEMEN_LIST = [
  'Human Capital',
  'General Affair',
  'Civil Infrastructure',
  'Administrasi',
  'Finance & Accounting',
  'Produksi Tambang',
  'HSE & Safety',
  'IT & Sistem Informasi',
];

const JABATAN_LIST = [
  'Staff', 'Supervisor', 'Foreman', 'Operator', 'Admin', 'Koordinator',
  'Teknisi', 'Mekanik', 'Security', 'Analis',
];

const LOKASI_TAMBANG = [
  'Site Tambang Blok A', 'Site Tambang Blok B', 'Site Tambang Blok C',
  'Port Stockpile', 'Workshop Utama', 'Mess Karyawan',
];

async function upsertUser(params: {
  username: string;
  name: string;
  role: UserRole;
  passwordHash: string;
  accessKeys?: string[];
  vendorId?: number;
  driverId?: number;
}) {
  return prisma.user.upsert({
    where: { username: params.username },
    update: {
      role: params.role,
      isActive: true,
      accessKeys: params.accessKeys ?? [],
      passwordHash: params.passwordHash,
    },
    create: {
      name: params.name,
      username: params.username,
      passwordHash: params.passwordHash,
      role: params.role,
      isActive: true,
      accessKeys: params.accessKeys ?? [],
      vendorId: params.vendorId,
      driverId: params.driverId,
    },
  });
}

async function main(): Promise<void> {
  const passwordHash = await bcrypt.hash('password123', 12);

  console.log('== 1/16: Akun aktor tambahan ==');

  const [superadmin, admin, fa, karyawanLogin, elektrik] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { username: 'superadmin' } }),
    prisma.user.findUniqueOrThrow({ where: { username: 'admin' } }),
    prisma.user.findUniqueOrThrow({ where: { username: 'fa' } }),
    prisma.user.findUniqueOrThrow({ where: { username: 'karyawan' } }),
    prisma.user.findUniqueOrThrow({ where: { username: 'elektrik' } }),
  ]);

  const hcUser = await upsertUser({
    username: 'hc_demo', name: 'Ratna Dewi Lestari', role: UserRole.HC,
    passwordHash, accessKeys: ALL_ACCESS_KEYS,
  });
  const dokterUser = await upsertUser({
    username: 'dokter_demo', name: 'dr. Amir Wicaksono', role: UserRole.DOKTER,
    passwordHash, accessKeys: ALL_ACCESS_KEYS,
  });
  const sheUser = await upsertUser({
    username: 'she_demo', name: 'Bambang Setiawan', role: UserRole.SHE,
    passwordHash, accessKeys: ALL_ACCESS_KEYS,
  });
  const admDeptUser = await upsertUser({
    username: 'admindept_demo', name: 'Andi Wijaya Kusuma', role: UserRole.ADMIN_DEPT,
    passwordHash, accessKeys: ALL_ACCESS_KEYS,
  });
  const admCombenUser = await upsertUser({
    username: 'admcomben_demo', name: 'Rina Kartika Sari', role: UserRole.ADMIN_COMBEN,
    passwordHash, accessKeys: ALL_ACCESS_KEYS,
  });
  const shUser = await upsertUser({
    username: 'sh_demo', name: 'Joko Prasetyo', role: UserRole.SECTION_HEAD,
    passwordHash, accessKeys: ALL_ACCESS_KEYS,
  });
  const pjoUser = await upsertUser({
    username: 'pjo_demo', name: 'Hendra Gunawan', role: UserRole.PJO,
    passwordHash, accessKeys: ALL_ACCESS_KEYS,
  });
  const glUser = await upsertUser({
    username: 'gl_demo', name: 'Made Sudiarta', role: UserRole.GRUP_LEADER,
    passwordHash, accessKeys: ALL_ACCESS_KEYS,
  });
  const korlapUser = await upsertUser({
    username: 'korlap_demo', name: 'Agus Setiawan Putra', role: UserRole.KORLAP,
    passwordHash, accessKeys: ALL_ACCESS_KEYS,
  });

  // Pool user generik (tanpa username/login) untuk pengirim/uploader di
  // modul yang butuh relasi ke User (bukan Karyawan).
  const poolUsers: { id: number }[] = [];
  for (let i = 0; i < 25; i++) {
    const u = await prisma.user.create({
      data: {
        name: namaAcak(),
        passwordHash,
        role: UserRole.KARYAWAN,
        isActive: true,
        accessKeys: ['HC', 'GA', 'CIVIL'],
      },
      select: { id: true },
    });
    poolUsers.push(u);
  }

  const semuaAktor = [
    superadmin, admin, fa, karyawanLogin, elektrik, hcUser, dokterUser,
    sheUser, admDeptUser, admCombenUser, shUser, pjoUser, glUser, korlapUser,
    ...poolUsers,
  ];

  function aktorAcak(): number {
    return pick(semuaAktor).id;
  }

  // ==================================================
  // 2. DEPARTEMEN + KARYAWAN + KLINIK
  // ==================================================
  console.log('== 2/16: Departemen, Karyawan, Klinik ==');

  const departemenRows: { id: number; namaDepartemen: string }[] = [];
  for (const nama of DEPARTEMEN_LIST) {
    const d = await prisma.departemen.upsert({
      where: { namaDepartemen: nama },
      update: {},
      create: { namaDepartemen: nama },
    });
    departemenRows.push(d);
  }

  const klinikRows = await Promise.all([
    prisma.klinik.create({ data: { namaKlinik: 'Klinik Sehat Sentosa', alamat: 'Jl. Tambang Raya No. 12', picKlinik: 'Ns. Wulan Setiawati', terkoneksi: true, statusAktif: true } }),
    prisma.klinik.create({ data: { namaKlinik: 'RSUD Kabupaten', alamat: 'Jl. Poros Kabupaten No. 1', picKlinik: 'dr. Farah Amelia', terkoneksi: false, statusAktif: true } }),
    prisma.klinik.create({ data: { namaKlinik: 'Klinik Medika Prima', alamat: 'Jl. Site Tambang KM 5', picKlinik: 'Ns. Oki Pratama', terkoneksi: true, statusAktif: true } }),
    prisma.klinik.create({ data: { namaKlinik: 'Klinik Bina Husada', alamat: 'Jl. Pelabuhan No. 8', picKlinik: 'dr. Galih Nugroho', terkoneksi: false, statusAktif: true } }),
  ]);

  const karyawanRows: { id: number; nama: string; departemenId: number }[] = [];
  let nikCounter = 30000001;
  for (let i = 0; i < 70; i++) {
    const departemen = pick(departemenRows);
    const statusKerja = chance(0.9) ? StatusKerja.AKTIF : chance(0.6) ? StatusKerja.DIRUMAHKAN : StatusKerja.RESIGN;

    // Sebagian karyawan MCU-nya sudah lewat jatuh tempo (reminder), sebagian akan datang.
    const mcuTerakhir = tanggalLalu(500);
    const mcuExpired = tambahHari(mcuTerakhir, 365);
    const mcuBerikutnya = tambahHari(mcuExpired, -90);

    const k = await prisma.karyawan.create({
      data: {
        nik: String(nikCounter++),
        nama: namaAcak(),
        departemenId: departemen.id,
        jabatan: pick(JABATAN_LIST),
        email: null,
        noTelepon: `08${randInt(1000000000, 9999999999)}`.slice(0, 12),
        tanggalMcuTerakhir: mcuTerakhir,
        tanggalMcuExpired: mcuExpired,
        tanggalMcuBerikutnya: mcuBerikutnya,
        statusKerja,
        statusKesehatanDirumahkan: statusKerja === StatusKerja.DIRUMAHKAN ? pick(['SAKIT', 'FIT_SAKIT'] as const) : null,
        waTerdaftar: chance(0.8),
        waDicekPada: chance(0.8) ? tanggalLalu(60) : null,
      },
      select: { id: true, nama: true, departemenId: true },
    });
    karyawanRows.push(k);
  }

  // Hubungkan akun login "karyawan" ke satu profil karyawan biar demo login terasa nyata.
  const departemenHc = departemenRows.find((d) => d.namaDepartemen === 'Human Capital')!;
  const karyawanDemo = await prisma.karyawan.create({
    data: {
      nik: '12345678',
      nama: 'Karyawan Biasa',
      departemenId: departemenHc.id,
      jabatan: 'Staff HC',
      akunId: karyawanLogin.id,
      tanggalMcuTerakhir: tanggalLalu(200),
      tanggalMcuExpired: tambahHari(SEKARANG, 165),
      tanggalMcuBerikutnya: tambahHari(SEKARANG, 75),
      statusKerja: StatusKerja.AKTIF,
      waTerdaftar: true,
    },
  });
  karyawanRows.push({ id: karyawanDemo.id, nama: karyawanDemo.nama, departemenId: karyawanDemo.departemenId });

  // ==================================================
  // 3. MCU PERIODIK (alur lengkap)
  // ==================================================
  console.log('== 3/16: MCU Periodik ==');

  const jadwalDibuat: { id: number; karyawanId: number; departemenId: number; tanggalMcu: Date; status: StatusPendaftaran }[] = [];

  for (let i = 0; i < 95; i++) {
    const karyawan = pick(karyawanRows);
    const rNilai = Math.random();
    let statusPendaftaran: StatusPendaftaran;
    let tanggalMcu: Date;

    if (rNilai < 0.6) {
      statusPendaftaran = StatusPendaftaran.SELESAI;
      tanggalMcu = tanggalLalu(260);
    } else if (rNilai < 0.78) {
      statusPendaftaran = StatusPendaftaran.TERKUNCI;
      tanggalMcu = tanggalMendatang(20);
    } else if (rNilai < 0.93) {
      statusPendaftaran = StatusPendaftaran.DRAFT;
      tanggalMcu = tanggalMendatang(45);
    } else {
      statusPendaftaran = StatusPendaftaran.DIBATALKAN;
      tanggalMcu = tanggalLalu(120);
    }

    const klinik = chance(0.85) ? pick(klinikRows) : null;
    const jenisMcu = chance(0.7) ? JenisMcu.BERKALA : chance(0.5) ? JenisMcu.AWAL : JenisMcu.KHUSUS;

    const jadwal = await prisma.jadwalMcu.create({
      data: {
        karyawanId: karyawan.id,
        departemenId: karyawan.departemenId,
        tanggalMcu,
        jenisMcu,
        jenisPemeriksaan: 'MCU Standar (Fisik, Lab Darah, Rontgen)',
        klinikId: klinik?.id,
        statusPendaftaran,
        tanggalLock: tambahHari(tanggalMcu, -3),
        dibuatOlehId: hcUser.id,
        createdAt: tambahHari(tanggalMcu, -randInt(10, 30)),
      },
      select: { id: true, karyawanId: true, departemenId: true, tanggalMcu: true, statusPendaftaran: true },
    });
    jadwalDibuat.push({ id: jadwal.id, karyawanId: jadwal.karyawanId, departemenId: jadwal.departemenId, tanggalMcu: jadwal.tanggalMcu, status: jadwal.statusPendaftaran });
  }

  // Surat pengantar - batch beberapa jadwal (TERKUNCI/SELESAI) ke klinik yang sama.
  const jadwalButuhSurat = jadwalDibuat.filter((j) => j.status === StatusPendaftaran.TERKUNCI || j.status === StatusPendaftaran.SELESAI);
  let noSuratUrut = 1;
  for (let i = 0; i < jadwalButuhSurat.length; i += 4) {
    const batch = jadwalButuhSurat.slice(i, i + 4);
    if (batch.length === 0) continue;

    const statusSurat = chance(0.85) ? StatusSuratPengantar.TERKIRIM : StatusSuratPengantar.DRAFT;
    const tanggalTerbit = tambahHari(batch[0].tanggalMcu, -5);
    const surat = await prisma.suratPengantar.create({
      data: {
        nomorSurat: `PPA-ADR-F-HCGA/${TAHUN_INI}/${String(noSuratUrut).padStart(4, '0')}`,
        nomorUrut: noSuratUrut,
        tahunTerbit: TAHUN_INI,
        klinikId: pick(klinikRows).id,
        tanggalTerbit,
        status: statusSurat,
        tanggalKirim: statusSurat === StatusSuratPengantar.TERKIRIM ? tambahHari(tanggalTerbit, 1) : null,
        diterbitkanId: hcUser.id,
        createdAt: tanggalTerbit,
      },
    });
    noSuratUrut += 1;

    await prisma.jadwalMcu.updateMany({
      where: { id: { in: batch.map((b) => b.id) } },
      data: { suratPengantarId: surat.id },
    });
  }

  // Hasil MCU + Rekomendasi + Follow Up + Induksi Ulang untuk jadwal SELESAI.
  const jadwalSelesai = jadwalDibuat.filter((j) => j.status === StatusPendaftaran.SELESAI);
  const notifikasiBuffer: {
    tipe: TipeNotifikasiMcu; refTabel: string; refId: number; penerimaId: number | null;
    judul: string; pesan: string; kanal: KanalNotifikasi; statusKirim: StatusKirimNotifikasi;
    waktuKirim: Date | null; createdAt: Date;
  }[] = [];

  for (const jadwal of jadwalSelesai) {
    const tanggalUpload = tambahHari(jadwal.tanggalMcu, randInt(1, 4));
    const statusReviewHasil = chance(0.9) ? StatusReview.SELESAI : chance(0.5) ? StatusReview.DIREVIEW : StatusReview.MENUNGGU;

    const hasil = await prisma.hasilMcu.create({
      data: {
        jadwalMcuId: jadwal.id,
        tanggalUpload,
        diunggahOlehId: chance(0.5) ? hcUser.id : dokterUser.id,
        tipePengunggah: chance(0.5) ? TipePengunggah.KLINIK_TERKONEKSI : TipePengunggah.HC,
        fileHasilMcu: `hasil-mcu-${jadwal.id}.pdf`,
        namaFileAsli: `Hasil MCU ${jadwal.id}.pdf`,
        statusReview: statusReviewHasil,
        retensiHapusAt: tambahHari(tanggalUpload, 180),
        createdAt: tanggalUpload,
      },
    });

    if (statusReviewHasil !== StatusReview.SELESAI) continue;

    const isFollowUp = chance(0.25);
    const tanggalSubmitRekom = tambahHari(tanggalUpload, randInt(1, 3));
    const diteruskan = chance(0.85);

    const rekom1 = await prisma.rekomendasiMcu.create({
      data: {
        hasilMcuId: hasil.id,
        dokterId: dokterUser.id,
        status: isFollowUp ? StatusRekomendasi.FOLLOW_UP : StatusRekomendasi.FIT,
        catatanMedisTerbatas: isFollowUp ? 'Perlu pemeriksaan lanjutan (kolesterol/gula darah tinggi).' : 'Hasil pemeriksaan normal, dinyatakan FIT bekerja.',
        filePdfRekomendasi: `rekomendasi-${jadwal.id}-1.pdf`,
        siklusKe: 1,
        tanggalSubmit: tanggalSubmitRekom,
        diteruskanKeDeptAt: diteruskan ? tambahHari(tanggalSubmitRekom, 1) : null,
        diteruskanKeKaryawanAt: diteruskan ? tambahHari(tanggalSubmitRekom, 1) : null,
        diteruskanOlehId: diteruskan ? hcUser.id : null,
        retensiHapusAt: tambahHari(tanggalSubmitRekom, 180),
        createdAt: tanggalSubmitRekom,
      },
    });

    notifikasiBuffer.push({
      tipe: TipeNotifikasiMcu.REKOMENDASI_FIT_FU, refTabel: 'rekomendasi_mcu', refId: rekom1.id,
      penerimaId: karyawanRows.find((k) => k.id === jadwal.karyawanId)?.id ? hcUser.id : null,
      judul: isFollowUp ? 'Rekomendasi Follow Up MCU' : 'Rekomendasi MCU: FIT',
      pesan: isFollowUp ? 'Karyawan memerlukan Follow Up MCU lanjutan.' : 'Karyawan dinyatakan FIT bekerja.',
      kanal: chance(0.6) ? KanalNotifikasi.EMAIL_OUTLOOK : KanalNotifikasi.IN_APP,
      statusKirim: StatusKirimNotifikasi.TERKIRIM,
      waktuKirim: tambahHari(tanggalSubmitRekom, 0),
      createdAt: tanggalSubmitRekom,
    });

    if (!isFollowUp) {
      // 30% dari yang langsung FIT tetap dapat induksi ulang (mis. selesai masa dirumahkan).
      if (chance(0.15)) {
        await prisma.induksiUlang.create({
          data: {
            karyawanId: jadwal.karyawanId,
            rekomendasiPemicId: rekom1.id,
            departemenId: jadwal.departemenId,
            tanggalDaftar: tambahHari(tanggalSubmitRekom, 2),
            tanggalPelaksanaan: chance(0.7) ? tambahHari(tanggalSubmitRekom, randInt(5, 15)) : null,
            status: chance(0.7) ? StatusInduksiUlang.SELESAI : chance(0.5) ? StatusInduksiUlang.TERJADWAL : StatusInduksiUlang.MENUNGGU,
            sheId: sheUser.id,
            selesaiAt: chance(0.7) ? tambahHari(tanggalSubmitRekom, randInt(6, 16)) : null,
            createdAt: tambahHari(tanggalSubmitRekom, 2),
          },
        });
      }
      continue;
    }

    // --- Follow Up cycle ---
    const batasWaktu = tambahHari(tanggalSubmitRekom, 60);
    const statusFu = pick([
      StatusFollowUp.MENUNGGU_TANGGAL, StatusFollowUp.TERJADWAL, StatusFollowUp.TERLAKSANA,
      StatusFollowUp.SELESAI, StatusFollowUp.SELESAI, StatusFollowUp.TERLAMBAT_RESCHEDULE,
    ] as const);
    const tanggalPilihan = statusFu === StatusFollowUp.MENUNGGU_TANGGAL ? null : tambahHari(tanggalSubmitRekom, randInt(5, 20));

    const followUp = await prisma.followUp.create({
      data: {
        rekomendasiId: rekom1.id,
        karyawanId: jadwal.karyawanId,
        batasWaktuFu: batasWaktu,
        ditetapkanOlehHcId: hcUser.id,
        ditetapkanAt: tambahHari(tanggalSubmitRekom, 1),
        tanggalPilihanKaryawan: tanggalPilihan,
        klinikId: pick(klinikRows).id,
        status: statusFu,
        jumlahReminderHc: randInt(0, 3),
        reminderTerakhirAt: chance(0.5) ? tambahHari(tanggalSubmitRekom, 10) : null,
        siklusKe: 1,
        ditutupAt: statusFu === StatusFollowUp.SELESAI ? tambahHari(tanggalSubmitRekom, randInt(25, 55)) : null,
        createdAt: tanggalSubmitRekom,
      },
    });

    if (statusFu !== StatusFollowUp.SELESAI) continue;

    const tanggalSubmitHasilFu = tambahHari(tanggalPilihan ?? tanggalSubmitRekom, randInt(1, 3));
    const hasilFu = await prisma.hasilFollowUp.create({
      data: {
        followUpId: followUp.id,
        tanggalSubmit: tanggalSubmitHasilFu,
        diunggahOlehId: dokterUser.id,
        tipePengunggah: TipePengunggah.KLINIK_TERKONEKSI,
        fileHasilFu: `hasil-fu-${followUp.id}.pdf`,
        namaFileAsli: `Hasil Follow Up ${followUp.id}.pdf`,
        statusReview: StatusReview.SELESAI,
        retensiHapusAt: tambahHari(tanggalSubmitHasilFu, 180),
        createdAt: tanggalSubmitHasilFu,
      },
    });

    // Siklus ke-2: hampir selalu berujung FIT.
    const rekom2Fit = chance(0.85);
    const tanggalSubmitRekom2 = tambahHari(tanggalSubmitHasilFu, randInt(1, 3));
    const rekom2 = await prisma.rekomendasiMcu.create({
      data: {
        hasilMcuId: hasil.id,
        hasilFollowUpAsalId: hasilFu.id,
        dokterId: dokterUser.id,
        status: rekom2Fit ? StatusRekomendasi.FIT : StatusRekomendasi.FOLLOW_UP,
        catatanMedisTerbatas: rekom2Fit ? 'Hasil Follow Up membaik, dinyatakan FIT bekerja.' : 'Masih memerlukan Follow Up siklus berikutnya.',
        filePdfRekomendasi: `rekomendasi-${jadwal.id}-2.pdf`,
        siklusKe: 2,
        tanggalSubmit: tanggalSubmitRekom2,
        diteruskanKeDeptAt: tambahHari(tanggalSubmitRekom2, 1),
        diteruskanKeKaryawanAt: tambahHari(tanggalSubmitRekom2, 1),
        diteruskanOlehId: hcUser.id,
        retensiHapusAt: tambahHari(tanggalSubmitRekom2, 180),
        createdAt: tanggalSubmitRekom2,
      },
    });

    if (rekom2Fit && chance(0.4)) {
      await prisma.induksiUlang.create({
        data: {
          karyawanId: jadwal.karyawanId,
          rekomendasiPemicId: rekom2.id,
          departemenId: jadwal.departemenId,
          tanggalDaftar: tambahHari(tanggalSubmitRekom2, 2),
          tanggalPelaksanaan: tambahHari(tanggalSubmitRekom2, randInt(5, 15)),
          status: chance(0.6) ? StatusInduksiUlang.SELESAI : StatusInduksiUlang.TERJADWAL,
          sheId: sheUser.id,
          selesaiAt: chance(0.6) ? tambahHari(tanggalSubmitRekom2, randInt(6, 16)) : null,
          createdAt: tambahHari(tanggalSubmitRekom2, 2),
        },
      });
    }
  }

  if (notifikasiBuffer.length > 0) {
    await prisma.logNotifikasiMcu.createMany({
      data: notifikasiBuffer.map((n) => ({ ...n, pesan: n.pesan })),
    });
  }
  // Tambahan notifikasi reminder H-3 bulan generik.
  await prisma.logNotifikasiMcu.createMany({
    data: Array.from({ length: 25 }, () => {
      const createdAt = tanggalDalamTahunBerjalan();
      return {
        tipe: TipeNotifikasiMcu.REMINDER_H3_BULAN,
        refTabel: 'karyawan',
        refId: pick(karyawanRows).id,
        penerimaId: hcUser.id,
        judul: 'Reminder MCU H-3 Bulan',
        pesan: 'Karyawan mendekati jadwal MCU berikutnya.',
        kanal: chance(0.5) ? KanalNotifikasi.EMAIL_OUTLOOK : KanalNotifikasi.IN_APP,
        statusKirim: StatusKirimNotifikasi.TERKIRIM,
        waktuKirim: createdAt,
        createdAt,
      };
    }),
  });

  console.log('== 4/16: Helpdesk Center ==');

  const KATEGORI_HELPDESK: { kategori: string; sub: string[] }[] = [
    { kategori: 'Payroll', sub: ['Slip Gaji', 'Potongan Tidak Sesuai', 'Lembur'] },
    { kategori: 'BPJS', sub: ['BPJS Kesehatan', 'BPJS Ketenagakerjaan'] },
    { kategori: 'Benefit', sub: ['Tunjangan Hari Raya', 'Asuransi Tambahan'] },
    { kategori: 'Cuti', sub: ['Sisa Cuti', 'Pengajuan Cuti Tahunan'] },
  ];
  let seqHelpdesk = 1;
  for (let i = 0; i < 42; i++) {
    const kat = pick(KATEGORI_HELPDESK);
    const status = chance(0.4) ? StatusTiketHelpdesk.SELESAI : chance(0.5) ? StatusTiketHelpdesk.DIPROSES : StatusTiketHelpdesk.TERBUKA;
    const dibuatPada = tanggalDalamTahunBerjalan();

    await prisma.tiketHelpdesk.create({
      data: {
        nomorTiket: `TCKT/${String(dibuatPada.getUTCMonth() + 1).padStart(2, '0')}/${TAHUN_INI}/${String(seqHelpdesk).padStart(5, '0')}`,
        sequenceNumber: seqHelpdesk,
        kategori: kat.kategori,
        subKategori: pick(kat.sub),
        deskripsi: `Pengajuan terkait ${pick(kat.sub)} yang memerlukan tindak lanjut tim Comben & Benefit.`,
        status,
        level: pick(['Normal', 'Prioritas']),
        catatanPenyelesaian: status === StatusTiketHelpdesk.SELESAI ? 'Sudah ditindaklanjuti dan dikonfirmasi ke pemohon.' : null,
        pembuatId: aktorAcak(),
        picId: status === StatusTiketHelpdesk.TERBUKA ? null : admCombenUser.id,
        dibuatPada,
        diprosesPada: status === StatusTiketHelpdesk.TERBUKA ? null : tambahHari(dibuatPada, 1),
        selesaiPada: status === StatusTiketHelpdesk.SELESAI ? tambahHari(dibuatPada, randInt(2, 7)) : null,
      },
    });
    seqHelpdesk += 1;
  }

  console.log('== 5/16: Surat Tugas Dinas ==');

  let seqTugasDinas = 1;
  for (let i = 0; i < 24; i++) {
    const status = pick([
      StatusSuratTugas.DISETUJUI, StatusSuratTugas.DISETUJUI, StatusSuratTugas.DISETUJUI,
      StatusSuratTugas.MENUNGGU_SH, StatusSuratTugas.MENUNGGU_PJO, StatusSuratTugas.DITOLAK,
    ] as const);
    const createdAt = tanggalDalamTahunBerjalan();
    const tanggalMulai = tambahHari(createdAt, randInt(3, 10));

    const surat = await prisma.suratTugasDinas.create({
      data: {
        nomor: `STD/${String(seqTugasDinas).padStart(3, '0')}/HCGA/${TAHUN_INI}`,
        tujuanLokasi: pick(['Jakarta', 'Balikpapan', 'Surabaya', 'Makassar', 'Kantor Pusat']),
        tanggalMulai,
        tanggalSelesai: tambahHari(tanggalMulai, randInt(1, 5)),
        keteranganTugas: 'Perjalanan dinas koordinasi operasional dan pelaporan ke kantor pusat.',
        status,
        dibuatOlehId: aktorAcak(),
        disetujuiShOlehId: status === StatusSuratTugas.MENUNGGU_SH ? null : shUser.id,
        disetujuiShPada: status === StatusSuratTugas.MENUNGGU_SH ? null : tambahHari(createdAt, 1),
        disetujuiPjoOlehId: (status === StatusSuratTugas.DISETUJUI) ? pjoUser.id : null,
        disetujuiPjoPada: status === StatusSuratTugas.DISETUJUI ? tambahHari(createdAt, 2) : null,
        alasanTolak: status === StatusSuratTugas.DITOLAK ? 'Jadwal bentrok dengan agenda operasional site.' : null,
        createdAt,
      },
    });
    seqTugasDinas += 1;

    const jumlahKaryawan = randInt(1, 3);
    await prisma.suratTugasKaryawan.createMany({
      data: Array.from({ length: jumlahKaryawan }, (_, idx) => ({
        suratTugasId: surat.id,
        urutan: idx + 1,
        nrp: String(randInt(30000000, 39999999)),
        nama: namaAcak(),
        departemen: pick(DEPARTEMEN_LIST),
        jabatan: pick(JABATAN_LIST),
      })),
    });
  }

  console.log('== 6/16: Database Anak Magang ==');

  const UNIVERSITAS = ['Universitas Mulawarman', 'Politeknik Negeri Samarinda', 'Universitas Hasanuddin', 'ITS Surabaya', 'Universitas Balikpapan'];
  const JURUSAN = ['Teknik Sipil', 'Teknik Pertambangan', 'Manajemen SDM', 'Teknik Elektro', 'K3 (Kesehatan & Keselamatan Kerja)'];

  const anakMagangRows: { id: number }[] = [];
  for (let i = 0; i < 28; i++) {
    const tanggalMulai = tanggalLalu(200);
    const durasiHari = randInt(60, 180);
    const tanggalSelesai = tambahHari(tanggalMulai, durasiHari);
    const status = tanggalSelesai < SEKARANG ? StatusAnakMagang.NONAKTIF : StatusAnakMagang.AKTIF;

    const am = await prisma.anakMagang.create({
      data: {
        nrp: String(randInt(20000000, 20999999)),
        nama: namaAcak(),
        gender: chance(0.5) ? 'Laki-laki' : 'Perempuan',
        universitas: pick(UNIVERSITAS),
        jurusan: pick(JURUSAN),
        departemen: pick(DEPARTEMEN_LIST),
        jabatan: 'Anak Magang',
        posisi: pick(['Data Entry', 'Lapangan', 'Administrasi']),
        pendidikan: 'S1',
        tanggalMulai,
        tanggalSelesai,
        email: null,
        noHp: `08${randInt(1000000000, 9999999999)}`.slice(0, 12),
        status,
        atasanLangsung: namaAcak(),
        createdAt: tanggalMulai,
      },
      select: { id: true },
    });
    anakMagangRows.push(am);
  }

  // Pastikan ada beberapa yang selesai BULAN INI (untuk stat "berakhirBulanIni").
  for (let i = 0; i < 4; i++) {
    const tanggalSelesai = utcDate(TAHUN_INI, BULAN_INI + 1, randInt(1, Math.max(2, SEKARANG.getUTCDate())));
    await prisma.anakMagang.update({
      where: { id: pick(anakMagangRows).id },
      data: { tanggalSelesai, status: StatusAnakMagang.NONAKTIF },
    });
  }

  let seqBalasan = 1;
  for (let i = 0; i < 9; i++) {
    const createdAt = tanggalDalamTahunBerjalan();
    const surat = await prisma.suratBalasanMagang.create({
      data: {
        nomor: `SB/${String(seqBalasan).padStart(3, '0')}/HCGA/${TAHUN_INI}`,
        nomorUrut: seqBalasan,
        tahunTerbit: TAHUN_INI,
        nomorSuratMasuk: `${randInt(100, 999)}/Univ/${TAHUN_INI}`,
        perihalSuratMasuk: 'Permohonan Kerja Praktik/Magang',
        tujuanJurusan: pick(JURUSAN),
        kotaTujuan: pick(['Samarinda', 'Balikpapan', 'Surabaya']),
        dibuatOlehId: hcUser.id,
        createdAt,
      },
    });
    seqBalasan += 1;

    const anakTerpilih = pickN(anakMagangRows, randInt(1, 3));
    await prisma.suratBalasanMagangBaris.createMany({
      data: anakTerpilih.map((anak, idx) => ({
        suratId: surat.id,
        anakMagangId: anak.id,
        urutan: idx + 1,
        nama: namaAcak(),
        nrp: String(randInt(20000000, 20999999)),
        jurusan: pick(JURUSAN),
        departemenTujuan: pick(DEPARTEMEN_LIST),
        tanggalMulai: tambahHari(createdAt, 7),
        tanggalSelesai: tambahHari(createdAt, 97),
      })),
    });
  }

  let seqTolak = 1;
  for (let i = 0; i < 6; i++) {
    const createdAt = tanggalDalamTahunBerjalan();
    await prisma.suratPenolakanMagang.create({
      data: {
        nomor: `SP/${String(seqTolak).padStart(3, '0')}/HCGA/${TAHUN_INI}`,
        nomorUrut: seqTolak,
        tahunTerbit: TAHUN_INI,
        anakMagangId: pick(anakMagangRows).id,
        nama: namaAcak(),
        sapaan: chance(0.5) ? 'Saudara' : 'Saudari',
        alasanPenolakan: 'Kuota magang periode ini sudah terpenuhi.',
        dibuatOlehId: hcUser.id,
        createdAt,
      },
    });
    seqTolak += 1;
  }

  console.log('== 7/16: e-ProM (Vendor, Tender, Kontrak) ==');

  const NAMA_VENDOR = [
    'PT Karya Bangun Persada', 'CV Mitra Konstruksi Jaya', 'PT Sumber Alam Teknik',
    'PT Cipta Beton Nusantara', 'CV Baja Perkasa Mandiri', 'PT Elektro Prima Solusi',
    'PT Graha Infrastruktur', 'CV Sinar Teknik Abadi', 'PT Multi Guna Karya', 'PT Andalan Sipil Raya',
  ];

  const vendorRows: { id: number; namaVendor: string }[] = [];
  for (const nama of NAMA_VENDOR) {
    const v = await prisma.vendor.create({
      data: {
        namaVendor: nama,
        email: `procurement@${nama.split(' ')[1]?.toLowerCase() ?? 'vendor'}.co.id`,
        noTelepon: `021${randInt(1000000, 9999999)}`,
        statusAktif: chance(0.9),
        legalitasStatus: chance(0.6) ? StatusLegalitasVendor.LENGKAP : StatusLegalitasVendor.BELUM_LENGKAP,
      },
      select: { id: true, namaVendor: true },
    });
    vendorRows.push(v);
  }

  const NAMA_TENDER = [
    'Pembangunan Jalan Hauling Blok C', 'Rehabilitasi Drainase Area Tambang',
    'Pengadaan Material Timbunan', 'Konstruksi Jembatan Akses Site',
    'Pemeliharaan Jalan Utama Tambang', 'Pembangunan Gudang Material',
    'Perluasan Area Parkir Alat Berat', 'Konstruksi Pos Keamanan Site',
  ];

  for (const namaTender of NAMA_TENDER) {
    const createdAt = tanggalDalamTahunBerjalan();
    const status = pick([StatusTender.SELESAI, StatusTender.SELESAI, StatusTender.EVALUASI_SPH, StatusTender.UNDANGAN_TERKIRIM, StatusTender.PERSIAPAN] as const);

    const tender = await prisma.tenderProcess.create({
      data: {
        namaTender,
        status,
        tanggalMulai: createdAt,
        tanggalSelesai: status === StatusTender.SELESAI ? tambahHari(createdAt, 30) : null,
        createdAt,
      },
    });

    const vendorIkut = pickN(vendorRows, randInt(2, 4));
    for (const vendor of vendorIkut) {
      await prisma.tenderUndangan.create({
        data: {
          tenderId: tender.id,
          vendorId: vendor.id,
          tanggalKirim: tambahHari(createdAt, 2),
          createdAt: tambahHari(createdAt, 2),
        },
      });

      if (status !== StatusTender.PERSIAPAN && status !== StatusTender.UNDANGAN_TERKIRIM) {
        await prisma.tenderSPH.create({
          data: {
            tenderId: tender.id,
            vendorId: vendor.id,
            roundKe: 1,
            hargaPenawaran: randInt(150, 2500) * 1_000_000,
            isFinal: true,
            statusPemenang: false,
            createdAt: tambahHari(createdAt, 10),
          },
        });

        await prisma.evaluasiVendor.create({
          data: {
            tenderId: tender.id,
            vendorId: vendor.id,
            teknikalMetode: randInt(60, 100) / 10,
            teknikalAlatKerja: randInt(60, 100) / 10,
            teknikalSpesifikasi: randInt(60, 100) / 10,
            teknikalPengalaman: randInt(60, 100) / 10,
            teknikalKomunikatif: randInt(60, 100) / 10,
            scheduleSkor: randInt(60, 100) / 10,
            hargaKetepatanWaktu: randInt(60, 100) / 10,
            hargaNegosiasi: randInt(60, 100) / 10,
            sheSkor: randInt(60, 100) / 10,
            legalitasSkor: randInt(60, 100) / 10,
          },
        });
      }
    }

    if (status === StatusTender.SELESAI) {
      const pemenang = pick(vendorIkut);
      await prisma.tenderSPH.updateMany({
        where: { tenderId: tender.id, vendorId: pemenang.id },
        data: { statusPemenang: true },
      });

      await prisma.kontrak.create({
        data: {
          tenderId: tender.id,
          vendorId: pemenang.id,
          nomorKontrak: `KTR/${TAHUN_INI}/${String(tender.id).padStart(3, '0')}`,
          tanggalMulai: tambahHari(createdAt, 35),
          tanggalSelesai: tambahHari(createdAt, 35 + randInt(60, 180)),
          createdAt: tambahHari(createdAt, 33),
        },
      });
    }
  }

  console.log('== 8/16: GA Inventory (Barang, Work Order, Daily Activity) ==');

  const ITEM_DATA: { name: string; category: ItemCategory; scope: InventoryScope; unit: ItemUnit }[] = [
    { name: 'Kertas HVS A4', category: ItemCategory.ATK, scope: InventoryScope.GENERAL, unit: ItemUnit.RIM },
    { name: 'Pulpen Hitam', category: ItemCategory.ATK, scope: InventoryScope.GENERAL, unit: ItemUnit.PC },
    { name: 'Tinta Printer', category: ItemCategory.ATK, scope: InventoryScope.GENERAL, unit: ItemUnit.BOTOL },
    { name: 'Map Folder', category: ItemCategory.ATK, scope: InventoryScope.GENERAL, unit: ItemUnit.PC },
    { name: 'Sabun Cuci Tangan', category: ItemCategory.HOUSEKEEPING, scope: InventoryScope.MESS, unit: ItemUnit.BOTOL },
    { name: 'Cairan Pel Lantai', category: ItemCategory.HOUSEKEEPING, scope: InventoryScope.MESS, unit: ItemUnit.DERIJEN },
    { name: 'Tisu Gulung', category: ItemCategory.HOUSEKEEPING, scope: InventoryScope.MESS, unit: ItemUnit.DUS },
    { name: 'Kantong Sampah', category: ItemCategory.HOUSEKEEPING, scope: InventoryScope.MESS, unit: ItemUnit.PAC },
    { name: 'Seragam Kerja', category: ItemCategory.BAJU, scope: InventoryScope.GENERAL, unit: ItemUnit.SET },
    { name: 'Sepatu Safety', category: ItemCategory.BAJU, scope: InventoryScope.GENERAL, unit: ItemUnit.PC },
    { name: 'Helm Proyek', category: ItemCategory.BAJU, scope: InventoryScope.GENERAL, unit: ItemUnit.PC },
    { name: 'Rompi Keselamatan', category: ItemCategory.BAJU, scope: InventoryScope.GENERAL, unit: ItemUnit.PC },
    { name: 'Lampu LED 20W', category: ItemCategory.ELEKTRONIK, scope: InventoryScope.ELECTRIC, unit: ItemUnit.PC },
    { name: 'Kabel NYM 2x1.5', category: ItemCategory.ELEKTRONIK, scope: InventoryScope.ELECTRIC, unit: ItemUnit.ROLL },
    { name: 'MCB 10A', category: ItemCategory.ELEKTRONIK, scope: InventoryScope.ELECTRIC, unit: ItemUnit.PC },
    { name: 'Stop Kontak', category: ItemCategory.ELEKTRONIK, scope: InventoryScope.ELECTRIC, unit: ItemUnit.PC },
    { name: 'Baterai AA', category: ItemCategory.ELEKTRONIK, scope: InventoryScope.GENERAL, unit: ItemUnit.PAC },
    { name: 'Meja Kerja', category: ItemCategory.FURNITURE, scope: InventoryScope.GENERAL, unit: ItemUnit.UNIT },
    { name: 'Kursi Kantor', category: ItemCategory.FURNITURE, scope: InventoryScope.GENERAL, unit: ItemUnit.UNIT },
    { name: 'Lemari Arsip', category: ItemCategory.FURNITURE, scope: InventoryScope.GENERAL, unit: ItemUnit.UNIT },
    { name: 'Kasur Mess', category: ItemCategory.FURNITURE, scope: InventoryScope.MESS, unit: ItemUnit.UNIT },
    { name: 'Bantal', category: ItemCategory.FURNITURE, scope: InventoryScope.MESS, unit: ItemUnit.PC },
  ];

  const itemRows: { id: number; scope: InventoryScope }[] = [];
  let itemCodeCounter: Record<string, number> = {};
  for (const item of ITEM_DATA) {
    const prefix = item.scope.slice(0, 3);
    itemCodeCounter[item.scope] = (itemCodeCounter[item.scope] ?? 0) + 1;
    const created = await prisma.item.create({
      data: {
        code: `${prefix}-${String(itemCodeCounter[item.scope]).padStart(3, '0')}`,
        name: item.name,
        inventoryScope: item.scope,
        category: item.category,
        unit: item.unit,
        isActive: true,
      },
      select: { id: true },
    });
    itemRows.push({ id: created.id, scope: item.scope });

    const stokAwal = randInt(20, 300);
    await prisma.inventoryStock.create({ data: { itemId: created.id, quantity: stokAwal } });

    // Barang masuk & keluar tersebar sepanjang tahun berjalan, termasuk bulan ini.
    const jumlahGerakan = randInt(6, 12);
    for (let g = 0; g < jumlahGerakan; g++) {
      const tanggal = tanggalDalamTahunBerjalan();
      if (chance(0.55)) {
        await prisma.stockIn.create({
          data: { date: tanggal, itemId: created.id, category: item.category, quantity: randInt(5, 50), unit: item.unit, createdAt: tanggal },
        });
      } else {
        await prisma.stockOut.create({
          data: {
            date: tanggal, itemId: created.id, category: item.category, quantity: randInt(1, 20), unit: item.unit,
            taker: namaAcak(), department: pick(DEPARTEMEN_LIST), createdAt: tanggal,
          },
        });
      }
    }

    if (chance(0.15)) {
      const stokLama = stokAwal;
      const stokBaru = Math.max(0, stokLama + randInt(-10, 10));
      await prisma.deviasiStok.create({
        data: {
          itemId: created.id, stokLama, stokBaru, selisih: stokBaru - stokLama,
          jenis: stokBaru < stokLama ? 'KURANG' : 'LEBIH',
          diubahOleh: admin.id,
          createdAt: tanggalDalamTahunBerjalan(),
        },
      });
    }
  }

  const JOB_TYPES = ['Perbaikan Listrik', 'Perbaikan AC', 'Perbaikan Furniture', 'Kebersihan Area', 'Perbaikan Plumbing', 'Instalasi Jaringan'];
  let seqWo = 1;
  let seqStp = 1;
  for (let i = 0; i < 34; i++) {
    const requestedAt = tanggalDalamTahunBerjalan();
    const status = pick([WorkOrderStatus.CLOSE, WorkOrderStatus.CLOSE, WorkOrderStatus.ON_PROGRESS, WorkOrderStatus.OPEN] as const);
    const statusApproval = status === WorkOrderStatus.CLOSE ? StatusApprovalWorkOrder.DISETUJUI : pick([StatusApprovalWorkOrder.MENUNGGU_GL, StatusApprovalWorkOrder.MENUNGGU_SH, StatusApprovalWorkOrder.MENUNGGU_PJO, StatusApprovalWorkOrder.DISETUJUI] as const);
    const closedAt = status === WorkOrderStatus.CLOSE ? tambahHari(requestedAt, randInt(1, 10)) : null;

    const wo = await prisma.workOrder.create({
      data: {
        workOrderNumber: `WO-${TAHUN_INI}-${String(seqWo).padStart(3, '0')}`,
        sequenceNumber: seqWo,
        workOrderName: pick(JOB_TYPES),
        department: pick(DEPARTEMEN_LIST),
        pic: chance(0.6) ? WorkOrderPic.GA_INFRAS : WorkOrderPic.GA_ELECTRIC,
        jobType: pick(JOB_TYPES),
        userDepartmentName: pick(DEPARTEMEN_LIST),
        description: `Permintaan perbaikan/pemeliharaan: ${pick(JOB_TYPES)} di area kerja.`,
        location: pick(LOKASI_TAMBANG),
        requestedAt,
        status,
        priority: chance(0.3) ? WorkOrderPriority.P1 : WorkOrderPriority.P2,
        closedAt,
        closedDurationDays: closedAt ? Math.max(1, Math.round((closedAt.getTime() - requestedAt.getTime()) / 86400000)) : null,
        createdBy: aktorAcak(),
        statusApproval,
        disetujuiGlOlehId: statusApproval === StatusApprovalWorkOrder.MENUNGGU_GL ? null : glUser.id,
        disetujuiGlPada: statusApproval === StatusApprovalWorkOrder.MENUNGGU_GL ? null : tambahHari(requestedAt, 1),
        disetujuiShOlehId: statusApproval === StatusApprovalWorkOrder.DISETUJUI ? shUser.id : null,
        disetujuiShPada: statusApproval === StatusApprovalWorkOrder.DISETUJUI ? tambahHari(requestedAt, 2) : null,
        disetujuiPjoOlehId: statusApproval === StatusApprovalWorkOrder.DISETUJUI ? pjoUser.id : null,
        disetujuiPjoPada: statusApproval === StatusApprovalWorkOrder.DISETUJUI ? tambahHari(requestedAt, 3) : null,
        createdAt: requestedAt,
      },
    });
    seqWo += 1;

    if (status === WorkOrderStatus.CLOSE) {
      await prisma.handover.create({
        data: {
          stpNumber: `STP-${TAHUN_INI}-${String(seqStp).padStart(3, '0')}`,
          sequenceNumber: seqStp,
          workOrderId: wo.id,
          handoverDate: closedAt ?? requestedAt,
          receiverName: namaAcak(),
          receiverPosition: pick(JABATAN_LIST),
          receiverDepartment: pick(DEPARTEMEN_LIST),
          location: pick(LOKASI_TAMBANG),
          handoverNote: 'Pekerjaan telah selesai dan diserahterimakan ke pemohon.',
          autoCreated: false,
          createdBy: aktorAcak(),
          createdAt: closedAt ?? requestedAt,
        },
      });
      seqStp += 1;
    }
  }

  const PEKERJAAN_HARIAN = ['Pembersihan Area Kantor', 'Perawatan Taman', 'Pengecatan Pagar', 'Perbaikan Saluran Air', 'Pemangkasan Rumput Area Mess'];
  for (let i = 0; i < 22; i++) {
    const startDate = tanggalDalamTahunBerjalan();
    const activityType = chance(0.3) ? DailyActivityType.GRASS_CUTTING : DailyActivityType.DAILY_ACTIVITY;
    const isClose = chance(0.6);
    const currentProgress = isClose ? 100 : randInt(10, 90);

    const da = await prisma.dailyActivity.create({
      data: {
        activityType,
        startDate,
        lastProgressDate: tambahHari(startDate, randInt(1, 10)),
        workName: pick(PEKERJAAN_HARIAN),
        location: pick(LOKASI_TAMBANG),
        description: 'Kegiatan rutin pemeliharaan area kerja dan lingkungan.',
        profilePhotoPath: `daily-activity-${i + 1}.jpg`,
        currentProgress,
        lastPic: namaAcak(),
        status: isClose ? DailyActivityStatus.CLOSE : chance(0.5) ? DailyActivityStatus.ON_PROGRESS : DailyActivityStatus.WAITING_APPROVAL,
        approvalStatus: isClose ? DailyApprovalStatus.APPROVED : DailyApprovalStatus.NONE,
        closeRequestedAt: isClose ? tambahHari(startDate, randInt(5, 12)) : null,
        closedAt: isClose ? tambahHari(startDate, randInt(6, 14)) : null,
        createdBy: aktorAcak(),
        createdAt: startDate,
      },
    });

    const jumlahProgress = randInt(1, 4);
    let progressBerjalan = 0;
    for (let p = 0; p < jumlahProgress; p++) {
      const tambahan = Math.round((currentProgress - progressBerjalan) / (jumlahProgress - p));
      await prisma.dailyActivityProgress.create({
        data: {
          activityId: da.id,
          progressDate: tambahHari(startDate, (p + 1) * 2),
          previousProgress: progressBerjalan,
          addedProgress: tambahan,
          currentProgress: progressBerjalan + tambahan,
          pic: namaAcak(),
          notes: 'Progress pekerjaan sesuai rencana harian.',
          requestClose: p === jumlahProgress - 1 && isClose,
          createdBy: aktorAcak(),
          createdAt: tambahHari(startDate, (p + 1) * 2),
        },
      });
      progressBerjalan += tambahan;
    }

    if (isClose) {
      await prisma.dailyActivityApproval.create({
        data: {
          activityId: da.id,
          decision: DailyApprovalDecision.APPROVED,
          comment: 'Pekerjaan sudah sesuai, disetujui untuk ditutup.',
          actedBy: shUser.id,
          actedAt: tambahHari(startDate, randInt(6, 14)),
          createdAt: tambahHari(startDate, randInt(6, 14)),
        },
      });
    }
  }

  console.log('== 9/16: GA Transport (Tiket & Travel) ==');

  const driverExisting = await prisma.driver.findUniqueOrThrow({ where: { id: 1 } });
  const driverRows = [driverExisting];
  for (const nama of ['Suparman', 'Herman Yulianto', 'Rusdi Hartono', 'Andi Firmansyah']) {
    const d = await prisma.driver.create({ data: { nama, noTelepon: `08${randInt(1000000000, 9999999999)}`.slice(0, 12), statusAktif: true } });
    driverRows.push(d);
  }

  const karyawanAktifRows = karyawanRows.filter((_, idx) => idx % 1 === 0);
  for (let i = 0; i < 45; i++) {
    const karyawan = pick(karyawanAktifRows);
    const jenisTiket = pick([JenisTiket.PULANG_PERGI, JenisTiket.BERANGKAT_SAJA, JenisTiket.PULANG_SAJA] as const);
    const createdAt = tanggalDalamTahunBerjalan();
    const tanggalMulai = tambahHari(createdAt, randInt(1, 14));

    const tiket = await prisma.transportTiket.create({
      data: {
        karyawanId: karyawan.id,
        jenisTiket,
        tanggalMulai,
        jamMulai: '08:00',
        tanggalSelesai: jenisTiket === JenisTiket.PULANG_PERGI ? tambahHari(tanggalMulai, randInt(3, 10)) : null,
        jamSelesai: jenisTiket === JenisTiket.PULANG_PERGI ? '17:00' : null,
        keterangan: 'Tiket cuti/perjalanan pulang kampung karyawan.',
        createdBy: hcUser.id,
        createdAt,
      },
    });

    if (chance(0.6)) {
      await prisma.transportTiketFile.create({
        data: { tiketId: tiket.id, fileUrl: `tiket-${tiket.id}.pdf`, namaFile: `Tiket ${karyawan.nama}.pdf`, createdAt },
      });
    }
  }

  for (let i = 0; i < 38; i++) {
    const driver = pick(driverRows);
    const isPast = chance(0.75);
    const waktuBerangkat = isPast ? tanggalLalu(200) : tanggalMendatang(20);
    const status = isPast ? StatusTravel.SELESAI : pick([StatusTravel.DIJADWALKAN, StatusTravel.BERJALAN] as const);

    const travel = await prisma.travelJadwal.create({
      data: {
        armada: pick(['Hiace Putih B 1234 XY', 'Elf Silver B 5678 CD', 'Avanza Hitam B 9012 EF', 'Innova Putih B 3456 GH']),
        driverId: driver.id,
        asal: 'Mess Karyawan',
        tujuan: pick(LOKASI_TAMBANG),
        waktuBerangkatRencana: waktuBerangkat,
        status,
        driverCheckIn: status === StatusTravel.SELESAI || status === StatusTravel.BERJALAN ? waktuBerangkat : null,
        driverCheckOut: status === StatusTravel.SELESAI ? tambahHari(waktuBerangkat, 0) : null,
        durasiMenit: status === StatusTravel.SELESAI ? randInt(20, 60) : null,
        createdBy: hcUser.id,
        createdAt: tambahHari(waktuBerangkat, -1),
      },
    });

    const penumpangTerpilih = pickN(karyawanAktifRows, randInt(2, 6));
    for (const p of penumpangTerpilih) {
      await prisma.travelPenumpang.create({
        data: {
          travelId: travel.id,
          karyawanId: p.id,
          checkInWaktu: status === StatusTravel.SELESAI ? waktuBerangkat : null,
          checkOutWaktu: status === StatusTravel.SELESAI ? tambahHari(waktuBerangkat, 0) : null,
          ratingBintang: status === StatusTravel.SELESAI ? randInt(3, 5) : null,
          ratingUlasan: status === StatusTravel.SELESAI && chance(0.4) ? 'Perjalanan nyaman dan tepat waktu.' : null,
          createdAt: waktuBerangkat,
        },
      });
    }
  }

  console.log('== 10/16: GA Housekeeping Indoor ==');

  const LOKASI_HOUSEKEEPING: LokasiHousekeepingIndoor[] = ['OFFICE', 'PLANT', 'CSA_GIBSON', 'VIEW_POINT', 'CSA_MONTE_BARU', 'CSA_MONTE_BARU_SUPPORT'];
  for (let i = 0; i < 40; i++) {
    const createdAt = tanggalDalamTahunBerjalan();
    const lap = await prisma.housekeepingIndoor.create({
      data: { lokasi: pick(LOKASI_HOUSEKEEPING), namaPetugas: namaAcak(), createdBy: aktorAcak(), createdAt },
    });

    await prisma.housekeepingIndoorFoto.createMany({
      data: Array.from({ length: randInt(1, 3) }, (_, idx) => ({
        laporanId: lap.id, fileUrl: `housekeeping-${lap.id}-${idx + 1}.jpg`, createdAt,
      })),
    });
  }
  // Beberapa laporan hari ini biar stat "dilaporkan hari ini" tidak nol.
  for (const lokasi of pickN(LOKASI_HOUSEKEEPING, 3)) {
    const lap = await prisma.housekeepingIndoor.create({
      data: { lokasi, namaPetugas: namaAcak(), createdBy: aktorAcak(), createdAt: SEKARANG },
    });
    await prisma.housekeepingIndoorFoto.create({ data: { laporanId: lap.id, fileUrl: `housekeeping-${lap.id}-today.jpg`, createdAt: SEKARANG } });
  }

  console.log('== 11/16: Civil Electric-KIP ==');

  await Promise.all(
    LOKASI_HOUSEKEEPING.map((lokasi, idx) =>
      prisma.kipLokasiGps.upsert({
        where: { lokasi },
        update: {},
        create: { lokasi, latitude: -1.234 + idx * 0.01, longitude: 116.789 + idx * 0.01 },
      }),
    ),
  );

  const JENIS_PERALATAN = ['Panel Listrik Utama', 'Genset Cadangan', 'Trafo Distribusi', 'AC Central', 'Pompa Air', 'Lampu Penerangan Jalan'];
  let seqKip = 1;
  for (let i = 0; i < 18; i++) {
    const kip = await prisma.kip.create({
      data: {
        noKip: `KIP-${TAHUN_INI}-${String(seqKip).padStart(3, '0')}`,
        jenisPeralatan: pick(JENIS_PERALATAN),
        departemen: 'GA Electric',
        tahun: TAHUN_INI,
        lokasi: pick(LOKASI_HOUSEKEEPING),
        parameterChecklist: ['Kondisi fisik baik', 'Tidak ada kebocoran/korsleting', 'Suhu operasional normal', 'Kebersihan area terjaga'],
        createdBy: elektrik.id,
        createdAt: tanggalLalu(300),
      },
    });
    seqKip += 1;

    const rows = Array.from({ length: 12 }, (_, m) => {
      const bulan = m + 1;
      const sudahLewat = bulan <= BULAN_INI + 1;
      const status: StatusChecklistKip = sudahLewat && chance(0.85) ? StatusChecklistKip.SUDAH : StatusChecklistKip.BELUM;
      return {
        kipId: kip.id,
        bulan,
        status,
        diperiksaOleh: status === StatusChecklistKip.SUDAH ? elektrik.id : null,
        tanggalPeriksa: status === StatusChecklistKip.SUDAH ? utcDate(TAHUN_INI, bulan, randInt(1, 25)) : null,
        fotoBukti: status === StatusChecklistKip.SUDAH ? `kip-${kip.id}-bulan-${bulan}.jpg` : null,
      };
    });
    await prisma.kipChecklistBulan.createMany({ data: rows });
  }

  console.log('== 12/16: Civil TPS-3R ==');

  for (let i = 0; i < 30; i++) {
    const tanggal = tanggalDalamTahunBerjalan();
    await prisma.laporanTps3r.create({
      data: {
        tanggal,
        beratOrganik: randInt(50, 300),
        beratNonOrganik: randInt(30, 200),
        beratReuse: randInt(5, 50),
        beratRecycle: randInt(10, 80),
        beratResidu: randInt(10, 60),
        createdById: aktorAcak(),
        createdAt: tanggal,
      },
    });
  }

  console.log('== 13/16: PORTAL IR ==');

  await prisma.dokumenIr.createMany({
    data: [
      { kategori: KategoriDokumenIr.SK, judul: 'SK Pengangkatan Karyawan Tetap', namaFile: 'sk-pengangkatan.pdf', urlFile: 'ir-dokumen/sk-pengangkatan.pdf', uploadedById: hcUser.id, createdAt: tanggalDalamTahunBerjalan() },
      { kategori: KategoriDokumenIr.SK, judul: 'SK Kenaikan Golongan 2026', namaFile: 'sk-kenaikan-golongan.pdf', urlFile: 'ir-dokumen/sk-kenaikan-golongan.pdf', uploadedById: hcUser.id, createdAt: tanggalDalamTahunBerjalan() },
      { kategori: KategoriDokumenIr.IM, judul: 'Instruksi Manajemen Jam Kerja', namaFile: 'im-jam-kerja.pdf', urlFile: 'ir-dokumen/im-jam-kerja.pdf', uploadedById: hcUser.id, createdAt: tanggalDalamTahunBerjalan() },
      { kategori: KategoriDokumenIr.IM, judul: 'Instruksi Manajemen K3', namaFile: 'im-k3.pdf', urlFile: 'ir-dokumen/im-k3.pdf', uploadedById: sheUser.id, createdAt: tanggalDalamTahunBerjalan() },
      { kategori: KategoriDokumenIr.FORM, judul: 'Form Pengajuan Cuti', namaFile: 'form-cuti.pdf', urlFile: 'ir-dokumen/form-cuti.pdf', uploadedById: hcUser.id, createdAt: tanggalDalamTahunBerjalan() },
      { kategori: KategoriDokumenIr.FORM, judul: 'Form Reimbursement', namaFile: 'form-reimbursement.pdf', urlFile: 'ir-dokumen/form-reimbursement.pdf', uploadedById: admCombenUser.id, createdAt: tanggalDalamTahunBerjalan() },
    ],
  });

  const pertanyaan1 = await prisma.aspirasiPertanyaan.create({
    data: { teks: 'Bagaimana kepuasan Anda terhadap fasilitas mess karyawan?', tipe: TipeAspirasiPertanyaan.PILIHAN_GANDA, aktif: true, urutan: 1, createdById: hcUser.id },
  });
  const opsi1 = await Promise.all([
    prisma.aspirasiOpsi.create({ data: { pertanyaanId: pertanyaan1.id, teks: 'Sangat Puas', urutan: 1 } }),
    prisma.aspirasiOpsi.create({ data: { pertanyaanId: pertanyaan1.id, teks: 'Puas', urutan: 2 } }),
    prisma.aspirasiOpsi.create({ data: { pertanyaanId: pertanyaan1.id, teks: 'Cukup', urutan: 3 } }),
    prisma.aspirasiOpsi.create({ data: { pertanyaanId: pertanyaan1.id, teks: 'Kurang Puas', urutan: 4 } }),
  ]);

  const pertanyaan2 = await prisma.aspirasiPertanyaan.create({
    data: { teks: 'Apa masukan Anda untuk peningkatan layanan transportasi karyawan?', tipe: TipeAspirasiPertanyaan.ESSAY, aktif: true, urutan: 2, createdById: hcUser.id },
  });

  const pertanyaan3 = await prisma.aspirasiPertanyaan.create({
    data: { teks: 'Apakah Anda mengetahui prosedur pengajuan Follow Up MCU?', tipe: TipeAspirasiPertanyaan.PILIHAN_GANDA, aktif: false, urutan: 3, createdById: hcUser.id },
  });
  const opsi3 = await Promise.all([
    prisma.aspirasiOpsi.create({ data: { pertanyaanId: pertanyaan3.id, teks: 'Ya, tahu', urutan: 1 } }),
    prisma.aspirasiOpsi.create({ data: { pertanyaanId: pertanyaan3.id, teks: 'Tidak tahu', urutan: 2 } }),
  ]);

  const penjawabPool = pickN(poolUsers, 18);
  for (const user of penjawabPool) {
    await prisma.aspirasiJawaban.create({
      data: {
        pertanyaanId: pertanyaan1.id, userId: user.id, opsiId: pick(opsi1).id,
        namaPenjawab: namaAcak(), nrpPenjawab: String(randInt(30000000, 39999999)), createdAt: tanggalDalamTahunBerjalan(),
      },
    });
  }
  for (const user of pickN(poolUsers, 10)) {
    await prisma.aspirasiJawaban.create({
      data: {
        pertanyaanId: pertanyaan2.id, userId: user.id, jawabanTeks: 'Mohon penambahan armada travel pada jam sibuk pagi dan sore.',
        namaPenjawab: namaAcak(), nrpPenjawab: String(randInt(30000000, 39999999)), createdAt: tanggalDalamTahunBerjalan(),
      },
    });
  }
  for (const user of pickN(poolUsers, 8)) {
    await prisma.aspirasiJawaban.create({
      data: {
        pertanyaanId: pertanyaan3.id, userId: user.id, opsiId: pick(opsi3).id,
        namaPenjawab: namaAcak(), nrpPenjawab: String(randInt(30000000, 39999999)), createdAt: tanggalDalamTahunBerjalan(),
      },
    });
  }

  const videoRows = await Promise.all([
    prisma.irCourseVideo.create({ data: { judul: 'Orientasi Karyawan Baru', deskripsi: 'Pengenalan budaya kerja dan aturan perusahaan.', urlVideo: 'ir-course/orientasi-karyawan-baru.mp4', uploadedById: hcUser.id, createdAt: tanggalDalamTahunBerjalan() } }),
    prisma.irCourseVideo.create({ data: { judul: 'Prosedur K3 Dasar', deskripsi: 'Pelatihan dasar keselamatan dan kesehatan kerja.', urlVideo: 'ir-course/prosedur-k3-dasar.mp4', uploadedById: sheUser.id, createdAt: tanggalDalamTahunBerjalan() } }),
    prisma.irCourseVideo.create({ data: { judul: 'Etika Komunikasi di Tempat Kerja', deskripsi: 'Panduan komunikasi profesional antar karyawan.', urlVideo: 'ir-course/etika-komunikasi.mp4', uploadedById: hcUser.id, createdAt: tanggalDalamTahunBerjalan() } }),
  ]);
  for (const video of videoRows) {
    for (const user of pickN(poolUsers, randInt(6, 15))) {
      await prisma.irCourseTontonan.create({ data: { videoId: video.id, userId: user.id, ditontonPada: tanggalDalamTahunBerjalan() } }).catch(() => undefined);
    }
  }

  console.log('== 14/16: Administrasi (Postingan, CSR, Form Download, Dokumentasi) ==');

  await prisma.postingan.createMany({
    data: [
      { judul: 'Perayaan HUT Perusahaan ke-15', deskripsi: 'Dokumentasi kegiatan perayaan ulang tahun perusahaan.', tipe: TipePostingan.POSTER, urlMedia: 'postingan/hut-perusahaan.jpg', tampilBeranda: true, urutan: 1, uploadedById: admin.id, createdAt: tanggalDalamTahunBerjalan() },
      { judul: 'Sosialisasi K3 Bulanan', deskripsi: 'Video sosialisasi keselamatan kerja bulan berjalan.', tipe: TipePostingan.VIDEO, urlMedia: 'postingan/sosialisasi-k3.mp4', tampilBeranda: true, urutan: 2, uploadedById: sheUser.id, createdAt: tanggalDalamTahunBerjalan() },
      { judul: 'Pengumuman Libur Nasional', deskripsi: 'Jadwal libur nasional dan cuti bersama.', tipe: TipePostingan.POSTER, urlMedia: 'postingan/libur-nasional.jpg', tampilBeranda: true, urutan: 3, uploadedById: hcUser.id, createdAt: tanggalDalamTahunBerjalan() },
      { judul: 'Capaian Produksi Kuartal Ini', deskripsi: 'Infografis capaian produksi tambang.', tipe: TipePostingan.POSTER, urlMedia: 'postingan/capaian-produksi.jpg', tampilBeranda: false, urutan: 4, uploadedById: admin.id, createdAt: tanggalDalamTahunBerjalan() },
      { judul: 'Program CSR Bantuan Pendidikan', deskripsi: 'Dokumentasi program CSR bantuan pendidikan warga sekitar.', tipe: TipePostingan.VIDEO, urlMedia: 'postingan/csr-pendidikan.mp4', tampilBeranda: true, urutan: 5, uploadedById: admin.id, createdAt: tanggalDalamTahunBerjalan() },
    ],
  });

  async function seedDrive(scope: ScopeDrive, folders: { nama: string; files: { nama: string; ext: string }[] }[]) {
    for (const folder of folders) {
      const f = await prisma.driveFolder.create({ data: { scope, namaFolder: folder.nama, createdAt: tanggalLalu(200) } });
      await prisma.driveFile.createMany({
        data: folder.files.map((file) => ({
          folderId: f.id, namaFile: `${file.nama}.${file.ext}`, urlFile: `drive/${scope.toLowerCase()}/${file.nama}.${file.ext}`,
          uploadedById: pick([admin.id, hcUser.id, admCombenUser.id]), uploadedAt: tanggalDalamTahunBerjalan(),
        })),
      });
    }
  }

  await seedDrive(ScopeDrive.CSR, [
    { nama: 'Program Pendidikan', files: [{ nama: 'proposal-beasiswa', ext: 'pdf' }, { nama: 'laporan-realisasi', ext: 'xlsx' }, { nama: 'dokumentasi-1', ext: 'jpg' }] },
    { nama: 'Program Kesehatan', files: [{ nama: 'proposal-posyandu', ext: 'pdf' }, { nama: 'dokumentasi-2', ext: 'jpg' }] },
    { nama: 'Program Lingkungan', files: [{ nama: 'laporan-reboisasi', ext: 'docx' }, { nama: 'data-tanam', ext: 'csv' }] },
  ]);

  await seedDrive(ScopeDrive.FORM_DOWNLOAD, [
    { nama: 'Form HC', files: [{ nama: 'form-cuti', ext: 'pdf' }, { nama: 'form-reimbursement', ext: 'pdf' }, { nama: 'form-lembur', ext: 'docx' }] },
    { nama: 'Form GA', files: [{ nama: 'form-permintaan-barang', ext: 'pdf' }, { nama: 'form-work-order', ext: 'pdf' }] },
    { nama: 'Form Civil', files: [{ nama: 'form-inspeksi', ext: 'xlsx' }] },
  ]);

  const ALBUM_JUDUL = ['Gathering Karyawan 2026', 'Pelatihan K3 Rutin', 'Kunjungan Kerja Direksi', 'Kegiatan CSR Desa Binaan', 'Perayaan Hari Kemerdekaan', 'Family Day Karyawan'];
  for (const judul of ALBUM_JUDUL) {
    const album = await prisma.albumDokumentasi.create({
      data: { judul, deskripsi: `Dokumentasi kegiatan ${judul}.`, uploadedById: pick([admin.id, hcUser.id]), createdAt: tanggalDalamTahunBerjalan() },
    });
    await prisma.albumFoto.createMany({
      data: Array.from({ length: randInt(3, 8) }, (_, idx) => ({ albumId: album.id, urlFoto: `album/${album.id}-foto-${idx + 1}.jpg`, createdAt: album.createdAt })),
    });
  }

  console.log('== 15/16: Pengaduan Layanan (HC/GA/CIVIL) ==');

  for (const divisi of [DivisiPengaduan.HC, DivisiPengaduan.GA, DivisiPengaduan.CIVIL] as const) {
    const jumlah = divisi === DivisiPengaduan.HC ? 30 : 22;
    for (let i = 0; i < jumlah; i++) {
      const createdAt = tanggalDalamTahunBerjalan();
      const status = pick([StatusPengaduan.DISETUJUI, StatusPengaduan.DISETUJUI, StatusPengaduan.MENUNGGU, StatusPengaduan.DITAHAN, StatusPengaduan.DITOLAK] as const);
      const adaAduan = chance(0.45);

      const p = await prisma.pengaduanLayanan.create({
        data: {
          divisi,
          rating: randInt(3, 5),
          komentar: chance(0.6) ? 'Pelayanan cukup baik, terima kasih.' : null,
          deskripsiAduan: adaAduan ? 'Mohon ditindaklanjuti terkait kendala fasilitas di area kerja.' : null,
          lokasi: divisi === DivisiPengaduan.HC ? null : pick([LokasiPengaduan.TAMBANG, LokasiPengaduan.MESS] as const),
          status: adaAduan ? status : StatusPengaduan.DISETUJUI,
          catatanAdmin: status !== StatusPengaduan.MENUNGGU ? 'Sudah ditinjau dan ditindaklanjuti tim terkait.' : null,
          pengirimId: aktorAcak(),
          diprosesOlehId: status !== StatusPengaduan.MENUNGGU ? korlapUser.id : null,
          diprosesPada: status !== StatusPengaduan.MENUNGGU ? tambahHari(createdAt, 1) : null,
          createdAt,
        },
      });

      if (adaAduan) {
        await prisma.pengaduanLayananFoto.createMany({
          data: Array.from({ length: randInt(1, 2) }, (_, idx) => ({
            pengaduanId: p.id, urlFoto: `pengaduan/${p.id}-${idx + 1}.jpg`, namaFile: `bukti-${idx + 1}.jpg`, createdAt,
          })),
        });
      }
    }
  }

  console.log('== 16/16: Deklarasi Dinas (Deklarasi, Nota, Settlement, Saldo, Pengajuan) ==');

  const NAMA_PENGGUNA_DEKLARASI = Array.from({ length: 12 }, () => namaAcak());
  let seqDeklarasi = 1;
  for (let i = 0; i < 20; i++) {
    const nama = pick(NAMA_PENGGUNA_DEKLARASI);
    const nrp = String(randInt(30000000, 39999999));
    const jenis = chance(0.6) ? JenisDeklarasi.PERJALANAN_DINAS : JenisDeklarasi.UANG_OPERASIONAL;
    const tanggalKegiatan = tanggalDalamTahunBerjalan();
    const status = pick([StatusDeklarasi.DISETUJUI, StatusDeklarasi.DISETUJUI, StatusDeklarasi.DIVERIFIKASI, StatusDeklarasi.DIAJUKAN, StatusDeklarasi.DITOLAK, StatusDeklarasi.DRAFT] as const);
    const totalNominal = randInt(500_000, 15_000_000);

    const deklarasi = await prisma.deklarasi.create({
      data: {
        kodeDeklarasi: `DEK-${TAHUN_INI}-${String(seqDeklarasi).padStart(4, '0')}`,
        idPengguna: aktorAcak(),
        nrp,
        namaPengguna: nama,
        jenisDeklarasi: jenis,
        tanggalKegiatan,
        lokasi: pick(['Jakarta', 'Balikpapan', 'Surabaya', 'Site Tambang']),
        keterangan: jenis === JenisDeklarasi.PERJALANAN_DINAS ? 'Perjalanan dinas koordinasi operasional.' : 'Penggunaan dana operasional harian.',
        nomorStd: jenis === JenisDeklarasi.PERJALANAN_DINAS ? `STD/${String(seqDeklarasi).padStart(3, '0')}/${TAHUN_INI}` : null,
        totalNominal,
        status,
        createdAt: tanggalKegiatan,
      },
    });
    seqDeklarasi += 1;

    if (status === StatusDeklarasi.DIVERIFIKASI || status === StatusDeklarasi.DISETUJUI) {
      const jumlahNota = randInt(1, 4);
      for (let n = 0; n < jumlahNota; n++) {
        const nominal = Math.round(totalNominal / jumlahNota);
        await prisma.nota.create({
          data: {
            idDeklarasi: deklarasi.id,
            kategoriNota: pick([KategoriNota.MAKAN, KategoriNota.AKOMODASI, KategoriNota.TRANSPORTASI, KategoriNota.LAUNDRY] as const),
            barangJasa: pick(['Makan siang tim', 'Hotel penginapan', 'Transportasi lokal', 'Laundry pakaian dinas']),
            picSettlement: 'Finance & Accounting',
            jumlahItemSettlement: 1,
            namaFile: `nota-${deklarasi.id}-${n + 1}.jpg`,
            pathFile: `deklarasi/nota-${deklarasi.id}-${n + 1}.jpg`,
            nominalOcr: nominal,
            nominalFinal: nominal,
            statusVerifikasi: StatusVerifikasiNota.DIVERIFIKASI,
            createdAt: tambahHari(tanggalKegiatan, n),
          },
        });

        await prisma.databaseSettlement.create({
          data: {
            idDeklarasi: deklarasi.id,
            idPengguna: deklarasi.idPengguna,
            kodeJanganDiubah: `${deklarasi.kodeDeklarasi}-${n + 1}`,
            nomorSettlement: `SET-${deklarasi.id}-${n + 1}`,
            item: n + 1,
            itemSett: `Item ${n + 1}`,
            tanggalPembuatan: tanggalKegiatan,
            tanggalPerItem: tambahHari(tanggalKegiatan, n),
            namaBarangJasa: pick(['Makan siang tim', 'Hotel penginapan', 'Transportasi lokal']),
            qty: 1,
            hargaPerQty: nominal,
            total: nominal,
            statusData: StatusDataDatabaseSettlement.AKTIF,
            createdAt: tambahHari(tanggalKegiatan, n),
          },
        });
      }
    }
  }

  for (let i = 0; i < 15; i++) {
    const tanggalTransfer = tanggalDalamTahunBerjalan();
    const nominalTransfer = randInt(1_000_000, 10_000_000);
    const totalPenggunaan = Math.round(nominalTransfer * (randInt(40, 100) / 100));
    await prisma.saldo.create({
      data: {
        idPengguna: aktorAcak(),
        nrp: String(randInt(30000000, 39999999)),
        namaPengguna: pick(NAMA_PENGGUNA_DEKLARASI),
        lokasi: pick(['Jakarta', 'Balikpapan', 'Site Tambang']),
        jenisSaldo: chance(0.6) ? JenisDeklarasi.PERJALANAN_DINAS : JenisDeklarasi.UANG_OPERASIONAL,
        nominalTransfer,
        totalPenggunaan,
        sisaSaldo: Math.max(0, nominalTransfer - totalPenggunaan),
        tanggalTransfer,
        keterangan: 'Transfer dana operasional/perjalanan dinas.',
        statusSaldo: pick([StatusSaldo.AKTIF, StatusSaldo.ADA_SISA, StatusSaldo.SELESAI, StatusSaldo.MENUNGGU_PENGEMBALIAN] as const),
        createdAt: tanggalTransfer,
      },
    });
  }

  for (let i = 0; i < 15; i++) {
    const tanggalPengajuan = tanggalDalamTahunBerjalan();
    await prisma.pengajuan.create({
      data: {
        idPengguna: aktorAcak(),
        nrp: String(randInt(30000000, 39999999)),
        namaPengguna: pick(NAMA_PENGGUNA_DEKLARASI),
        jenisPengajuan: chance(0.6) ? JenisDeklarasi.PERJALANAN_DINAS : JenisDeklarasi.UANG_OPERASIONAL,
        lokasi: pick(['Jakarta', 'Balikpapan', 'Site Tambang']),
        keterangan: 'Pengajuan dana perjalanan dinas/operasional.',
        namaFileRab: `rab-${i + 1}.pdf`,
        pathFileRab: `deklarasi/rab-${i + 1}.pdf`,
        nominalTransfer: randInt(1_000_000, 10_000_000),
        tanggalTransfer: chance(0.6) ? tambahHari(tanggalPengajuan, 3) : null,
        statusPengajuan: pick([StatusPengajuan.DISETUJUI, StatusPengajuan.SELESAI, StatusPengajuan.MENUNGGU_TRANSFER, StatusPengajuan.DIAJUKAN, StatusPengajuan.DITOLAK] as const),
        tanggalPengajuan,
        createdAt: tanggalPengajuan,
      },
    });
  }

  console.log('Selesai! Data dummy berhasil ditambahkan ke seluruh modul.');
}

main()
  .catch((error: unknown) => {
    console.error('Seed dummy gagal:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
