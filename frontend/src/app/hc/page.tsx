'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Database,
  FileText,
  FileX2,
  GraduationCap,
  HeartHandshake,
  HeartPulse,
  LifeBuoy,
  Mail,
  MessageSquareText,
  Plane,
  Scale,
  UsersRound,
  UserCircle2,
  Video,
  Wallet,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import {
  ACCESS_KEYS,
  clearSession,
  formatRole,
  getAccessToken,
  getStoredUser,
  hasAccess,
  type PortalUser,
  saveStoredUser,
} from '@/lib/access-control';
import { MenuTree, type MenuTreeNode } from '@/components/menu-tree/menu-tree';
import { ambilRingkasanApproval, type RingkasanApproval } from '@/lib/approval-summary-api';
import { mcuApi, type RingkasanMcu } from '@/lib/mcu-api';
import styles from './hc.module.css';

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

/** Total item yang perlu ditindaklanjuti di MCU, dari ringkasan yang sama dipakai halaman /hc/mcu sendiri. */
function totalPendingMcu(r: RingkasanMcu | null): number | undefined {
  if (!r) return undefined;
  return (
    r.reminderJatuhTempo +
    r.jadwalDraft +
    r.suratMenungguKirim +
    r.hasilMenungguReview +
    r.rekomendasiBelumDiteruskan +
    r.followUpTerlambat +
    r.induksiMenunggu
  );
}

function buatHcTree(approval: RingkasanApproval | null, mcuRingkasan: RingkasanMcu | null): MenuTreeNode[] {
  return [
  {
    key: 'HC_KARYAWAN',
    title: 'Database Karyawan',
    description: 'Master data seluruh karyawan.',
    icon: Database,
    accessKey: ACCESS_KEYS.HC_KARYAWAN,
    accent: '#0a7f8c',
    soft: '#e2f5f7',
    children: [
      {
        key: 'HC_KARYAWAN_DATA',
        title: 'Database Karyawan',
        description:
          'Master data seluruh karyawan (NIK, departemen, jabatan, status kerja) - dipakai bersama card HC lain.',
        status: 'Tersedia',
        href: '/hc/karyawan',
        icon: Database,
        accessKey: ACCESS_KEYS.HC_KARYAWAN,
        accent: '#0a7f8c',
        soft: '#e2f5f7',
      },
    ],
  },
  {
    key: 'HC_IR',
    title: 'PORTAL IR',
    description: 'Industrial Relations.',
    icon: Scale,
    accessKey: ACCESS_KEYS.HC_IR,
    accent: '#0783a8',
    soft: '#e5f7fb',
    children: [
      {
        key: 'HC_IR_DOKUMEN',
        title: 'Upload Dokumen',
        description:
          'Dokumen SK, IM, dan FORM. Admin/Admin HC/Section Head mengunggah, akun lain melihat & mengunduh.',
        status: 'Tersedia',
        href: '/hc/ir/dokumen',
        icon: Database,
        accessKey: ACCESS_KEYS.HC_IR,
        accent: '#0783a8',
        soft: '#e5f7fb',
      },
      {
        key: 'HC_IR_ASPIRASI',
        title: 'Aspirasi Karyawan',
        description:
          'Pertanyaan pilihan ganda/essay disusun Admin HC; karyawan menjawab, jawaban tercatat nama & NRP.',
        status: 'Tersedia',
        href: '/hc/ir/aspirasi',
        icon: MessageSquareText,
        accessKey: ACCESS_KEYS.HC_IR,
        accent: '#0783a8',
        soft: '#e5f7fb',
      },
      {
        key: 'HC_IR_COURSE',
        title: 'IR Course',
        description:
          'Video pelatihan diunggah Admin HC lengkap judulnya; status tontonan tiap akun tercatat.',
        status: 'Tersedia',
        href: '/hc/ir/course',
        icon: Video,
        accessKey: ACCESS_KEYS.HC_IR,
        accent: '#0783a8',
        soft: '#e5f7fb',
      },
    ],
  },
  {
    key: 'HC_RND',
    title: 'R & D',
    description: 'Research & Development.',
    icon: HeartHandshake,
    accessKey: ACCESS_KEYS.HC_RND,
    accent: '#d97706',
    soft: '#fff2df',
    children: [
      {
        key: 'HC_DEKLARASI',
        title: 'Deklarasi Dinas',
        description:
          'Aplikasi pengelolaan deklarasi perjalanan dinas dan uang operasional.',
        status: 'Tersedia',
        href: '/hc/deklarasi-dinas',
        icon: FileText,
        accessKey: ACCESS_KEYS.HC_DEKLARASI,
        accent: '#d97706',
        soft: '#fff2df',
        pendingCount: approval
          ? approval.deklarasiPengajuan + approval.deklarasiNota + approval.deklarasiSaldo
          : undefined,
      },
      {
        key: 'HC_TUGAS_DINAS',
        title: 'Form Tugas Dinas',
        description:
          'Buat Surat Tugas Dinas otomatis jadi PDF, lengkap alur persetujuan SH & PJO.',
        status: 'Tersedia',
        href: '/hc/tugas-dinas',
        icon: Plane,
        accessKey: ACCESS_KEYS.HC_TUGAS_DINAS,
        accent: '#d97706',
        soft: '#fff2df',
        pendingCount: approval?.suratTugasDinas,
      },
      {
        key: 'HC_ANAK_MAGANG',
        title: 'Database Anak Magang',
        description:
          'Master data mahasiswa magang, dipakai bersama Surat Balasan & Surat Penolakan Magang.',
        status: 'Tersedia',
        href: '/hc/anak-magang',
        icon: GraduationCap,
        accessKey: ACCESS_KEYS.HC_ANAK_MAGANG,
        accent: '#d97706',
        soft: '#fff2df',
      },
      {
        key: 'HC_SURAT_BALASAN_MAGANG',
        title: 'Surat Balasan Magang',
        description:
          'Surat persetujuan permohonan magang industri otomatis jadi PDF.',
        status: 'Tersedia',
        href: '/hc/surat-balasan-magang',
        icon: Mail,
        accessKey: ACCESS_KEYS.HC_SURAT_BALASAN_MAGANG,
        accent: '#d97706',
        soft: '#fff2df',
      },
      {
        key: 'HC_SURAT_PENOLAKAN_MAGANG',
        title: 'Surat Penolakan Magang',
        description:
          'Surat penolakan permohonan magang industri otomatis jadi PDF.',
        status: 'Tersedia',
        href: '/hc/surat-penolakan-magang',
        icon: FileX2,
        accessKey: ACCESS_KEYS.HC_SURAT_PENOLAKAN_MAGANG,
        accent: '#d97706',
        soft: '#fff2df',
      },
    ],
  },
  {
    key: 'HC_COMBEN',
    title: 'Comben & Benefit',
    description: 'Compensation & Benefit.',
    icon: Wallet,
    accessKey: ACCESS_KEYS.HC_COMBEN,
    accent: '#07984c',
    soft: '#e4f7ec',
    children: [
      {
        key: 'HC_MCU',
        title: 'MCU Periodik',
        description:
          'Monitoring Medical Check Up periodik: jadwal, hasil, rekomendasi FIT/Follow Up, sampai induksi ulang.',
        status: 'Tersedia',
        href: '/hc/mcu',
        icon: HeartPulse,
        accessKey: ACCESS_KEYS.HC_MCU,
        accent: '#07984c',
        soft: '#e4f7ec',
        pendingCount: totalPendingMcu(mcuRingkasan),
      },
      {
        key: 'HC_HELPDESK',
        title: 'Helpdesk Center',
        description:
          'Pelaporan kendala, tiket, dan riwayat penyelesaian oleh Admin/Admin HC.',
        status: 'Tersedia',
        href: '/hc/helpdesk',
        icon: LifeBuoy,
        accessKey: ACCESS_KEYS.HC_HELPDESK,
        accent: '#c2410c',
        soft: '#ffeee4',
      },
    ],
  },
  ];
}

export default function HcPage() {
  const router = useRouter();
  const [user, setUser] = useState<PortalUser | null>(null);
  const [approval, setApproval] = useState<RingkasanApproval | null>(null);
  const [mcuRingkasan, setMcuRingkasan] = useState<RingkasanMcu | null>(null);

  useEffect(() => {
    void ambilRingkasanApproval().then(setApproval);
    mcuApi.ambil<RingkasanMcu>('/ringkasan').then(setMcuRingkasan).catch(() => setMcuRingkasan(null));
  }, []);

  useEffect(() => {
    let active = true;

    async function loadUser() {
      const token = getAccessToken();
      const stored = getStoredUser();

      if (!token || !stored) {
        clearSession();
        router.replace('/login');
        return;
      }

      let current = stored;

      try {
        const response = await fetch(`${API_URL}/auth/profile`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: 'no-store',
        });

        if (response.status === 401) {
          clearSession();
          router.replace('/login');
          return;
        }

        if (response.ok) {
          current = (await response.json()) as PortalUser;
          saveStoredUser(current);
        }
      } catch {
        // Gunakan data login terakhir saat backend sementara tidak terjangkau.
      }

      if (!hasAccess(current, ACCESS_KEYS.HC)) {
        router.replace('/dashboard');
        return;
      }

      if (active) {
        setUser(current);
      }
    }

    void loadUser();

    return () => {
      active = false;
    };
  }, [router]);

  const bolehLihat = useMemo(
    () => (accessKey: string) => hasAccess(user, accessKey),
    [user],
  );

  const hcTree = useMemo(() => buatHcTree(approval, mcuRingkasan), [approval, mcuRingkasan]);

  if (!user) {
    return <main className={styles.page}>Memuat pilihan HC...</main>;
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link href="/dashboard" className={styles.brand}>
          <span className={styles.brandLogo}>
            <UsersRound size={24} />
          </span>
          <strong>HCGA TEAM</strong>
        </Link>

        <div className={styles.profile}>
          <span className={styles.profileIcon}>
            <UsersRound size={22} />
          </span>
          <div>
            <strong>{user.name}</strong>
            <span>{formatRole(user.role)}</span>
          </div>
        </div>
      </header>

      <section className={styles.main}>
        <div className={styles.container}>
          <Link href="/dashboard" className={styles.backButton}>
            <ArrowLeft size={18} />
            Kembali ke Dashboard
          </Link>

          <div className={styles.titleSection}>
            <span className={styles.gaIcon}>
              <UserCircle2 size={31} />
            </span>
            <div>
              <h1>HC (Human Capital)</h1>
              <p>Pilih layanan dan pengelolaan data Human Capital.</p>
            </div>
          </div>

          <MenuTree nodes={hcTree} bolehLihat={bolehLihat} />
        </div>
      </section>

      <footer className={styles.footer}>
        <span>© 2026 HCGA TEAM. Semua hak dilindungi.</span>
        <span>|</span>
        <span>Portal Internal</span>
        <span>|</span>
        <span>v1.0.0</span>
      </footer>
    </main>
  );
}
