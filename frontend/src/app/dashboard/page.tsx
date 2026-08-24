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
  CircleHelp,
  Download,
  FileText,
  HardHat,
  HeartPulse,
  Image as ImageIcon,
  KeyRound,
  Link2,
  LogOut,
  Megaphone,
  Phone,
  Save,
  ShieldCheck,
  Ticket,
  UserCog,
  UsersRound,
  X,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ACCESS_KEYS, hasAccess, saveStoredUser } from '@/lib/access-control';
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

const activities = [
  {
    icon: FileText,
    iconClass: 'blue',
    title: 'Daily Report baru diunggah oleh Andi Setiawan',
    date: '20 Mei 2024',
    time: '10:35 WIB',
  },
  {
    icon: BookOpen,
    iconClass: 'green',
    title: 'Template Form Cuti diperbarui oleh Admin HCGA',
    date: '20 Mei 2024',
    time: '09:12 WIB',
  },
  {
    icon: ShieldCheck,
    iconClass: 'orange',
    title: 'Dokumen SOP GS ditambahkan oleh Budi Santoso',
    date: '20 Mei 2024',
    time: '08:47 WIB',
  },
  {
    icon: Megaphone,
    iconClass: 'purple',
    title: 'Berita HC terbaru dipublikasikan oleh Rina Puspita',
    date: '20 Mei 2024',
    time: '08:15 WIB',
  },
];

// ==================================================
// HALAMAN DASHBOARD
// ==================================================

export default function DashboardPage() {
  const router = useRouter();

  const [user, setUser] = useState<LoginUser | null>(null);
  const [currentSlide, setCurrentSlide] = useState(0);

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
  // SLIDER OTOMATIS
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
            KONTEN DASHBOARD
        ================================================== */}

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

              <button type="button">
                <FileText />
                <span>
                  <strong>Daftar Form &amp; Berita</strong>
                  <small>Formulir dan berita resmi</small>
                </span>
                <ChevronRight />
              </button>

              <button type="button">
                <CircleHelp />
                <span>
                  <strong>Panduan &amp; FAQ</strong>
                  <small>Panduan penggunaan portal</small>
                </span>
                <ChevronRight />
              </button>

              <button type="button">
                <ShieldCheck />
                <span>
                  <strong>Prosedur &amp; SOP</strong>
                  <small>Dokumen prosedur kerja</small>
                </span>
                <ChevronRight />
              </button>

              <button type="button">
                <Download />
                <span>
                  <strong>Unduhan</strong>
                  <small>Template dan dokumen penting</small>
                </span>
                <ChevronRight />
              </button>

              <button type="button">
                <ImageIcon />
                <span>
                  <strong>Dokumentasi</strong>
                  <small>Foto dan dokumentasi kegiatan</small>
                </span>
                <ChevronRight />
              </button>

              <button type="button">
                <Phone />
                <span>
                  <strong>Kontak Darurat</strong>
                  <small>Nomor penting dan darurat</small>
                </span>
                <ChevronRight />
              </button>
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
              {activities.map((activity) => {
                const ActivityIcon = activity.icon;

                return (
                  <button
                    key={`${activity.title}-${activity.time}`}
                    type="button"
                    className={styles.activityItem}
                  >
                    <span
                      className={`${styles.activityIcon} ${
                        styles[activity.iconClass]
                      }`}
                    >
                      <ActivityIcon size={21} />
                    </span>

                    <span className={styles.activityText}>
                      <strong>{activity.title}</strong>

                      <small>
                        {activity.date} · {activity.time}
                      </small>
                    </span>

                    <ChevronRight
                      className={styles.activityArrow}
                    />
                  </button>
                );
              })}
            </div>
          </article>
        </section>
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


