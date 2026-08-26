'use client';

// ==================================================
// FILE: frontend/src/app/dashboard/page.tsx
// FUNGSI: Dashboard awal portal HCGA TEAM
// ==================================================

import {
  Bell,
  BookOpen,
  Building2,
  ChevronLeft,
  ChevronRight,
  Download,
  FileText,
  HandHeart,
  HardHat,
  HeartPulse,
  Image as ImageIcon,
  KeyRound,
  Link2,
  LogOut,
  Megaphone,
  PlayCircle,
  Save,
  Scale,
  Ticket,
  UserCog,
  UsersRound,
  Video,
  X,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ACCESS_KEYS, hasAccess, saveStoredUser } from '@/lib/access-control';
import {
  postinganApi,
  urlMediaPostingan,
  type Postingan,
} from '@/lib/postingan-api';
import {
  aktivitasApi,
  LABEL_JENIS_AKTIVITAS,
  type AktivitasItem,
  type JenisAktivitas,
} from '@/lib/aktivitas-api';
import styles from './dashboard.module.css';

// ==================================================
// TIPE DATA USER LOGIN
// ==================================================

interface LoginUser {
  id: number;
  name: string;
  username: string;
  role: string;
  accessKeys?: string[];
}

// ==================================================
// DATA SLIDER
// ==================================================

const slides = [
  {
    label: 'INFORMASI TERBARU',
    title: 'Satu Portal, Semua Informasi.',
    subtitle: 'Kerja Lebih Mudah, Tim Lebih Solid.',
  },
  {
    label: 'PORTAL INTERNAL',
    title: 'Akses Informasi Lebih Cepat.',
    subtitle: 'Seluruh kebutuhan HCGA dalam satu portal.',
  },
  {
    label: 'HCGA TEAM',
    title: 'Kolaborasi Menjadi Lebih Mudah.',
    subtitle: 'Terhubung bersama HC, GA, CIVIL, dan Administrasi.',
  },
];

function formatTanggalPendek(iso: string) {
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(iso));
}

// ==================================================
// DATA DEPARTEMEN UTAMA
// ==================================================

const departmentCards: Array<{
  key: string;
  title: string;
  href: string;
  icon: React.ElementType;
  cardClass: 'hcCard' | 'gaCard' | 'sipilCard' | 'administrasiCard';
  accessKey: string;
}> = [
  {
    key: 'HC',
    title: 'HC',
    href: '/hc',
    icon: UsersRound,
    cardClass: 'hcCard',
    accessKey: ACCESS_KEYS.HC,
  },
  {
    key: 'GA',
    title: 'GA',
    href: '/ga',
    icon: Building2,
    cardClass: 'gaCard',
    accessKey: ACCESS_KEYS.GA,
  },
  {
    key: 'CIVIL',
    title: 'CIVIL',
    href: '/civil',
    icon: HardHat,
    cardClass: 'sipilCard',
    accessKey: ACCESS_KEYS.CIVIL,
  },
  {
    key: 'ADMINISTRASI',
    title: 'ADMINISTRASI',
    href: '/administrasi',
    icon: BookOpen,
    cardClass: 'administrasiCard',
    accessKey: ACCESS_KEYS.ADMINISTRASI,
  },
];

// ==================================================
// DATA AKTIVITAS
// ==================================================

const IKON_AKTIVITAS: Record<
  JenisAktivitas,
  { icon: React.ElementType; kelas: 'blue' | 'green' | 'orange' | 'purple' }
> = {
  POSTINGAN_POSTER: { icon: ImageIcon, kelas: 'blue' },
  POSTINGAN_VIDEO: { icon: Video, kelas: 'purple' },
  DOKUMEN_IR: { icon: FileText, kelas: 'orange' },
  IR_COURSE: { icon: PlayCircle, kelas: 'green' },
};

// ==================================================
// HALAMAN DASHBOARD
// ==================================================

export default function DashboardPage() {
  const router = useRouter();

  const [user, setUser] = useState<LoginUser | null>(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [postinganList, setPostinganList] = useState<Postingan[]>([]);
  const [mediaPreview, setMediaPreview] = useState<Postingan | null>(null);
  const [posterSlide, setPosterSlide] = useState(0);
  const [videoSlide, setVideoSlide] = useState(0);
  const [aktivitasList, setAktivitasList] = useState<AktivitasItem[]>([]);

  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);

  const [profileName, setProfileName] = useState('');
  const [profileUsername, setProfileUsername] = useState('');

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [accountLoading, setAccountLoading] = useState(false);
  const [accountMessage, setAccountMessage] = useState('');
  const [accountError, setAccountError] = useState('');

  // ==================================================
  // AMBIL DATA USER LOGIN
  // ==================================================

  useEffect(() => {
    const accessToken =
      localStorage.getItem('hcga_access_token') ||
      sessionStorage.getItem('hcga_access_token');

    const savedUser =
      localStorage.getItem('hcga_user') ||
      sessionStorage.getItem('hcga_user');

    if (!accessToken || !savedUser) {
      router.replace('/login');
      return;
    }

    try {
      const parsedUser = JSON.parse(savedUser) as LoginUser;

      if (parsedUser.role === 'DRIVER') {
        router.replace('/transport-saya/driver');
        return;
      }

      setUser(parsedUser);

      void fetch('http://localhost:3001/api/auth/profile', {
        headers: { Authorization: `Bearer ${accessToken}` },
        cache: 'no-store',
      })
        .then(async (response) => {
          if (!response.ok) return;
          const latestUser = (await response.json()) as LoginUser;
          saveStoredUser(latestUser);
          setUser(latestUser);
        })
        .catch(() => undefined);
    } catch {
      localStorage.removeItem('hcga_access_token');
      localStorage.removeItem('hcga_user');
      sessionStorage.removeItem('hcga_access_token');
      sessionStorage.removeItem('hcga_user');

      router.replace('/login');
    }
  }, [router]);

  // ==================================================
  // POSTINGAN - PAPAN POSTER & VIDEO INFORMASI (section terpisah,
  // tidak ikut campur di hero)
  // ==================================================

  useEffect(() => {
    postinganApi
      .beranda()
      .then(setPostinganList)
      .catch(() => setPostinganList([]));
  }, []);

  const posterList = postinganList.filter((item) => item.tipe === 'POSTER');
  const videoList = postinganList.filter((item) => item.tipe === 'VIDEO');

  function prevPoster() {
    setPosterSlide((current) =>
      current === 0 ? posterList.length - 1 : current - 1,
    );
  }

  function nextPoster() {
    setPosterSlide((current) =>
      current === posterList.length - 1 ? 0 : current + 1,
    );
  }

  function prevVideo() {
    setVideoSlide((current) =>
      current === 0 ? videoList.length - 1 : current - 1,
    );
  }

  function nextVideo() {
    setVideoSlide((current) =>
      current === videoList.length - 1 ? 0 : current + 1,
    );
  }

  // ==================================================
  // AKSES CEPAT & AKTIVITAS TERBARU - khusus Admin/Admin HC/
  // Admin Comben/Section Head
  // ==================================================

  const bisaLihatPanelAdmin =
    user?.role === 'ADMIN' ||
    user?.role === 'SUPER_ADMIN' ||
    user?.role === 'ADMIN_COMBEN' ||
    user?.role === 'SECTION_HEAD';

  useEffect(() => {
    if (!bisaLihatPanelAdmin) {
      setAktivitasList([]);
      return;
    }

    aktivitasApi.terbaru().then(setAktivitasList);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bisaLihatPanelAdmin]);

  // ==================================================
  // SLIDER OTOMATIS (banner hero - selalu 3 slide bawaan)
  // ==================================================

  useEffect(() => {
    const interval = window.setInterval(() => {
      setCurrentSlide((current) =>
        current === slides.length - 1 ? 0 : current + 1,
      );
    }, 5000);

    return () => window.clearInterval(interval);
  }, []);

  function previousSlide() {
    setCurrentSlide((current) =>
      current === 0 ? slides.length - 1 : current - 1,
    );
  }

  function nextSlide() {
    setCurrentSlide((current) =>
      current === slides.length - 1 ? 0 : current + 1,
    );
  }

  function formatRole(role?: string) {
    if (!role) {
      return '';
    }

    return role
      .toLowerCase()
      .split('_')
      .map(
        (part) =>
          part.charAt(0).toUpperCase() + part.slice(1),
      )
      .join(' ');
  }

  function getAccessToken() {
    return (
      localStorage.getItem('hcga_access_token') ||
      sessionStorage.getItem('hcga_access_token')
    );
  }

  function saveLoginData(
    updatedUser: LoginUser,
    accessToken?: string,
  ) {
    const useLocalStorage =
      localStorage.getItem('hcga_access_token') !== null;

    const storage = useLocalStorage
      ? localStorage
      : sessionStorage;

    storage.setItem(
      'hcga_user',
      JSON.stringify(updatedUser),
    );

    if (accessToken) {
      storage.setItem('hcga_access_token', accessToken);
    }

    setUser(updatedUser);
  }

  function clearMessages() {
    setAccountMessage('');
    setAccountError('');
  }

  function openProfileModal() {
    if (!user) {
      return;
    }

    clearMessages();
    setProfileName(user.name);
    setProfileUsername(user.username);
    setProfileMenuOpen(false);
    setProfileModalOpen(true);
  }

  function openPasswordModal() {
    clearMessages();
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setProfileMenuOpen(false);
    setPasswordModalOpen(true);
  }

  function logout() {
    localStorage.removeItem('hcga_access_token');
    localStorage.removeItem('hcga_user');
    sessionStorage.removeItem('hcga_access_token');
    sessionStorage.removeItem('hcga_user');

    router.replace('/login');
    router.refresh();
  }

  async function updateProfile(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const token = getAccessToken();

    if (!token) {
      logout();
      return;
    }

    setAccountLoading(true);
    clearMessages();

    try {
      const response = await fetch(
        'http://localhost:3001/api/auth/profile',
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            name: profileName,
            username: profileUsername,
          }),
        },
      );

      const result = await response.json();

      if (!response.ok) {
        const message = Array.isArray(result.message)
          ? result.message[0]
          : result.message;

        throw new Error(
          message || 'Profil gagal diperbarui',
        );
      }

      saveLoginData(result.user, result.accessToken);
      setAccountMessage('Profil berhasil diperbarui');
    } catch (error) {
      setAccountError(
        error instanceof Error
          ? error.message
          : 'Profil gagal diperbarui',
      );
    } finally {
      setAccountLoading(false);
    }
  }

  async function changePassword(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const token = getAccessToken();

    if (!token) {
      logout();
      return;
    }

    setAccountLoading(true);
    clearMessages();

    try {
      const response = await fetch(
        'http://localhost:3001/api/auth/change-password',
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            currentPassword,
            newPassword,
            confirmPassword,
          }),
        },
      );

      const result = await response.json();

      if (!response.ok) {
        const message = Array.isArray(result.message)
          ? result.message[0]
          : result.message;

        throw new Error(
          message || 'Password gagal diperbarui',
        );
      }

      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setAccountMessage(
        result.message || 'Password berhasil diperbarui',
      );
    } catch (error) {
      setAccountError(
        error instanceof Error
          ? error.message
          : 'Password gagal diperbarui',
      );
    } finally {
      setAccountLoading(false);
    }
  }

  if (!user) {
    return (
      <main className={styles.loadingPage}>
        Memuat dashboard...
      </main>
    );
  }

  return (
    <main className={styles.page}>
      {/* ==================================================
          HEADER
      ================================================== */}

      <header className={styles.header}>
        <div className={styles.brand}>
          <div className={styles.brandLogo}>
            <UsersRound size={24} />
          </div>

          <span>HCGA TEAM</span>
        </div>

        <div className={styles.headerRight}>
          <button
            type="button"
            className={styles.notificationButton}
            aria-label="Tiket & Travel Saya"
            title="Tiket & Travel Saya"
            onClick={() => router.push('/transport-saya')}
          >
            <Ticket size={24} />
          </button>

          <button
            type="button"
            className={styles.notificationButton}
            aria-label="Notifikasi"
          >
            <Bell size={24} />
            <span>3</span>
          </button>

          <div className={styles.profileWrapper}>
            <button
              type="button"
              className={styles.profile}
              onClick={() =>
                setProfileMenuOpen((current) => !current)
              }
              aria-expanded={profileMenuOpen}
            >
              <div className={styles.profileAvatar}>
                <UsersRound size={23} />
              </div>

              <div className={styles.profileIdentity}>
                <strong>{user.name}</strong>
                <span>{formatRole(user.role)}</span>
              </div>

              <ChevronRight
                className={
                  profileMenuOpen
                    ? styles.profileArrowOpen
                    : styles.profileArrow
                }
              />
            </button>

            {profileMenuOpen && (
              <>
                <button
                  type="button"
                  className={styles.menuBackdrop}
                  aria-label="Tutup menu profil"
                  onClick={() => setProfileMenuOpen(false)}
                />

                <div className={styles.profileMenu}>
                  <div className={styles.profileMenuHeader}>
                    <div className={styles.profileMenuAvatar}>
                      <UsersRound size={25} />
                    </div>

                    <div>
                      <strong>{user.name}</strong>
                      <span>{formatRole(user.role)}</span>
                    </div>
                  </div>

                  <div className={styles.profileMenuDivider} />

                  <button
                    type="button"
                    onClick={openProfileModal}
                  >
                    <UserCog size={19} />

                    <span>
                      <strong>Akun Saya</strong>
                      <small>Edit nama dan username</small>
                    </span>
                  </button>

                  {(user.role === 'ADMIN' ||
                    user.role === 'SUPER_ADMIN' ||
                    user.role === 'SECTION_HEAD') && (
                    <button
                      type="button"
                      onClick={() => {
                        setProfileMenuOpen(false);
                        router.push('/admin/manajemen-akun');
                      }}
                    >
                      <UsersRound size={19} />

                      <span>
                        <strong>Manajemen Akun</strong>
                        <small>Atur role dan akses menu akun</small>
                      </span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={openPasswordModal}
                  >
                    <KeyRound size={19} />

                    <span>
                      <strong>Ubah Password</strong>
                      <small>Perbarui keamanan akun</small>
                    </span>
                  </button>

                  <div className={styles.profileMenuDivider} />

                  <button
                    type="button"
                    className={styles.logoutButton}
                    onClick={logout}
                  >
                    <LogOut size={19} />

                    <span>
                      <strong>Keluar</strong>
                      <small>Kembali ke halaman login</small>
                    </span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      <div className={styles.container}>
        {/* ==================================================
            MEDIA SLIDER
        ================================================== */}

        <section className={styles.hero}>
          <button
            type="button"
            className={`${styles.sliderButton} ${styles.sliderLeft}`}
            onClick={previousSlide}
            aria-label="Slide sebelumnya"
          >
            <ChevronLeft />
          </button>

          <div className={styles.heroContent}>
            <span className={styles.heroLabel}>
              {slides[currentSlide].label}
            </span>

            <h1>{slides[currentSlide].title}</h1>
            <h2>{slides[currentSlide].subtitle}</h2>

            <p>
              Temukan informasi, dokumen, dan layanan penting
              untuk mendukung kinerja terbaik setiap hari.
            </p>
          </div>

          <div className={styles.heroVisual}>
            <div className={styles.screenMockup}>
              <strong>HCGA TEAM</strong>

              <div>
                <span className={styles.visualHc}>
                  <UsersRound size={22} />
                  HC
                </span>

                <span className={styles.visualGa}>
                  <Building2 size={22} />
                  GA
                </span>

                <span className={styles.visualSipil}>
                  <HardHat size={22} />
                  CIVIL
                </span>

                <span className={styles.visualAdministrasi}>
                  <BookOpen size={22} />
                  ADMIN.
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            className={`${styles.sliderButton} ${styles.sliderRight}`}
            onClick={nextSlide}
            aria-label="Slide berikutnya"
          >
            <ChevronRight />
          </button>

          <div className={styles.sliderDots}>
            {slides.map((slide, index) => (
              <button
                key={slide.title}
                type="button"
                className={
                  index === currentSlide
                    ? styles.activeDot
                    : ''
                }
                onClick={() => setCurrentSlide(index)}
                aria-label={`Buka slide ${index + 1}`}
              />
            ))}
          </div>
        </section>

        {/* ==================================================
            DEPARTEMEN UTAMA
        ================================================== */}

        <section className={styles.departmentGrid}>
          {departmentCards
            .filter((department) => hasAccess(user, department.accessKey))
            .map((department) => {
              const Icon = department.icon;

              return (
                <button
                  key={department.key}
                  type="button"
                  className={`${styles.departmentCard} ${styles[department.cardClass]}`}
                  onClick={() => router.push(department.href)}
                >
                  <div className={styles.departmentIcon}>
                    <Icon size={34} />
                  </div>

                  <strong>{department.title}</strong>
                  <ChevronRight />
                </button>
              );
            })}
        </section>

        {/* ==================================================
            PAPAN POSTER & VIDEO INFORMASI
        ================================================== */}

        <section className={styles.dashboardContent} style={{ marginTop: 18 }}>
          <article className={styles.panel}>
            <div className={styles.panelHeader}>
              <div>
                <ImageIcon size={19} />
                <h3>Papan Poster</h3>
              </div>
            </div>

            {posterList.length === 0 ? (
              <div className={styles.emptySection}>
                Belum ada poster informasi.
              </div>
            ) : (
              <div className={styles.miniCarousel}>
                <div
                  className={styles.miniCarouselMedia}
                  onClick={() => setMediaPreview(posterList[posterSlide])}
                >
                  <img
                    src={urlMediaPostingan(posterList[posterSlide].urlMedia)}
                    alt={posterList[posterSlide].judul}
                  />

                  {posterList.length > 1 && (
                    <>
                      <button
                        type="button"
                        className={`${styles.miniArrow} ${styles.miniArrowLeft}`}
                        onClick={(event) => {
                          event.stopPropagation();
                          prevPoster();
                        }}
                        aria-label="Poster sebelumnya"
                      >
                        <ChevronLeft size={16} />
                      </button>
                      <button
                        type="button"
                        className={`${styles.miniArrow} ${styles.miniArrowRight}`}
                        onClick={(event) => {
                          event.stopPropagation();
                          nextPoster();
                        }}
                        aria-label="Poster berikutnya"
                      >
                        <ChevronRight size={16} />
                      </button>
                    </>
                  )}
                </div>

                <div className={styles.miniCarouselInfo}>
                  <strong>{posterList[posterSlide].judul}</strong>
                  <small>
                    {posterList[posterSlide].uploadedBy.name} &middot;{' '}
                    {formatTanggalPendek(posterList[posterSlide].createdAt)}
                  </small>
                </div>

                {posterList.length > 1 && (
                  <div className={styles.miniDots}>
                    {posterList.map((_, index) => (
                      <button
                        key={index}
                        type="button"
                        className={index === posterSlide ? styles.miniDotActive : ''}
                        onClick={() => setPosterSlide(index)}
                        aria-label={`Poster ${index + 1}`}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </article>

          <article className={styles.panel}>
            <div className={styles.panelHeader}>
              <div>
                <Video size={19} />
                <h3>Video Informasi</h3>
              </div>
            </div>

            {videoList.length === 0 ? (
              <div className={styles.emptySection}>
                Belum ada video informasi.
              </div>
            ) : (
              <div className={styles.miniCarousel}>
                <div
                  className={styles.miniCarouselMedia}
                  onClick={() => setMediaPreview(videoList[videoSlide])}
                >
                  <video
                    key={videoList[videoSlide].id}
                    src={urlMediaPostingan(videoList[videoSlide].urlMedia)}
                    muted
                  />
                  <div className={styles.miniPlayBadge}>
                    <span>
                      <PlayCircle size={28} />
                    </span>
                  </div>

                  {videoList.length > 1 && (
                    <>
                      <button
                        type="button"
                        className={`${styles.miniArrow} ${styles.miniArrowLeft}`}
                        onClick={(event) => {
                          event.stopPropagation();
                          prevVideo();
                        }}
                        aria-label="Video sebelumnya"
                      >
                        <ChevronLeft size={16} />
                      </button>
                      <button
                        type="button"
                        className={`${styles.miniArrow} ${styles.miniArrowRight}`}
                        onClick={(event) => {
                          event.stopPropagation();
                          nextVideo();
                        }}
                        aria-label="Video berikutnya"
                      >
                        <ChevronRight size={16} />
                      </button>
                    </>
                  )}
                </div>

                <div className={styles.miniCarouselInfo}>
                  <strong>{videoList[videoSlide].judul}</strong>
                  <small>
                    {videoList[videoSlide].uploadedBy.name} &middot;{' '}
                    {formatTanggalPendek(videoList[videoSlide].createdAt)}
                  </small>
                </div>

                {videoList.length > 1 && (
                  <div className={styles.miniDots}>
                    {videoList.map((_, index) => (
                      <button
                        key={index}
                        type="button"
                        className={index === videoSlide ? styles.miniDotActive : ''}
                        onClick={() => setVideoSlide(index)}
                        aria-label={`Video ${index + 1}`}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </article>
        </section>

        {/* ==================================================
            KONTEN DASHBOARD - khusus Admin/Admin HC/Admin Comben/
            Section Head
        ================================================== */}

        {bisaLihatPanelAdmin && (
        <section className={styles.dashboardContent}>
          {/* ==================================================
              AKSES CEPAT
          ================================================== */}

          <article className={styles.panel}>
            <div className={styles.panelHeader}>
              <div>
                <Link2 size={23} />
                <h3>Akses Cepat</h3>
              </div>
            </div>

            <div className={styles.quickGrid}>
              {(user.role === 'ADMIN' ||
                user.role === 'SUPER_ADMIN' ||
                user.role === 'SECTION_HEAD') && (
                <button
                  type="button"
                  onClick={() => router.push('/admin/manajemen-akun')}
                >
                  <UserCog />
                  <span>
                    <strong>Manajemen Akun</strong>
                    <small>Atur role dan akses menu pengguna</small>
                  </span>
                  <ChevronRight />
                </button>
              )}

              {hasAccess(user, ACCESS_KEYS.ADMINISTRASI_POSTINGAN) && (
                <button
                  type="button"
                  onClick={() => router.push('/administrasi/postingan')}
                >
                  <Megaphone />
                  <span>
                    <strong>Postingan</strong>
                    <small>Kelola poster dan video informasi beranda</small>
                  </span>
                  <ChevronRight />
                </button>
              )}

              {hasAccess(user, ACCESS_KEYS.ADMINISTRASI_FORM) && (
                <button
                  type="button"
                  onClick={() => router.push('/administrasi/form-download')}
                >
                  <Download />
                  <span>
                    <strong>Form Download</strong>
                    <small>Formulir resmi yang dapat diunduh</small>
                  </span>
                  <ChevronRight />
                </button>
              )}

              {hasAccess(user, ACCESS_KEYS.ADMINISTRASI_CSR) && (
                <button
                  type="button"
                  onClick={() => router.push('/administrasi/csr')}
                >
                  <HandHeart />
                  <span>
                    <strong>CSR</strong>
                    <small>Proposal dan dokumen kegiatan CSR</small>
                  </span>
                  <ChevronRight />
                </button>
              )}

              {hasAccess(user, ACCESS_KEYS.ADMINISTRASI_DOKUMENTASI) && (
                <button
                  type="button"
                  onClick={() => router.push('/administrasi/dokumentasi')}
                >
                  <ImageIcon />
                  <span>
                    <strong>Dokumentasi</strong>
                    <small>Foto dan dokumentasi kegiatan</small>
                  </span>
                  <ChevronRight />
                </button>
              )}

              {hasAccess(user, ACCESS_KEYS.HC_IR) && (
                <button
                  type="button"
                  onClick={() => router.push('/hc/ir')}
                >
                  <Scale />
                  <span>
                    <strong>Portal IR</strong>
                    <small>Dokumen, aspirasi, dan IR course</small>
                  </span>
                  <ChevronRight />
                </button>
              )}
            </div>
          </article>

          {/* ==================================================
              AKTIVITAS TERBARU
          ================================================== */}

          <article className={styles.panel}>
            <div className={styles.panelHeader}>
              <div>
                <HeartPulse size={23} />
                <h3>Aktivitas Terbaru</h3>
              </div>

              <button type="button">Lihat semua</button>
            </div>

            <div className={styles.activityList}>
              {aktivitasList.length === 0 ? (
                <div className={styles.emptySection}>
                  Belum ada aktivitas upload terbaru.
                </div>
              ) : (
                aktivitasList.map((activity, index) => {
                  const { icon: ActivityIcon, kelas } =
                    IKON_AKTIVITAS[activity.jenis];
                  const waktu = new Date(activity.createdAt);

                  return (
                    <button
                      key={`${activity.jenis}-${activity.judul}-${index}`}
                      type="button"
                      className={styles.activityItem}
                    >
                      <span
                        className={`${styles.activityIcon} ${styles[kelas]}`}
                      >
                        <ActivityIcon size={21} />
                      </span>

                      <span className={styles.activityText}>
                        <strong>
                          {LABEL_JENIS_AKTIVITAS[activity.jenis]}: &quot;
                          {activity.judul}&quot; oleh {activity.uploadedBy.name}
                        </strong>

                        <small>
                          {formatTanggalPendek(activity.createdAt)} &middot;{' '}
                          {waktu.toLocaleTimeString('id-ID', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}{' '}
                          WIB
                        </small>
                      </span>

                      <ChevronRight
                        className={styles.activityArrow}
                      />
                    </button>
                  );
                })
              )}
            </div>
          </article>
        </section>
        )}
      </div>

      {profileModalOpen && (
        <div className={styles.modalOverlay}>
          <section
            className={styles.accountModal}
            role="dialog"
            aria-modal="true"
            aria-labelledby="profile-modal-title"
          >
            <div className={styles.modalHeader}>
              <div>
                <div className={styles.modalIcon}>
                  <UserCog size={23} />
                </div>

                <div>
                  <h2 id="profile-modal-title">
                    Akun Saya
                  </h2>
                  <p>Perbarui identitas akun Anda.</p>
                </div>
              </div>

              <button
                type="button"
                className={styles.closeButton}
                onClick={() => setProfileModalOpen(false)}
                aria-label="Tutup"
              >
                <X size={20} />
              </button>
            </div>

            <form
              className={styles.accountForm}
              onSubmit={updateProfile}
            >
              <label>
                Nama
                <input
                  type="text"
                  value={profileName}
                  onChange={(event) =>
                    setProfileName(event.target.value)
                  }
                  required
                />
              </label>

              <label>
                Username
                <input
                  type="text"
                  value={profileUsername}
                  onChange={(event) =>
                    setProfileUsername(event.target.value)
                  }
                  required
                />
              </label>

              <label>
                Role
                <input
                  type="text"
                  value={formatRole(user.role)}
                  disabled
                />
              </label>

              {accountError && (
                <div className={styles.modalError}>
                  {accountError}
                </div>
              )}

              {accountMessage && (
                <div className={styles.modalSuccess}>
                  {accountMessage}
                </div>
              )}

              <div className={styles.modalActions}>
                <button
                  type="button"
                  className={styles.cancelButton}
                  onClick={() => setProfileModalOpen(false)}
                >
                  Batal
                </button>

                <button
                  type="submit"
                  className={styles.saveButton}
                  disabled={accountLoading}
                >
                  <Save size={18} />
                  {accountLoading
                    ? 'Menyimpan...'
                    : 'Simpan'}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {passwordModalOpen && (
        <div className={styles.modalOverlay}>
          <section
            className={styles.accountModal}
            role="dialog"
            aria-modal="true"
            aria-labelledby="password-modal-title"
          >
            <div className={styles.modalHeader}>
              <div>
                <div className={styles.modalIcon}>
                  <KeyRound size={23} />
                </div>

                <div>
                  <h2 id="password-modal-title">
                    Ubah Password
                  </h2>
                  <p>Gunakan minimal delapan karakter.</p>
                </div>
              </div>

              <button
                type="button"
                className={styles.closeButton}
                onClick={() =>
                  setPasswordModalOpen(false)
                }
                aria-label="Tutup"
              >
                <X size={20} />
              </button>
            </div>

            <form
              className={styles.accountForm}
              onSubmit={changePassword}
            >
              <label>
                Password lama
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(event) =>
                    setCurrentPassword(event.target.value)
                  }
                  autoComplete="current-password"
                  required
                />
              </label>

              <label>
                Password baru
                <input
                  type="password"
                  value={newPassword}
                  onChange={(event) =>
                    setNewPassword(event.target.value)
                  }
                  autoComplete="new-password"
                  minLength={8}
                  required
                />
              </label>

              <label>
                Konfirmasi password baru
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(event) =>
                    setConfirmPassword(event.target.value)
                  }
                  autoComplete="new-password"
                  minLength={8}
                  required
                />
              </label>

              {accountError && (
                <div className={styles.modalError}>
                  {accountError}
                </div>
              )}

              {accountMessage && (
                <div className={styles.modalSuccess}>
                  {accountMessage}
                </div>
              )}

              <div className={styles.modalActions}>
                <button
                  type="button"
                  className={styles.cancelButton}
                  onClick={() =>
                    setPasswordModalOpen(false)
                  }
                >
                  Batal
                </button>

                <button
                  type="submit"
                  className={styles.saveButton}
                  disabled={accountLoading}
                >
                  <KeyRound size={18} />
                  {accountLoading
                    ? 'Menyimpan...'
                    : 'Ubah Password'}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
      {mediaPreview && (
        <div
          className={styles.mediaOverlay}
          onClick={(event) => {
            if (event.target === event.currentTarget) setMediaPreview(null);
          }}
        >
          <div className={styles.mediaBox}>
            <div className={styles.mediaBoxHead}>
              <strong>{mediaPreview.judul}</strong>
              <button
                type="button"
                className={styles.mediaBoxClose}
                onClick={() => setMediaPreview(null)}
                aria-label="Tutup"
              >
                <X size={16} />
              </button>
            </div>

            <div className={styles.mediaBoxBody}>
              {mediaPreview.tipe === 'VIDEO' ? (
                <video
                  src={urlMediaPostingan(mediaPreview.urlMedia)}
                  controls
                  autoPlay
                />
              ) : (
                <img
                  src={urlMediaPostingan(mediaPreview.urlMedia)}
                  alt={mediaPreview.judul}
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* ==================================================
          FOOTER
      ================================================== */}

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

// ==================================================
// SELESAI: frontend/src/app/dashboard/page.tsx
// ==================================================


