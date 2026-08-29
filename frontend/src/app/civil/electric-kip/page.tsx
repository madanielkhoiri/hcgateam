'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Eye, Pencil, Plus, Printer, ShieldCheck, Trash2, X } from 'lucide-react';
import { ACCESS_KEYS, getAccessToken, getStoredUser, hasAccess } from '@/lib/access-control';
import { ambilLokasiGps, Kip, KipApiError, KipChecklistBulan, LABEL_LOKASI_KIP, LOKASI_KIP, LokasiHousekeepingIndoor, kipApi } from '@/lib/kip-api';
import { KipCard3D, statusTampilBulan, warnaStatus } from '@/components/kip/kip-card-3d';
import { KipCeklisForm } from '@/components/kip/kip-ceklis-form';
import { KipDetailBulan } from '@/components/kip/kip-detail-bulan';
import styles from '@/components/transport/transport.module.css';

const NAMA_BULAN_SINGKAT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des',
];

const blankForm = {
  noKip: '',
  jenisPeralatan: '',
  departemen: '',
  tahun: new Date().getFullYear(),
  lokasi: '' as LokasiHousekeepingIndoor | '',
  parameterChecklist: [''],
};

export default function KipListPage() {
  const router = useRouter();
  const [siap, setSiap] = useState(false);
  const [data, setData] = useState<Kip[]>([]);
  const [error, setError] = useState('');

  const [modal, setModal] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState(blankForm);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [preview, setPreview] = useState<Kip | null>(null);
  const [cetak, setCetak] = useState<LokasiHousekeepingIndoor | null>(null);
  const [qrSvg, setQrSvg] = useState('');
  const [qrError, setQrError] = useState('');
  const [busyCeklis, setBusyCeklis] = useState(false);
  const [gpsStatus, setGpsStatus] = useState<'memuat' | 'sukses' | 'gagal' | null>(null);
  const [gpsPesan, setGpsPesan] = useState('');
  const [formCeklisTampil, setFormCeklisTampil] = useState(false);
  const [ceklisError, setCeklisError] = useState<string | null>(null);
  const [detailBulan, setDetailBulan] = useState<KipChecklistBulan | null>(null);

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
    setEditId(null);
    setForm({ ...blankForm, tahun: new Date().getFullYear(), parameterChecklist: [''] });
    setFormError('');
    setModal(true);
  }

  function bukaModalEdit(kip: Kip) {
    setEditId(kip.id);
    setForm({
      noKip: kip.noKip,
      jenisPeralatan: kip.jenisPeralatan,
      departemen: kip.departemen,
      tahun: kip.tahun,
      lokasi: kip.lokasi,
      parameterChecklist: kip.parameterChecklist.length ? [...kip.parameterChecklist] : [''],
    });
    setFormError('');
    setModal(true);
  }

  function ubahParameter(index: number, nilai: string) {
    setForm((cur) => ({
      ...cur,
      parameterChecklist: cur.parameterChecklist.map((p, i) => (i === index ? nilai : p)),
    }));
  }

  function tambahParameter() {
    setForm((cur) => ({ ...cur, parameterChecklist: [...cur.parameterChecklist, ''] }));
  }

  function hapusParameter(index: number) {
    setForm((cur) => ({
      ...cur,
      parameterChecklist: cur.parameterChecklist.filter((_, i) => i !== index),
    }));
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setFormError('');

    if (!form.lokasi) {
      setFormError('Pilih lokasi terlebih dahulu');
      return;
    }

    const parameterChecklist = form.parameterChecklist.map((p) => p.trim()).filter(Boolean);
    if (!parameterChecklist.length) {
      setFormError('Isi minimal 1 parameter checklist inspeksi');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        noKip: form.noKip,
        jenisPeralatan: form.jenisPeralatan,
        departemen: form.departemen,
        tahun: form.tahun,
        lokasi: form.lokasi,
        parameterChecklist,
      };
      if (editId != null) {
        await kipApi.ubahKip(editId, payload);
      } else {
        await kipApi.buatKip(payload);
      }
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
    setGpsStatus('memuat');
    setGpsPesan('');
    try {
      const target = `${window.location.origin}/kip-scan/${lokasi}`;
      setQrSvg(await kipApi.qrSvg(lokasi, target));
    } catch (err) {
      setQrError(err instanceof KipApiError ? err.message : 'QR gagal dibuat');
    }

    // Rekam titik GPS lokasi ini sekali (dipakai validasi jarak saat ceklis nanti).
    try {
      const posisi = await ambilLokasiGps();
      await kipApi.simpanGpsLokasi(lokasi, posisi.latitude, posisi.longitude);
      setGpsStatus('sukses');
      setGpsPesan('Titik GPS lokasi ini tersimpan sebagai acuan ceklis.');
    } catch (err) {
      setGpsStatus('gagal');
      setGpsPesan(err instanceof Error ? err.message : 'GPS lokasi gagal disimpan');
    }
  }

  function cetakSekarang() {
    window.print();
  }

  async function ceklisSekarang(kip: Kip, payload: { foto: File; parameterChecked: boolean[] }) {
    const bulanIni = new Date().getMonth() + 1;
    setBusyCeklis(true);
    setCeklisError(null);
    try {
      const posisi = await ambilLokasiGps().catch(() => undefined);
      await kipApi.ceklis(kip.id, bulanIni, { ...payload, lokasiSekarang: posisi });
      const segar = await kipApi.daftarKip();
      setData(segar);
      setPreview(segar.find((k) => k.id === kip.id) ?? null);
      setFormCeklisTampil(false);
    } catch (err) {
      setCeklisError(err instanceof KipApiError ? err.message : 'Ceklis gagal disimpan');
    } finally {
      setBusyCeklis(false);
    }
  }

  function lihatBuktiBulan(baris: KipChecklistBulan) {
    setPreview(null);
    setFormCeklisTampil(false);
    setCeklisError(null);
    setDetailBulan(baris);
  }

  function tutupPreview() {
    setPreview(null);
    setFormCeklisTampil(false);
    setCeklisError(null);
  }

  function pakaiChecklistSejenis(kip: Kip) {
    setForm((cur) => ({ ...cur, parameterChecklist: [...kip.parameterChecklist] }));
  }

  if (!siap) return null;

  const jenisPeralatanUnik = Array.from(new Set(data.map((k) => k.jenisPeralatan))).sort((a, b) =>
    a.localeCompare(b),
  );
  const jenisDicariNormal = form.jenisPeralatan.trim().toLowerCase();
  const templateSejenis = jenisDicariNormal
    ? data.find((k) => k.id !== editId && k.jenisPeralatan.trim().toLowerCase() === jenisDicariNormal)
    : undefined;

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
                        <button onClick={() => bukaModalEdit(item)} title="Edit KIP">
                          <Pencil size={16} />
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
                <h2>{editId != null ? 'Edit KIP' : 'Buat KIP Baru'}</h2>
                <p>
                  {editId != null
                    ? 'Ubah data alat & parameter checklist — perubahan berlaku untuk ceklis berikutnya.'
                    : 'Isi lokasi & data alat — barcode lokasi otomatis siap dicetak, checklist 12 bulan langsung tersedia.'}
                </p>
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
                  list="daftar-jenis-peralatan"
                  placeholder="Contoh: Stop Kontak"
                  value={form.jenisPeralatan}
                  onChange={(e) => setForm((cur) => ({ ...cur, jenisPeralatan: e.target.value }))}
                />
                <datalist id="daftar-jenis-peralatan">
                  {jenisPeralatanUnik.map((j) => (
                    <option key={j} value={j} />
                  ))}
                </datalist>
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
              <label style={{ gridColumn: '1/-1' }}>
                Parameter Checklist Inspeksi
                <span style={{ fontSize: 11, color: '#71839d', display: 'block', marginBottom: 8 }}>
                  Item yang wajib dicek Tim Elektrik tiap ceklis bulanan — sesuaikan dengan jenis peralatan ini.
                </span>
                {templateSejenis && (
                  <div
                    style={{
                      background: '#eef6ff',
                      border: '1px solid #bfdbfe',
                      borderRadius: 8,
                      padding: '8px 10px',
                      marginBottom: 8,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 8,
                    }}
                  >
                    <span style={{ fontSize: 11.5, color: '#12355f' }}>
                      KIP lain jenis &quot;{templateSejenis.jenisPeralatan}&quot; (No. {templateSejenis.noKip}) sudah punya {templateSejenis.parameterChecklist.length} parameter checklist tersimpan. Form ini masih kosong — klik untuk menyalin ke sini.
                    </span>
                    <button
                      type="button"
                      onClick={() => pakaiChecklistSejenis(templateSejenis)}
                      style={{ fontSize: 11.5, fontWeight: 700, color: '#0b71c9', background: 'none', border: 0, cursor: 'pointer', whiteSpace: 'nowrap' }}
                    >
                      Pakai Checklist Ini
                    </button>
                  </div>
                )}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {form.parameterChecklist.map((p, index) => (
                    <div key={index} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <input
                        placeholder={`Parameter ${index + 1}`}
                        value={p}
                        onChange={(e) => ubahParameter(index, e.target.value)}
                        style={{ flex: 1 }}
                      />
                      <button
                        type="button"
                        onClick={() => hapusParameter(index)}
                        disabled={form.parameterChecklist.length <= 1}
                        title="Hapus parameter ini"
                        style={{ flexShrink: 0, padding: 6 }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={tambahParameter}
                  style={{ marginTop: 8, fontSize: 12, fontWeight: 700, color: '#0b71c9', background: 'none', border: 0, cursor: 'pointer', padding: 0 }}
                >
                  + Tambah Parameter
                </button>
              </label>
            </div>
            {formError && <p className={styles.error}>{formError}</p>}
            <footer>
              <button type="button" onClick={() => setModal(false)}>
                Batal
              </button>
              <button className={styles.primary} disabled={submitting}>
                {submitting ? 'Menyimpan...' : editId != null ? 'Simpan Perubahan' : 'Simpan'}
              </button>
            </footer>
          </form>
        </div>
      )}

      {preview && (
        <div className={styles.modalBack} onClick={tutupPreview}>
          <div className={styles.modal} style={{ width: 'min(700px, 100%)' }} onClick={(e) => e.stopPropagation()}>
            <header>
              <div>
                <h2>{preview.noKip}</h2>
                <p>
                  {preview.jenisPeralatan} — {preview.departemen}
                </p>
              </div>
              <button type="button" onClick={tutupPreview}>
                <X />
              </button>
            </header>
            <div style={{ padding: 20 }}>
              <KipCard3D kip={preview} />

              <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 6 }}>
                {NAMA_BULAN_SINGKAT.map((label, index) => {
                  const bulan = index + 1;
                  const status = statusTampilBulan(preview, bulan);
                  const baris = preview.checklist.find((c) => c.bulan === bulan);
                  const bisaKlik = status === 'SUDAH' && !!baris;
                  return (
                    <button
                      key={bulan}
                      type="button"
                      disabled={!bisaKlik}
                      onClick={() => baris && lihatBuktiBulan(baris)}
                      style={{
                        padding: '8px 4px',
                        borderRadius: 8,
                        border: '1px solid rgba(0,0,0,.08)',
                        background: warnaStatus(status),
                        fontSize: 11.5,
                        fontWeight: 700,
                        color: '#12355f',
                        cursor: bisaKlik ? 'pointer' : 'default',
                      }}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>

              {bolehCeklis && (() => {
                const bulanIni = new Date().getMonth() + 1;
                const status = statusTampilBulan(preview, bulanIni);
                if (status === 'SUDAH') {
                  return (
                    <p style={{ marginTop: 14, fontSize: 13, color: '#087848', fontWeight: 700 }}>
                      Bulan ini sudah diceklis. Klik bulan berwarna hijau di atas untuk lihat buktinya.
                    </p>
                  );
                }
                if (!formCeklisTampil) {
                  return (
                    <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                      <span style={{ fontSize: 12, color: '#71839d' }}>Login sebagai {user?.name} ({user?.role})</span>
                      <button className={styles.primary} onClick={() => setFormCeklisTampil(true)}>
                        Ceklis Sekarang
                      </button>
                    </div>
                  );
                }
                return (
                  <div style={{ marginTop: 16 }}>
                    <KipCeklisForm
                      parameterChecklist={preview.parameterChecklist}
                      submitting={busyCeklis}
                      error={ceklisError}
                      onSubmit={(payload) => ceklisSekarang(preview, payload)}
                    />
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {detailBulan && <KipDetailBulan baris={detailBulan} onTutup={() => setDetailBulan(null)} />}

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

              {gpsStatus === 'memuat' && (
                <p style={{ marginTop: 10, fontSize: 11.5, color: '#71839d' }}>Merekam titik GPS lokasi ini...</p>
              )}
              {gpsStatus === 'sukses' && (
                <p style={{ marginTop: 10, fontSize: 11.5, color: '#087848', fontWeight: 700 }}>{gpsPesan}</p>
              )}
              {gpsStatus === 'gagal' && (
                <p style={{ marginTop: 10, fontSize: 11.5, color: '#b3261e', fontWeight: 700 }}>{gpsPesan}</p>
              )}
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
