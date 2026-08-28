'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Eye, Plus, Printer, ShieldCheck, Trash2, X } from 'lucide-react';
import { ACCESS_KEYS, getAccessToken, getStoredUser, hasAccess } from '@/lib/access-control';
import { Kip, KipApiError, LABEL_LOKASI_KIP, LOKASI_KIP, LokasiHousekeepingIndoor, kipApi } from '@/lib/kip-api';
import { KipCard3D, statusTampilBulan } from '@/components/kip/kip-card-3d';
import styles from '@/components/transport/transport.module.css';

const blankForm = {
  noKip: '',
  jenisPeralatan: '',
  departemen: '',
  tahun: new Date().getFullYear(),
  lokasi: '' as LokasiHousekeepingIndoor | '',
};

export default function KipListPage() {
  const router = useRouter();
  const [siap, setSiap] = useState(false);
  const [data, setData] = useState<Kip[]>([]);
  const [error, setError] = useState('');

  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(blankForm);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [preview, setPreview] = useState<Kip | null>(null);
  const [cetak, setCetak] = useState<LokasiHousekeepingIndoor | null>(null);
  const [qrSvg, setQrSvg] = useState('');
  const [qrError, setQrError] = useState('');
  const [busyCeklis, setBusyCeklis] = useState(false);

  const user = getStoredUser();
  const bolehCeklis = !!user && ['ELEKTRIK', 'ADMIN', 'SUPER_ADMIN'].includes(user.role);

  useEffect(() => {
    const token = getAccessToken();
    const storedUser = getStoredUser();

    if (!token || !storedUser) {
      router.replace('/login');
      return;
    }

    if (!hasAccess(storedUser, ACCESS_KEYS.CIVIL_ELECTRIC_KIP)) {
      router.replace('/civil');
      return;
    }

    setSiap(true);
  }, [router]);

  async function muat() {
    try {
      setError('');
      setData(await kipApi.daftarKip());
    } catch (err) {
      setError(err instanceof KipApiError ? err.message : 'Data KIP gagal dimuat');
    }
  }

  useEffect(() => {
    if (siap) void muat();
  }, [siap]);

  function bukaModal() {
    setForm({ ...blankForm, tahun: new Date().getFullYear() });
    setFormError('');
    setModal(true);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setFormError('');

    if (!form.lokasi) {
      setFormError('Pilih lokasi terlebih dahulu');
      return;
    }

    setSubmitting(true);
    try {
      await kipApi.buatKip({
        noKip: form.noKip,
        jenisPeralatan: form.jenisPeralatan,
        departemen: form.departemen,
        tahun: form.tahun,
        lokasi: form.lokasi,
      });
      setModal(false);
      await muat();
    } catch (err) {
      setFormError(err instanceof KipApiError ? err.message : 'KIP gagal disimpan');
    } finally {
      setSubmitting(false);
    }
  }

  async function hapus(id: number) {
    if (!confirm('Hapus KIP ini beserta seluruh checklist-nya?')) return;
    try {
      await kipApi.hapusKip(id);
      setPreview((cur) => (cur?.id === id ? null : cur));
      await muat();
    } catch (err) {
      setError(err instanceof KipApiError ? err.message : 'KIP gagal dihapus');
    }
  }

  async function bukaCetak(lokasi: LokasiHousekeepingIndoor) {
    setCetak(lokasi);
    setQrSvg('');
    setQrError('');
    try {
      const target = `${window.location.origin}/kip-scan/${lokasi}`;
      setQrSvg(await kipApi.qrSvg(lokasi, target));
    } catch (err) {
      setQrError(err instanceof KipApiError ? err.message : 'QR gagal dibuat');
    }
  }

  function cetakSekarang() {
    window.print();
  }

  async function ceklisSekarang(kip: Kip) {
    const bulanIni = new Date().getMonth() + 1;
    setBusyCeklis(true);
    try {
      await kipApi.ceklis(kip.id, bulanIni);
      const segar = await kipApi.daftarKip();
      setData(segar);
      setPreview(segar.find((k) => k.id === kip.id) ?? null);
    } catch (err) {
      setError(err instanceof KipApiError ? err.message : 'Ceklis gagal disimpan');
    } finally {
      setBusyCeklis(false);
    }
  }

  if (!siap) return null;

  return (
    <section>
      <Link
        href="/civil"
        style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 14, color: '#385675', fontSize: 13, fontWeight: 700 }}
      >
        <ArrowLeft size={16} /> Kembali ke CIVIL
      </Link>

      <div className={styles.hero}>
        <div>
          <span className={styles.heroIcon}>
            <ShieldCheck />
          </span>
          <div>
            <h1>KIP — Kartu Inspeksi Peralatan</h1>
            <p>Isi lokasi & data alat — barcode lokasi otomatis siap dicetak. Siapa saja bisa scan untuk lihat status; Tim Elektrik ceklis dari situ.</p>
          </div>
        </div>
        <div className={styles.heroActions}>
          <button className={styles.primary} onClick={bukaModal}>
            <Plus />
            Buat KIP
          </button>
        </div>
      </div>

      {error && <p className={styles.pageError}>{error}</p>}

      <div className={styles.tablePanel}>
        <div className={styles.tableTitle}>
          <h3>Daftar KIP</h3>
          <span>Total {data.length} kartu</span>
        </div>
        <div className={styles.tableScroll}>
          <table>
            <thead>
              <tr>
                <th>No</th>
                <th>No. KIP</th>
                <th>Jenis Peralatan</th>
                <th>Departemen</th>
                <th>Tahun</th>
                <th>Lokasi</th>
                <th>Status Bulan Ini</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {data.map((item, index) => {
                const bulanIni = new Date().getMonth() + 1;
                const status = statusTampilBulan(item, bulanIni);
                return (
                  <tr key={item.id}>
                    <td>{index + 1}</td>
                    <td>
                      <b>{item.noKip}</b>
                    </td>
                    <td>{item.jenisPeralatan}</td>
                    <td>{item.departemen}</td>
                    <td>{item.tahun}</td>
                    <td>{LABEL_LOKASI_KIP[item.lokasi]}</td>
                    <td>
                      <span className={status === 'SUDAH' ? styles.ready : styles.breakdown}>
                        {status === 'SUDAH' ? 'SUDAH' : status === 'KUNING' ? 'BELUM (BULAN INI)' : status === 'MERAH' ? 'TERLEWAT' : 'BELUM JADWAL'}
                      </span>
                    </td>
                    <td>
                      <div className={styles.actions}>
                        <button onClick={() => setPreview(item)} title="Lihat Kartu 3D">
                          <Eye size={16} />
                        </button>
                        <button onClick={() => bukaCetak(item.lokasi)} title="Cetak Barcode Lokasi">
                          <Printer size={16} />
                        </button>
                        <button onClick={() => hapus(item.id)} title="Hapus">
                          <Trash2 />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!data.length && (
                <tr>
                  <td colSpan={8} className={styles.empty}>
                    Belum ada KIP.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modal && (
        <div className={styles.modalBack}>
          <form className={styles.modal} onSubmit={submit}>
            <header>
              <div>
                <h2>Buat KIP Baru</h2>
                <p>Isi lokasi & data alat — barcode lokasi otomatis siap dicetak, checklist 12 bulan langsung tersedia.</p>
              </div>
              <button type="button" onClick={() => setModal(false)}>
                <X />
              </button>
            </header>
            <div className={styles.formGrid}>
              <label>
                No. KIP
                <input
                  required
                  placeholder="Contoh: EXT/SK/OW/PPA/26/009"
                  value={form.noKip}
                  onChange={(e) => setForm((cur) => ({ ...cur, noKip: e.target.value }))}
                />
              </label>
              <label>
                Jenis Peralatan
                <input
                  required
                  placeholder="Contoh: Stop Kontak"
                  value={form.jenisPeralatan}
                  onChange={(e) => setForm((cur) => ({ ...cur, jenisPeralatan: e.target.value }))}
                />
              </label>
              <label>
                Departemen
                <input
                  required
                  placeholder="Contoh: HCGA"
                  value={form.departemen}
                  onChange={(e) => setForm((cur) => ({ ...cur, departemen: e.target.value }))}
                />
              </label>
              <label>
                Tahun
                <input
                  required
                  type="number"
                  min={2000}
                  max={2100}
                  value={form.tahun}
                  onChange={(e) => setForm((cur) => ({ ...cur, tahun: Number(e.target.value) }))}
                />
              </label>
              <label style={{ gridColumn: '1/-1' }}>
                Lokasi
                <select
                  required
                  value={form.lokasi}
                  onChange={(e) => setForm((cur) => ({ ...cur, lokasi: e.target.value as LokasiHousekeepingIndoor }))}
                >
                  <option value="">Pilih lokasi...</option>
                  {LOKASI_KIP.map((l) => (
                    <option key={l} value={l}>
                      {LABEL_LOKASI_KIP[l]}
                    </option>
                  ))}
                </select>
                <span style={{ fontSize: 11, color: '#71839d' }}>
                  Barcode lokasi ini otomatis tersedia untuk dicetak — tidak perlu isi kode manual.
                </span>
              </label>
            </div>
            {formError && <p className={styles.error}>{formError}</p>}
            <footer>
              <button type="button" onClick={() => setModal(false)}>
                Batal
              </button>
              <button className={styles.primary} disabled={submitting}>
                {submitting ? 'Menyimpan...' : 'Simpan'}
              </button>
            </footer>
          </form>
        </div>
      )}

      {preview && (
        <div className={styles.modalBack} onClick={() => setPreview(null)}>
          <div className={styles.modal} style={{ width: 'min(700px, 100%)' }} onClick={(e) => e.stopPropagation()}>
            <header>
              <div>
                <h2>{preview.noKip}</h2>
                <p>
                  {preview.jenisPeralatan} — {preview.departemen}
                </p>
              </div>
              <button type="button" onClick={() => setPreview(null)}>
                <X />
              </button>
            </header>
            <div style={{ padding: 20 }}>
              <KipCard3D kip={preview} />
              {bolehCeklis && (() => {
                const bulanIni = new Date().getMonth() + 1;
                const status = statusTampilBulan(preview, bulanIni);
                if (status === 'SUDAH') {
                  return (
                    <p style={{ marginTop: 14, fontSize: 13, color: '#087848', fontWeight: 700 }}>
                      Bulan ini sudah diceklis.
                    </p>
                  );
                }
                return (
                  <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                    <span style={{ fontSize: 12, color: '#71839d' }}>Login sebagai {user?.name} ({user?.role})</span>
                    <button className={styles.primary} disabled={busyCeklis} onClick={() => ceklisSekarang(preview)}>
                      {busyCeklis ? 'Menyimpan...' : 'Ceklis Sekarang'}
                    </button>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {cetak && (
        <div className={styles.modalBack} onClick={() => setCetak(null)}>
          <div className={styles.modal} style={{ width: 'min(380px, 100%)' }} onClick={(e) => e.stopPropagation()}>
            <header>
              <div>
                <h2>Cetak Barcode</h2>
                <p>Tempel di lokasi {LABEL_LOKASI_KIP[cetak]}.</p>
              </div>
              <button type="button" onClick={() => setCetak(null)}>
                <X />
              </button>
            </header>
            <div id="kip-cetak-area" style={{ padding: '24px 20px', textAlign: 'center' }}>
              {qrError && <p className={styles.error}>{qrError}</p>}
              {!qrError && qrSvg && (
                <div
                  style={{ width: 220, height: 220, margin: '0 auto' }}
                  dangerouslySetInnerHTML={{ __html: qrSvg }}
                />
              )}
              {!qrError && !qrSvg && <p style={{ color: '#71839d' }}>Membuat QR...</p>}
              <h3 style={{ margin: '16px 0 2px', fontSize: 17 }}>{LABEL_LOKASI_KIP[cetak]}</h3>
              <p style={{ margin: 0, color: '#71839d', fontSize: 12 }}>Scan untuk lihat status KIP di lokasi ini</p>
            </div>
            <footer>
              <button type="button" onClick={() => setCetak(null)}>
                Tutup
              </button>
              <button type="button" className={styles.primary} onClick={cetakSekarang} disabled={!qrSvg}>
                <Printer size={15} style={{ marginRight: 6 }} />
                Cetak
              </button>
            </footer>
          </div>
        </div>
      )}

      <style jsx global>{`
        #kip-cetak-area svg {
          width: 100% !important;
          height: 100% !important;
          display: block;
        }
        @media print {
          body * {
            visibility: hidden;
          }
          #kip-cetak-area,
          #kip-cetak-area * {
            visibility: visible;
          }
          #kip-cetak-area {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
          }
        }
      `}</style>
    </section>
  );
}
