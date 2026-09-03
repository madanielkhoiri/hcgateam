'use client';

import {
  Building2,
  Check,
  Eye,
  EyeOff,
  HardHat,
  LockKeyhole,
  LogIn,
  UserRound,
  UsersRound,
} from 'lucide-react';
import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './login.module.css';

export default function LoginPage() {
  const router = useRouter();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setLoading(true);
    setErrorMessage('');

    try {
      const response = await fetch(
        'http://localhost:3001/api/auth/login',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            username,
            password,
          }),
        },
      );

      const result = await response.json();

      if (!response.ok) {
        const message = Array.isArray(result.message)
          ? result.message[0]
          : result.message;

        throw new Error(message || 'Username atau password salah');
      }

      const storage = rememberMe ? localStorage : sessionStorage;

      storage.setItem('hcga_access_token', result.accessToken);
      storage.setItem('hcga_user', JSON.stringify(result.user));

      router.replace('/dashboard');
      router.refresh();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Terjadi kesalahan saat login',
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div className={styles.brand}>
          <div className={styles.brandLogo}>
            <UsersRound size={23} strokeWidth={2.3} />
          </div>

          <span>ONE FOR ALL</span>
        </div>
      </header>

      <section className={styles.main}>
        <div className={styles.backgroundDotsLeft} />
        <div className={styles.backgroundCircle} />

        <section className={styles.loginCard}>
          <div className={styles.loginIcon}>
            <UsersRound size={34} strokeWidth={1.9} />
          </div>

          <h1>Selamat Datang</h1>
          <p className={styles.subtitle}>Portal internal ONE FOR ALL</p>

          <div className={styles.titleLine} />

          <form className={styles.form} onSubmit={handleSubmit}>
            <div className={styles.field}>
              <label htmlFor="username">Username</label>

              <div className={styles.inputContainer}>
                <UserRound size={18} />

                <input
                  id="username"
                  type="text"
                  value={username}
                  placeholder="Masukkan username Anda"
                  autoComplete="username"
                  onChange={(event) => {
                    setUsername(event.target.value);
                  }}
                  required
                />
              </div>
            </div>

            <div className={styles.field}>
              <label htmlFor="password">Password</label>

              <div className={styles.inputContainer}>
                <LockKeyhole size={18} />

                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  placeholder="Masukkan password Anda"
                  autoComplete="current-password"
                  onChange={(event) => {
                    setPassword(event.target.value);
                  }}
                  required
                />

                <button
                  type="button"
                  className={styles.eyeButton}
                  aria-label={
                    showPassword
                      ? 'Sembunyikan password'
                      : 'Tampilkan password'
                  }
                  onClick={() => {
                    setShowPassword((current) => !current);
                  }}
                >
                  {showPassword ? (
                    <EyeOff size={18} />
                  ) : (
                    <Eye size={18} />
                  )}
                </button>
              </div>
            </div>

            <label className={styles.remember}>
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(event) => {
                  setRememberMe(event.target.checked);
                }}
              />

              <span>Ingat saya</span>
            </label>

            {errorMessage && (
              <div className={styles.errorMessage}>
                {errorMessage}
              </div>
            )}

            <button
              type="submit"
              className={styles.loginButton}
              disabled={loading}
            >
              <LogIn size={19} />

              <span>
                {loading ? 'Memproses...' : 'Masuk'}
              </span>
            </button>

            <div className={styles.restricted}>
              <LockKeyhole size={14} />

              <span>
                Akses terbatas hanya untuk karyawan yang berwenang.
              </span>
            </div>
          </form>
        </section>

        <section className={styles.illustration}>
          <div className={styles.browserWindow}>
            <div className={styles.browserHeader}>
              <span />
              <span />
              <span />
            </div>

            <div className={styles.browserBody}>
              <div className={styles.browserLines}>
                <span />
                <span />
                <span />
                <span />
              </div>

              <div className={styles.browserSide} />
            </div>
          </div>

          <div className={styles.departmentCards}>
            <article className={styles.hcCard}>
              <div className={styles.departmentIcon}>
                <UsersRound size={31} />
              </div>

              <strong>HC</strong>
              <div className={styles.departmentLine} />
              <span>Human Capital</span>
            </article>

            <article className={styles.gaCard}>
              <div className={styles.departmentIcon}>
                <Building2 size={31} />
              </div>

              <strong>GA</strong>
              <div className={styles.departmentLine} />
              <span>General Affair</span>
            </article>

            <article className={styles.sipilCard}>
              <div className={styles.departmentIcon}>
                <HardHat size={31} />
              </div>

              <strong>CIVIL</strong>
              <div className={styles.departmentLine} />
              <span>Civil</span>
            </article>
          </div>

          <div className={styles.orbit}>
            <span className={styles.orbitDotOne} />
            <span className={styles.orbitDotTwo} />
            <span className={styles.orbitDotThree} />
          </div>

          <div className={styles.securityBadge}>
            <Check size={34} strokeWidth={3} />
          </div>
        </section>
      </section>

      <footer className={styles.footer}>
        <span>© 2026 ONE FOR ALL. Semua hak dilindungi.</span>
        <span className={styles.separator}>|</span>

        <span className={styles.footerItem}>
          <LockKeyhole size={13} />
          Portal Internal
        </span>

        <span className={styles.separator}>|</span>
        <span>v1.0.0</span>
      </footer>
    </main>
  );
}
