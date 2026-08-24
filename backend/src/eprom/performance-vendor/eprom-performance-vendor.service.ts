import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { StatusApprovalEprom } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { EpromAksesService } from '../common/eprom-akses.service';
import { AktorEprom } from '../common/eprom-aktor';

const MS_HARI = 24 * 60 * 60 * 1000;
const TARGET_TTA_KTA_BULANAN = 8;

const BOBOT = {
  upload: 20,
  deviasi: 30,
  ttaKta: 20,
  jsa: 15,
  pica: 15,
} as const;

type StatusUpload = 'HIJAU' | 'MERAH' | 'ABU_ABU' | 'ORANYE';
type TipeKewajiban =
  | 'inspeksi-area'
  | 'inspeksi-peralatan'
  | 'progress-harian'
  | 'progress-mingguan'
  | 'progress-bulanan';

type KewajibanUpload = {
  tanggal: string;
  tipe: TipeKewajiban;
  label: string;
  jamBuka: string;
  jamTutup: string;
  status: StatusUpload;
  keterangan: string;
  uploadedAt: Date | null;
};

type KomponenNilai = {
  key: keyof typeof BOBOT;
  label: string;
  bobot: number;
  nilai: number | null;
  keterangan: string;
};

const JADWAL_HARIAN: {
  tipe: Extract<TipeKewajiban, 'inspeksi-area' | 'inspeksi-peralatan' | 'progress-harian'>;
  label: string;
  buka: string;
  tutup: string;
}[] = [
  { tipe: 'inspeksi-area', label: 'Inspeksi Area Pekerjaan', buka: '08:00', tutup: '12:00' },
  { tipe: 'inspeksi-peralatan', label: 'Inspeksi Peralatan', buka: '08:00', tutup: '10:00' },
  { tipe: 'progress-harian', label: 'Progress Harian', buka: '08:00', tutup: '22:00' },
];

function duaDigit(nilai: number): string {
  return String(nilai).padStart(2, '0');
}

function ymd(tanggal: Date): string {
  return `${tanggal.getUTCFullYear()}-${duaDigit(tanggal.getUTCMonth() + 1)}-${duaDigit(tanggal.getUTCDate())}`;
}

function tanggalDariYmd(nilai: string): Date {
  const [tahun, bulan, tanggal] = nilai.split('-').map(Number);
  return new Date(Date.UTC(tahun, bulan - 1, tanggal));
}

function ymdWita(tanggal: Date): string {
  return ymd(new Date(tanggal.getTime() + 8 * 60 * 60 * 1000));
}

function batasWita(tanggal: string, jam: string): Date {
  const [tahun, bulan, hari] = tanggal.split('-').map(Number);
  const [pukul, menit] = jam.split(':').map(Number);
  return new Date(Date.UTC(tahun, bulan - 1, hari, pukul - 8, menit));
}

function periodeBulan(bulan?: string) {
  const sekarangWita = new Date(Date.now() + 8 * 60 * 60 * 1000);
  const nilai = bulan ?? `${sekarangWita.getUTCFullYear()}-${duaDigit(sekarangWita.getUTCMonth() + 1)}`;

  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(nilai)) {
    throw new BadRequestException('Bulan harus menggunakan format YYYY-MM');
  }

  const [tahun, nomorBulan] = nilai.split('-').map(Number);
  const mulai = new Date(Date.UTC(tahun, nomorBulan - 1, 1));
  const selesai = new Date(Date.UTC(tahun, nomorBulan, 0));
  const akhirEksklusifUtc = new Date(Date.UTC(tahun, nomorBulan, 1, -8));

  return {
    bulan: nilai,
    mulai,
    selesai,
    mulaiTimestampUtc: new Date(Date.UTC(tahun, nomorBulan - 1, 1, -8)),
    akhirEksklusifUtc,
  };
}

function tanggalKontrak(tanggal: Date): Date {
  return new Date(Date.UTC(tanggal.getUTCFullYear(), tanggal.getUTCMonth(), tanggal.getUTCDate()));
}

function daftarHariKerja(mulai: Date, selesai: Date): Date[] {
  const hasil: Date[] = [];
  for (let nilai = mulai.getTime(); nilai <= selesai.getTime(); nilai += MS_HARI) {
    const tanggal = new Date(nilai);
    // Kalender proyek saat ini: Senin-Sabtu. Minggu tidak menjadi kewajiban upload.
    if (tanggal.getUTCDay() !== 0) hasil.push(tanggal);
  }
  return hasil;
}

function isoMinggu(tanggal: Date): string {
  const nilai = new Date(tanggal.getTime());
  const hariSenin0 = (nilai.getUTCDay() + 6) % 7;
  nilai.setUTCDate(nilai.getUTCDate() - hariSenin0 + 3);
  const kamisPertama = new Date(Date.UTC(nilai.getUTCFullYear(), 0, 4));
  const hariKamisPertama = (kamisPertama.getUTCDay() + 6) % 7;
  kamisPertama.setUTCDate(kamisPertama.getUTCDate() - hariKamisPertama + 3);
  const minggu = 1 + Math.round((nilai.getTime() - kamisPertama.getTime()) / (7 * MS_HARI));
  return `${nilai.getUTCFullYear()}-${duaDigit(minggu)}`;
}

function bulat(nilai: number): number {
  return Math.round(nilai * 10) / 10;
}

function nilaiDeviasi(deviasi: number): number {
  if (deviasi >= 0) return 100;
  if (deviasi >= -2) return 90;
  if (deviasi >= -5) return 75;
  if (deviasi >= -10) return 50;
  return 20;
}

function nilaiPica(keterlambatan: number): number {
  if (keterlambatan <= 0) return 100;
  if (keterlambatan <= 3) return 80;
  if (keterlambatan <= 7) return 50;
  return 0;
}

function grade(nilai: number, semuaSempurna: boolean): 'A' | 'B' | 'C' | 'D' | 'E' {
  if (semuaSempurna && nilai === 100) return 'A';
  if (nilai >= 90) return 'B';
  if (nilai >= 80) return 'C';
  if (nilai >= 70) return 'D';
  return 'E';
}

function statusKewajiban(
  tipe: TipeKewajiban,
  label: string,
  tanggal: string,
  buka: string,
  tutup: string,
  uploads: Date[],
  sekarang: Date,
): KewajibanUpload {
  const mulai = batasWita(tanggal, buka);
  const akhir = batasWita(tanggal, tutup);
  const tepatWaktu = uploads.find((item) => item >= mulai && item < akhir) ?? null;
  const uploadLain = uploads[0] ?? null;

  if (tepatWaktu) {
    return {
      tanggal,
      tipe,
      label,
      jamBuka: buka,
      jamTutup: tutup,
      status: 'HIJAU',
      keterangan: 'Sudah upload tepat waktu',
      uploadedAt: tepatWaktu,
    };
  }

  if (uploadLain) {
    return {
      tanggal,
      tipe,
      label,
      jamBuka: buka,
      jamTutup: tutup,
      status: 'ORANYE',
      keterangan: 'Upload di luar batas waktu',
      uploadedAt: uploadLain,
    };
  }

  if (sekarang >= akhir) {
    return {
      tanggal,
      tipe,
      label,
      jamBuka: buka,
      jamTutup: tutup,
      status: 'MERAH',
      keterangan: 'Tidak upload pada hari tersebut',
      uploadedAt: null,
    };
  }

  return {
    tanggal,
    tipe,
    label,
    jamBuka: buka,
    jamTutup: tutup,
    status: 'ABU_ABU',
    keterangan: sekarang < mulai ? 'Jadwal upload belum dibuka' : 'Menunggu upload',
    uploadedAt: null,
  };
}

function statusKewajibanPeriode(
  tipe: Extract<TipeKewajiban, 'progress-mingguan' | 'progress-bulanan'>,
  label: string,
  mulaiPeriode: string,
  tanggalDeadline: string,
  buka: string,
  tutup: string,
  uploads: Date[],
  sekarang: Date,
): KewajibanUpload {
  const uploadTepatWaktu = uploads.find((item) => {
    const tanggal = ymdWita(item);
    const mulai = batasWita(tanggal, buka);
    const akhir = batasWita(tanggal, tutup);
    return tanggal >= mulaiPeriode && tanggal <= tanggalDeadline && item >= mulai && item < akhir;
  }) ?? null;
  const uploadLain = uploads[0] ?? null;
  const deadline = batasWita(tanggalDeadline, tutup);

  if (uploadTepatWaktu) {
    return {
      tanggal: tanggalDeadline,
      tipe,
      label,
      jamBuka: buka,
      jamTutup: tutup,
      status: 'HIJAU',
      keterangan: 'Sudah upload tepat waktu',
      uploadedAt: uploadTepatWaktu,
    };
  }

  if (uploadLain) {
    return {
      tanggal: tanggalDeadline,
      tipe,
      label,
      jamBuka: buka,
      jamTutup: tutup,
      status: 'ORANYE',
      keterangan: 'Upload di luar batas waktu',
      uploadedAt: uploadLain,
    };
  }

  return {
    tanggal: tanggalDeadline,
    tipe,
    label,
    jamBuka: buka,
    jamTutup: tutup,
    status: sekarang >= deadline ? 'MERAH' : 'ABU_ABU',
    keterangan: sekarang >= deadline ? 'Tidak upload pada periode tersebut' : 'Menunggu upload',
    uploadedAt: null,
  };
}

@Injectable()
export class EpromPerformanceVendorService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly akses: EpromAksesService,
  ) {}

  async daftar(aktor: AktorEprom, bulan?: string) {
    const periode = periodeBulan(bulan);
    const projects = await this.prisma.project.findMany({
      where: this.akses.isOwner(aktor)
        ? undefined
        : { kontrak: { vendorId: aktor.vendorId ?? -1 } },
      include: {
        kontrak: {
          include: {
            tender: { select: { id: true, namaTender: true } },
            vendor: { select: { id: true, namaVendor: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const aktif = projects.filter((project) => {
      const mulai = tanggalKontrak(project.kontrak.tanggalMulai);
      const selesai = tanggalKontrak(project.kontrak.tanggalSelesai);
      return mulai <= periode.selesai && selesai >= periode.mulai;
    });

    const hasil = await Promise.all(aktif.map((project) => this.hitung(project, periode, false)));
    return { bulan: periode.bulan, items: hasil };
  }

  async detail(aktor: AktorEprom, projectId: number, bulan?: string) {
    await this.akses.wajibAksesProject(aktor, projectId);
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: {
        kontrak: {
          include: {
            tender: { select: { id: true, namaTender: true } },
            vendor: { select: { id: true, namaVendor: true } },
          },
        },
      },
    });

    if (!project) throw new NotFoundException('Project tidak ditemukan');
    return this.hitung(project, periodeBulan(bulan), true);
  }

  private async hitung(
    project: Awaited<ReturnType<EpromPerformanceVendorService['projectDenganRelasi']>>,
    periode: ReturnType<typeof periodeBulan>,
    sertakanKewajiban: boolean,
  ) {
    const kontrakMulai = tanggalKontrak(project.kontrak.tanggalMulai);
    const kontrakSelesai = tanggalKontrak(project.kontrak.tanggalSelesai);
    const mulaiAktif = new Date(Math.max(kontrakMulai.getTime(), periode.mulai.getTime()));
    const selesaiAktif = new Date(Math.min(kontrakSelesai.getTime(), periode.selesai.getTime()));
    const hariKerja = mulaiAktif <= selesaiAktif ? daftarHariKerja(mulaiAktif, selesaiAktif) : [];

    const [inspeksiArea, inspeksiPeralatan, progressHarian, progressMingguan, progressBulanan, tta, kta, jsa, mom] =
      await Promise.all([
        this.prisma.inspeksiAreaPekerjaan.findMany({
          where: { projectId: project.id, uploadedAt: { gte: periode.mulaiTimestampUtc, lt: periode.akhirEksklusifUtc } },
          select: { uploadedAt: true },
        }),
        this.prisma.inspeksiPeralatan.findMany({
          where: { projectId: project.id, uploadedAt: { gte: periode.mulaiTimestampUtc, lt: periode.akhirEksklusifUtc } },
          select: { uploadedAt: true },
        }),
        this.prisma.progressHarian.findMany({
          where: { projectId: project.id, uploadedAt: { gte: periode.mulaiTimestampUtc, lt: periode.akhirEksklusifUtc } },
          select: { uploadedAt: true },
        }),
        this.prisma.progressMingguan.findMany({
          where: { projectId: project.id, uploadedAt: { gte: periode.mulaiTimestampUtc, lt: periode.akhirEksklusifUtc } },
          orderBy: [{ mingguKe: 'desc' }, { id: 'desc' }],
          select: { id: true, mingguKe: true, namaPekerjaan: true, planned: true, actual: true, uploadedAt: true },
        }),
        this.prisma.progressBulanan.findMany({
          where: {
            projectId: project.id,
            bulan: periode.bulan,
            uploadedAt: { gte: periode.mulaiTimestampUtc, lt: periode.akhirEksklusifUtc },
          },
          select: { uploadedAt: true },
        }),
        this.prisma.tTA.count({
          where: {
            projectId: project.id,
            bulan: periode.bulan,
            tanggalUpload: { gte: periode.mulaiTimestampUtc, lt: periode.akhirEksklusifUtc },
          },
        }),
        this.prisma.kTA.count({
          where: {
            projectId: project.id,
            bulan: periode.bulan,
            tanggalUpload: { gte: periode.mulaiTimestampUtc, lt: periode.akhirEksklusifUtc },
          },
        }),
        this.prisma.jSA.findMany({
          where: {
            projectId: project.id,
            status: StatusApprovalEprom.APPROVED,
            createdAt: { gte: periode.mulaiTimestampUtc, lt: periode.akhirEksklusifUtc },
          },
          include: { sosialisasi: { select: { id: true, createdAt: true, fileUrl: true } } },
        }),
        this.prisma.mOM.findMany({
          where: {
            meeting: { projectId: project.id },
            dueDate: { gte: kontrakMulai, lte: periode.selesai },
          },
          select: { dueDate: true, statusClose: true, hariTerlambat: true },
        }),
      ]);

    const perTanggal = (uploads: { uploadedAt: Date }[]) => {
      const peta = new Map<string, Date[]>();
      for (const item of uploads) {
        const tanggal = ymdWita(item.uploadedAt);
        peta.set(tanggal, [...(peta.get(tanggal) ?? []), item.uploadedAt]);
      }
      return peta;
    };

    const petaHarian = {
      'inspeksi-area': perTanggal(inspeksiArea),
      'inspeksi-peralatan': perTanggal(inspeksiPeralatan),
      'progress-harian': perTanggal(progressHarian),
    };
    const sekarang = new Date();
    const kewajiban: KewajibanUpload[] = [];

    for (const hari of hariKerja) {
      const tanggal = ymd(hari);
      for (const jadwal of JADWAL_HARIAN) {
        kewajiban.push(
          statusKewajiban(
            jadwal.tipe,
            jadwal.label,
            tanggal,
            jadwal.buka,
            jadwal.tutup,
            petaHarian[jadwal.tipe].get(tanggal) ?? [],
            sekarang,
          ),
        );
      }
    }

    const hariPerMinggu = new Map<string, Date[]>();
    for (const hari of hariKerja) {
      const key = isoMinggu(hari);
      hariPerMinggu.set(key, [...(hariPerMinggu.get(key) ?? []), hari]);
    }
    for (const [key, days] of hariPerMinggu) {
      const deadline = days[days.length - 1];
      const tanggal = ymd(deadline);
      const uploads = progressMingguan
        .filter((item) => isoMinggu(tanggalDariYmd(ymdWita(item.uploadedAt))) === key)
        .map((item) => item.uploadedAt);
      const awalMingguDate = new Date(days[0].getTime());
      awalMingguDate.setUTCDate(awalMingguDate.getUTCDate() - ((awalMingguDate.getUTCDay() + 6) % 7));
      const awalMinggu = ymd(awalMingguDate);
      const status = statusKewajibanPeriode(
        'progress-mingguan',
        'Progress Mingguan',
        awalMinggu,
        tanggal,
        '08:00',
        '22:00',
        uploads,
        sekarang,
      );
      status.keterangan = status.status === 'MERAH'
        ? `Tidak upload pada minggu ${awalMinggu} s.d. ${tanggal}`
        : status.keterangan;
      kewajiban.push(status);
    }

    if (hariKerja.length > 0) {
      const deadline = ymd(hariKerja[hariKerja.length - 1]);
      kewajiban.push(
        statusKewajibanPeriode(
          'progress-bulanan',
          'Progress Bulanan',
          ymd(periode.mulai),
          deadline,
          '08:00',
          '22:00',
          progressBulanan.map((item) => item.uploadedAt),
          sekarang,
        ),
      );
    }

    kewajiban.sort((a, b) => b.tanggal.localeCompare(a.tanggal) || a.label.localeCompare(b.label));
    const jatuhTempo = kewajiban.filter((item) => item.status !== 'ABU_ABU');
    const jumlahStatus = {
      hijau: kewajiban.filter((item) => item.status === 'HIJAU').length,
      merah: kewajiban.filter((item) => item.status === 'MERAH').length,
      abuAbu: kewajiban.filter((item) => item.status === 'ABU_ABU').length,
      oranye: kewajiban.filter((item) => item.status === 'ORANYE').length,
    };
    const nilaiUpload = jatuhTempo.length === 0
      ? null
      : bulat(((jumlahStatus.hijau + jumlahStatus.oranye * 0.5) / jatuhTempo.length) * 100);

    const terbaruPerPekerjaan = new Map<string, (typeof progressMingguan)[number]>();
    for (const item of progressMingguan) {
      if (!terbaruPerPekerjaan.has(item.namaPekerjaan)) terbaruPerPekerjaan.set(item.namaPekerjaan, item);
    }
    const terbaru = [...terbaruPerPekerjaan.values()];
    const totalPlanned = bulat(terbaru.reduce((sum, item) => sum + Number(item.planned), 0));
    const totalActual = bulat(terbaru.reduce((sum, item) => sum + Number(item.actual), 0));
    const deviasi = bulat(totalActual - totalPlanned);
    const skorDeviasi = terbaru.length === 0 ? null : nilaiDeviasi(deviasi);

    const seluruhHariKerjaBulan = daftarHariKerja(periode.mulai, periode.selesai).length;
    const targetPeriode = hariKerja.length === 0
      ? 0
      : Math.max(1, Math.ceil(TARGET_TTA_KTA_BULANAN * (hariKerja.length / seluruhHariKerjaBulan)));
    const hariBerlalu = hariKerja.filter((hari) => batasWita(ymd(hari), '22:00') <= sekarang).length;
    const targetJatuhTempo = targetPeriode === 0 || hariBerlalu === 0
      ? 0
      : Math.max(1, Math.ceil(targetPeriode * (hariBerlalu / hariKerja.length)));
    const nilaiTta = targetJatuhTempo === 0 ? null : Math.min(100, bulat((tta / targetJatuhTempo) * 100));
    const nilaiKta = targetJatuhTempo === 0 ? null : Math.min(100, bulat((kta / targetJatuhTempo) * 100));
    const nilaiTtaKta = nilaiTta === null || nilaiKta === null ? null : bulat((nilaiTta + nilaiKta) / 2);

    const jsaLengkap = jsa.filter((item) => item.sosialisasi?.fileUrl).length;
    const nilaiJsa = jsa.length === 0 ? null : bulat((jsaLengkap / jsa.length) * 100);

    const tanggalHariIni = tanggalDariYmd(ymdWita(sekarang));
    const batasDue = new Date(Math.min(tanggalHariIni.getTime() - 1, periode.selesai.getTime()));
    const picaJatuhTempo = mom.filter((item) => item.dueDate <= batasDue);
    const picaTepatWaktu = picaJatuhTempo.filter(
      (item) => item.statusClose && (item.hariTerlambat ?? 0) <= 0,
    ).length;
    const picaTerlambat = picaJatuhTempo.filter(
      (item) => item.statusClose && (item.hariTerlambat ?? 0) > 0,
    ).length;
    const picaBelumSelesai = picaJatuhTempo.filter((item) => !item.statusClose).length;
    const nilaiPicaMom = picaJatuhTempo.length === 0
      ? null
      : bulat(
          picaJatuhTempo.reduce(
            (sum, item) => sum + (item.statusClose ? nilaiPica(item.hariTerlambat ?? 0) : 0),
            0,
          ) / picaJatuhTempo.length,
        );

    const komponen: KomponenNilai[] = [
      {
        key: 'upload',
        label: 'Disiplin Upload',
        bobot: BOBOT.upload,
        nilai: nilaiUpload,
        keterangan: `${jumlahStatus.hijau} tepat waktu, ${jumlahStatus.oranye} terlambat, ${jumlahStatus.merah} tidak upload`,
      },
      {
        key: 'deviasi',
        label: 'Deviasi Progress',
        bobot: BOBOT.deviasi,
        nilai: skorDeviasi,
        keterangan: terbaru.length === 0 ? 'Belum ada data progress' : `Actual ${totalActual}% - Planned ${totalPlanned}% = ${deviasi}%`,
      },
      {
        key: 'ttaKta',
        label: 'TTA & KTA',
        bobot: BOBOT.ttaKta,
        nilai: nilaiTtaKta,
        keterangan: `TTA ${tta}/${targetJatuhTempo || targetPeriode}, KTA ${kta}/${targetJatuhTempo || targetPeriode} (target penuh ${targetPeriode})`,
      },
      {
        key: 'jsa',
        label: 'JSA & Sosialisasi',
        bobot: BOBOT.jsa,
        nilai: nilaiJsa,
        keterangan: `${jsaLengkap} dari ${jsa.length} JSA approved memiliki sosialisasi`,
      },
      {
        key: 'pica',
        label: 'PICA MOM',
        bobot: BOBOT.pica,
        nilai: nilaiPicaMom,
        keterangan: `${picaTepatWaktu} tepat waktu, ${picaTerlambat} terlambat, ${picaBelumSelesai} belum selesai`,
      },
    ];

    const tersedia = komponen.filter((item) => item.nilai !== null);
    const totalBobot = tersedia.reduce((sum, item) => sum + item.bobot, 0);
    const nilaiAkhir = totalBobot === 0
      ? 0
      : bulat(tersedia.reduce((sum, item) => sum + item.nilai! * item.bobot, 0) / totalBobot);
    const semuaSempurna = tersedia.length > 0 && tersedia.every((item) => item.nilai === 100);

    return {
      bulan: periode.bulan,
      project: {
        id: project.id,
        namaProject: project.namaProject,
        tender: project.kontrak.tender,
        vendor: project.kontrak.vendor,
        kontrak: {
          id: project.kontrak.id,
          nomorKontrak: project.kontrak.nomorKontrak,
          tanggalMulai: project.kontrak.tanggalMulai,
          tanggalSelesai: project.kontrak.tanggalSelesai,
        },
      },
      nilaiAkhir,
      grade: grade(nilaiAkhir, semuaSempurna),
      komponen,
      upload: {
        ...jumlahStatus,
        jatuhTempo: jatuhTempo.length,
        total: kewajiban.length,
        kewajiban: sertakanKewajiban ? kewajiban : undefined,
      },
    };
  }

  /** Hanya dipakai untuk menjaga tipe hasil include di method hitung. */
  private projectDenganRelasi() {
    return this.prisma.project.findFirstOrThrow({
      include: {
        kontrak: {
          include: {
            tender: { select: { id: true, namaTender: true } },
            vendor: { select: { id: true, namaVendor: true } },
          },
        },
      },
    });
  }
}
