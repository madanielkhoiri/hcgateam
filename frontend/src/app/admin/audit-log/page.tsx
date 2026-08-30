'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ScrollText } from 'lucide-react';
import { getAccessToken, getStoredUser } from '@/lib/access-control';
import { auditLogApi, AuditLogApiError, type AuditLogEntry } from '@/lib/audit-log-api';
import { labelEntitas, terjemahkanAksi } from '@/lib/audit-log-labels';
import styles from '@/components/transport/transport.module.css';

function warnaAksi(aksi: string): string {
  if (aksi.includes('GAGAL') || aksi.includes('DIHAPUS')) return styles.breakdown;
  return styles.ready;
}

function formatWaktu(iso: string): string {
  return new Date(iso).toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function AuditLogPage() {
  const router = useRouter();
  const [siap, setSiap] = useState(false);
  const [data, setData] = useState<AuditLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [halaman, setHalaman] = useState(1);
  const [entitasList, setEntitasList] = useState<string[]>([]);
  const [filterEntitas, setFilterEntitas] = useState('');
  const [error, setError] = useState('');
  const [memuat, setMemuat] = useState(true);

  const UKURAN_HALAMAN = 50;

  useEffect(() => {
    const token = getAccessToken();
    const user = getStoredUser();

    if (!token || !user) {
      router.replace('/login');
      return;
    }

    if (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN' && user.role !== 'SECTION_HEAD') {
      router.replace('/dashboard');
      return;
    }

    setSiap(true);
  }, [router]);

  useEffect(() => {
    if (siap) {
      auditLogApi.daftarEntitas().then(setEntitasList).catch(() => setEntitasList([]));
    }
  }, [siap]);

  useEffect(() => {
    if (!siap) return;

    setMemuat(true);
    setError('');
    auditLogApi
      .daftar({ entitas: filterEntitas || undefined, halaman })
      .then((hasil) => {
        setData(hasil.data);
        setTotal(hasil.total);
      })
      .catch((err) => {
        setError(err instanceof AuditLogApiError ? err.message : 'Audit log gagal dimuat');
      })
      .finally(() => setMemuat(false));
  }, [siap, filterEntitas, halaman]);

  if (!siap) return null;

  const totalHalaman = Math.max(1, Math.ceil(total / UKURAN_HALAMAN));

  return (
    <section>
      <Link
        href="/dashboard"
        style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 14, color: '#385675', fontSize: 13, fontWeight: 700 }}
      >
        <ArrowLeft size={16} /> Kembali ke Dashboard
      </Link>

      <div className={styles.hero}>
        <div>
          <span className={styles.heroIcon}>
            <ScrollText />
          </span>
          <div>
            <h1>Audit Log</h1>
            <p>Jejak siapa mengubah/menghapus apa dan kapan — khusus Admin/Super Admin/Section Head.</p>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, alignItems: 'center', margin: '16px 0' }}>
        <label style={{ fontSize: 12.5, color: '#385675', fontWeight: 700 }}>
          Jenis Aktivitas:{' '}
          <select
            value={filterEntitas}
            onChange={(e) => {
              setFilterEntitas(e.target.value);
              setHalaman(1);
            }}
            style={{ marginLeft: 6, padding: '6px 10px', borderRadius: 8, border: '1px solid #d8e4f2' }}
          >
            <option value="">Semua</option>
            {entitasList.map((e) => (
              <option key={e} value={e}>
                {labelEntitas(e)}
              </option>
            ))}
          </select>
        </label>
      </div>

      {error && <p className={styles.pageError}>{error}</p>}

      <div className={styles.tablePanel}>
        <div className={styles.tableTitle}>
          <h3>Riwayat Aktivitas</h3>
          <span>Total {total} catatan</span>
        </div>
        <div className={styles.tableScroll}>
          <table>
            <thead>
              <tr>
                <th>Waktu</th>
                <th>Pelaku</th>
                <th>Aksi</th>
                <th>IP</th>
              </tr>
            </thead>
            <tbody>
              {memuat && (
                <tr>
                  <td colSpan={4} className={styles.empty}>
                    Memuat...
                  </td>
                </tr>
              )}
              {!memuat &&
                data.map((entry) => (
                  <tr key={entry.id}>
                    <td style={{ whiteSpace: 'nowrap', fontSize: 12.5 }}>{formatWaktu(entry.createdAt)}</td>
                    <td>
                      {entry.actorName || entry.actorUsername ? (
                        <>
                          <b>{entry.actorName ?? entry.actorUsername}</b>
                          <div style={{ fontSize: 11, color: '#71839d' }}>
                            {[entry.actorUsername && `@${entry.actorUsername}`, entry.actorNrp && `NRP ${entry.actorNrp}`]
                              .filter(Boolean)
                              .join(' · ')}
                          </div>
                        </>
                      ) : (
                        <span style={{ color: '#71839d' }}>—</span>
                      )}
                    </td>
                    <td>
                      <span className={warnaAksi(entry.aksi)}>{terjemahkanAksi(entry.aksi)}</span>
                    </td>
                    <td style={{ fontSize: 11.5, color: '#71839d' }}>{entry.alamatIp ?? '—'}</td>
                  </tr>
                ))}
              {!memuat && !data.length && (
                <tr>
                  <td colSpan={4} className={styles.empty}>
                    Belum ada catatan audit log{filterEntitas ? ` untuk jenis aktivitas "${labelEntitas(filterEntitas)}"` : ''}.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {totalHalaman > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 10, padding: 14, alignItems: 'center' }}>
            <button
              type="button"
              disabled={halaman <= 1}
              onClick={() => setHalaman((h) => h - 1)}
              style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #d8e4f2', cursor: halaman <= 1 ? 'default' : 'pointer' }}
            >
              Sebelumnya
            </button>
            <span style={{ fontSize: 12.5, color: '#385675' }}>
              Halaman {halaman} / {totalHalaman}
            </span>
            <button
              type="button"
              disabled={halaman >= totalHalaman}
              onClick={() => setHalaman((h) => h + 1)}
              style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #d8e4f2', cursor: halaman >= totalHalaman ? 'default' : 'pointer' }}
            >
              Berikutnya
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
