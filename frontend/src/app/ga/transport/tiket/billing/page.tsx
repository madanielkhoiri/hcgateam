'use client';

// ==================================================
// FILE: frontend/src/app/ga/transport/tiket/billing/page.tsx
// FUNGSI: Upload ZIP invoice tiket -> gabung jadi 1 PDF rekap + simpan
// histori per bulan/tahun (Sub Total otomatis dari tiap invoice)
// ==================================================

import Link from 'next/link';
import { ChangeEvent, useCallback, useEffect, useState } from 'react';
import { FileStack, Loader2, UploadCloud } from 'lucide-react';
import {
  formatPeriode,
  formatRupiah,
  formatWaktu,
  LABEL_BULAN,
  tiketBillingApi,
  type TiketBilling,
} from '@/lib/tiket-billing-api';
import transportStyles from '@/components/transport/transport.module.css';
import styles from './billing.module.css';

function tahunBerjalan(): number {
  return new Date().getFullYear();
}

function bulanBerjalan(): number {
  return new Date().getMonth() + 1;
}

export default function TiketBillingPage() {
  const [daftar, setDaftar] = useState<TiketBilling[]>([]);
  const [memuat, setMemuat] = useState(true);
  const [galat, setGalat] = useState('');
  const [sukses, setSukses] = useState('');

  const [filterBulan, setFilterBulan] = useState('');
  const [filterTahun, setFilterTahun] = useState('');

  const [berkas, setBerkas] = useState<File | null>(null);
  const [dialogTerbuka, setDialogTerbuka] = useState(false);
  const [namaRekapan, setNamaRekapan] = useState('');
  const [bulanForm, setBulanForm] = useState(bulanBerjalan());
  const [tahunForm, setTahunForm] = useState(tahunBerjalan());
  const [proses, setProses] = useState(false);

  const tahunTersedia = Array.from({ length: 6 }, (_, i) => tahunBerjalan() - 4 + i);

  const muat = useCallback(async () => {
    setMemuat(true);
    setGalat('');

    try {
      const hasil = await tiketBillingApi.daftar({
        bulan: filterBulan ? Number(filterBulan) : undefined,
        tahun: filterTahun ? Number(filterTahun) : undefined,
      });
      setDaftar(hasil);
    } catch (error) {
      setGalat(error instanceof Error ? error.message : 'Gagal memuat data');
    } finally {
      setMemuat(false);
    }
  }, [filterBulan, filterTahun]);

  useEffect(() => {
    void muat();
  }, [muat]);

  function pilihBerkas(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;

    if (file && !file.name.toLowerCase().endsWith('.zip')) {
      setGalat('File wajib berformat ZIP');
      setBerkas(null);
      return;
    }

    setGalat('');

    if (file) {
      setBerkas(file);
      // Usulkan nama rekapan dari nama file ZIP-nya (masih bisa diedit).
      setNamaRekapan(file.name.replace(/\.zip$/i, ''));
      setDialogTerbuka(true);
    }
  }

  async function simpanRekapan() {
    if (!berkas) {
      return;
    }

    if (!namaRekapan.trim()) {
      setGalat('Nama rekapan wajib diisi');
      return;
    }

    setProses(true);
    setGalat('');
    setSukses('');

    try {
      const formData = new FormData();
      formData.append('zip', berkas);
      formData.append('namaRekapan', namaRekapan.trim());
      formData.append('bulan', String(bulanForm));
      formData.append('tahun', String(tahunForm));

      const hasil = await tiketBillingApi.buat(formData);

      setSukses(
        `"${hasil.namaRekapan}" berhasil dibuat - ${hasil.jumlahInvoice} invoice, Sub Total ${formatRupiah(hasil.subTotal)}.`,
      );
      setDialogTerbuka(false);
      setBerkas(null);
      await muat();
    } catch (error) {
      setGalat(error instanceof Error ? error.message : 'Rekap gagal dibuat');
    } finally {
      setProses(false);
    }
  }

  return (
    <>
      <div className={transportStyles.hero}>
        <div>
          <span className={transportStyles.heroIcon}>
            <FileStack size={24} />
          </span>
          <div>
            <h1>Billing</h1>
            <p>
              Unggah 1 file ZIP berisi invoice (PDF), sistem otomatis
              menggabungkannya jadi 1 PDF rekap grid dan menjumlahkan Sub
              Total dari tiap invoice. Tersimpan sebagai histori per bulan
              &amp; tahun.
            </p>
          </div>
        </div>
      </div>

      <section className={styles.panel} style={{ marginBottom: 18 }}>
        <label className={styles.uploadBox}>
          <UploadCloud size={28} />
          <div>
            <strong>Pilih atau tarik file ZIP ke sini</strong>
            <small>
              1 file ZIP berisi invoice PDF, urut sesuai nama file di
              dalamnya
            </small>
          </div>
          <input type="file" accept=".zip" onChange={pilihBerkas} />
        </label>
      </section>

      {galat ? <div className={styles.errorMessage}>{galat}</div> : null}
      {sukses ? <div className={styles.successMessage}>{sukses}</div> : null}

      <section className={styles.panel}>
        <div className={styles.panelHead}>
          <h2>Histori Billing</h2>
          <div className={styles.filterBar}>
            <select
              className={styles.select}
              value={filterBulan}
              onChange={(event) => setFilterBulan(event.target.value)}
            >
              <option value="">Semua Bulan</option>
              {LABEL_BULAN.map((label, index) => (
                <option key={label} value={index + 1}>
                  {label}
                </option>
              ))}
            </select>

            <select
              className={styles.select}
              value={filterTahun}
              onChange={(event) => setFilterTahun(event.target.value)}
            >
              <option value="">Semua Tahun</option>
              {tahunTersedia.map((tahun) => (
                <option key={tahun} value={tahun}>
                  {tahun}
                </option>
              ))}
            </select>
          </div>
        </div>

        {memuat ? (
          <div className={styles.kosong}>Memuat...</div>
        ) : daftar.length === 0 ? (
          <div className={styles.kosong}>Belum ada rekap Billing.</div>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Nama Rekapan</th>
                  <th>Periode</th>
                  <th>Jml Invoice</th>
                  <th>Sub Total</th>
                  <th>Status Rekap</th>
                  <th>Dibuat</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {daftar.map((item) => (
                  <tr key={item.id}>
                    <td>{item.namaRekapan}</td>
                    <td>{formatPeriode(item.bulan, item.tahun)}</td>
                    <td>{item.jumlahInvoice}</td>
                    <td>{formatRupiah(item.subTotal)}</td>
                    <td>
                      {item.grandTotalHitung === null ? (
                        <span className={styles.badgeNetral}>
                          Belum dihitung
                        </span>
                      ) : item.grandTotalHitung === item.grandTotalVendor ? (
                        <span className={styles.badgeCocok}>Cocok</span>
                      ) : (
                        <span className={styles.badgeSelisih}>Selisih</span>
                      )}
                    </td>
                    <td>
                      {formatWaktu(item.createdAt)}
                      <div className={styles.subText}>
                        {item.pembuat.name}
                      </div>
                    </td>
                    <td>
                      <div className={styles.rowAksi}>
                        <a
                          className={styles.tombolKecil}
                          href={tiketBillingApi.urlPdf(item.filePdf)}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Lihat PDF
                        </a>
                        <Link
                          href={`/ga/transport/tiket/rekapan?billingId=${item.id}`}
                          className={styles.tombolKecil}
                        >
                          Hitung Rekap
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {dialogTerbuka ? (
        <div
          className={styles.overlay}
          onClick={(event) => {
            if (event.target === event.currentTarget && !proses) {
              setDialogTerbuka(false);
            }
          }}
        >
          <div className={styles.dialog}>
            <h3>Nama Rekapan</h3>
            <p>Beri nama supaya mudah dicari di histori nanti.</p>

            <label className={styles.field}>
              <span>Nama Rekapan</span>
              <input
                className={styles.input}
                value={namaRekapan}
                onChange={(event) => setNamaRekapan(event.target.value)}
                placeholder="Contoh: Billing ADW 09-15 September 2026"
                autoFocus
              />
            </label>

            <div className={styles.fieldGrid}>
              <label className={styles.field}>
                <span>Bulan</span>
                <select
                  className={styles.select}
                  value={bulanForm}
                  onChange={(event) => setBulanForm(Number(event.target.value))}
                >
                  {LABEL_BULAN.map((label, index) => (
                    <option key={label} value={index + 1}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>

              <label className={styles.field}>
                <span>Tahun</span>
                <select
                  className={styles.select}
                  value={tahunForm}
                  onChange={(event) => setTahunForm(Number(event.target.value))}
                >
                  {tahunTersedia.map((tahun) => (
                    <option key={tahun} value={tahun}>
                      {tahun}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {galat ? <div className={styles.errorMessage}>{galat}</div> : null}

            <div className={styles.dialogAksi}>
              <button
                type="button"
                className={styles.tombolNetral}
                onClick={() => setDialogTerbuka(false)}
                disabled={proses}
              >
                Batal
              </button>
              <button
                type="button"
                className={transportStyles.primary}
                onClick={() => void simpanRekapan()}
                disabled={proses}
              >
                {proses ? (
                  <>
                    <Loader2 size={16} className={styles.spin} />
                    Memproses...
                  </>
                ) : (
                  'Buat Rekap'
                )}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
