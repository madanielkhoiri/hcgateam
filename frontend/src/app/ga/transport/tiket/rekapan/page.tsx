'use client';

// ==================================================
// FILE: frontend/src/app/ga/transport/tiket/rekapan/page.tsx
// FUNGSI: Pilih 1 Billing, input PPH23 (PPN cuma referensi - sudah
// otomatis termasuk di Sub Total dari Grand Total tiap invoice), sistem
// hitung Sub Total - PPH23 lalu bandingkan dengan Grand Total tagihan
// vendor (cocok / selisih)
// ==================================================

import { useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useState } from 'react';
import { Calculator } from 'lucide-react';
import {
  formatPeriode,
  formatRupiah,
  formatWaktu,
  tiketBillingApi,
  type TiketBilling,
} from '@/lib/tiket-billing-api';
import transportStyles from '@/components/transport/transport.module.css';
import styles from '../billing/billing.module.css';

/** Buang semua karakter selain digit - dipakai supaya state tetap angka polos. */
function bersihkanAngka(value: string): string {
  return value.replace(/\D/g, '');
}

/** Format angka polos jadi "243.496.427" (titik ribuan) supaya gampang dibaca pas ngetik. */
function formatRibuan(value: string): string {
  if (!value) {
    return '';
  }

  return new Intl.NumberFormat('id-ID').format(Number(value));
}

export default function TiketRekapanPage() {
  return (
    <Suspense fallback={<div className={styles.kosong}>Memuat...</div>}>
      <TiketRekapanContent />
    </Suspense>
  );
}

function TiketRekapanContent() {
  const searchParams = useSearchParams();
  const billingIdAwal = searchParams.get('billingId');

  const [daftar, setDaftar] = useState<TiketBilling[]>([]);
  const [memuat, setMemuat] = useState(true);
  const [galat, setGalat] = useState('');
  const [sukses, setSukses] = useState('');
  const [proses, setProses] = useState(false);

  const [billingId, setBillingId] = useState(billingIdAwal ?? '');
  const [ppn, setPpn] = useState('');
  const [pph23, setPph23] = useState('');
  const [grandTotalVendor, setGrandTotalVendor] = useState('');

  const muat = useCallback(async () => {
    setMemuat(true);
    setGalat('');

    try {
      const hasil = await tiketBillingApi.daftar();
      setDaftar(hasil);
    } catch (error) {
      setGalat(error instanceof Error ? error.message : 'Gagal memuat data');
    } finally {
      setMemuat(false);
    }
  }, []);

  useEffect(() => {
    void muat();
  }, [muat]);

  const dipilih = daftar.find((item) => String(item.id) === billingId) ?? null;

  useEffect(() => {
    if (dipilih) {
      setPpn(dipilih.ppn !== null ? String(dipilih.ppn) : '');
      setPph23(dipilih.pph23 !== null ? String(dipilih.pph23) : '');
      setGrandTotalVendor(
        dipilih.grandTotalVendor !== null ? String(dipilih.grandTotalVendor) : '',
      );
    } else {
      setPpn('');
      setPph23('');
      setGrandTotalVendor('');
    }
  }, [dipilih?.id]);

  const subTotal = dipilih?.subTotal ?? 0;
  // PPN TIDAK dikurangi - Sub Total sudah dijumlah dari Grand Total tiap
  // invoice, yang masing-masing sudah termasuk PPN tiket itu sendiri.
  // Dikurangi lagi di sini = dobel hitung. PPN cuma disimpan sebagai
  // referensi/cocokkan dengan breakdown internal.
  const grandTotalHitungPreview = subTotal - (Number(pph23) || 0);

  async function hitungRekap() {
    if (!dipilih) {
      setGalat('Pilih Billing yang mau dihitung dulu');
      return;
    }

    setProses(true);
    setGalat('');
    setSukses('');

    try {
      const hasil = await tiketBillingApi.hitung(dipilih.id, {
        ppn: Number(ppn) || 0,
        pph23: Number(pph23) || 0,
        grandTotalVendor: Number(grandTotalVendor) || 0,
      });

      setSukses('Rekap berhasil dihitung dan disimpan.');
      setDaftar((current) =>
        current.map((item) => (item.id === hasil.id ? hasil : item)),
      );
    } catch (error) {
      setGalat(error instanceof Error ? error.message : 'Gagal menghitung rekap');
    } finally {
      setProses(false);
    }
  }

  const sudahDihitung = dipilih?.grandTotalHitung !== null && dipilih !== null;
  const cocok =
    sudahDihitung && dipilih!.grandTotalHitung === dipilih!.grandTotalVendor;
  const selisih = sudahDihitung
    ? (dipilih!.grandTotalHitung ?? 0) - (dipilih!.grandTotalVendor ?? 0)
    : 0;

  return (
    <>
      <div className={transportStyles.hero}>
        <div>
          <span className={transportStyles.heroIcon}>
            <Calculator size={24} />
          </span>
          <div>
            <h1>Rekapan</h1>
            <p>
              Pilih Billing yang mau dihitung, input PPH 23 (Bukti Potong)
              untuk dikurangi dari Sub Total, lalu dibandingkan dengan
              Grand Total dari tagihan resmi vendor. PPN 11% (VAT) cuma
              untuk referensi - sudah otomatis termasuk di Sub Total
              (dijumlah dari Grand Total tiap invoice).
            </p>
          </div>
        </div>
      </div>

      {galat ? <div className={styles.errorMessage}>{galat}</div> : null}
      {sukses ? <div className={styles.successMessage}>{sukses}</div> : null}

      <section className={styles.panel} style={{ marginBottom: 18 }}>
        <label className={styles.field}>
          <span>Pilih Billing</span>
          <select
            className={styles.select}
            value={billingId}
            onChange={(event) => setBillingId(event.target.value)}
            disabled={memuat}
          >
            <option value="">-- Pilih rekap Billing --</option>
            {daftar.map((item) => (
              <option key={item.id} value={item.id}>
                {item.namaRekapan} ({formatPeriode(item.bulan, item.tahun)})
              </option>
            ))}
          </select>
        </label>

        {dipilih ? (
          <>
            <div className={styles.fieldGrid} style={{ marginBottom: 14 }}>
              <div>
                <span style={{ color: '#8392a7', fontSize: 10, fontWeight: 700 }}>
                  Periode
                </span>
                <div style={{ fontWeight: 700, color: '#17375f' }}>
                  {formatPeriode(dipilih.bulan, dipilih.tahun)}
                </div>
              </div>
              <div>
                <span style={{ color: '#8392a7', fontSize: 10, fontWeight: 700 }}>
                  Jumlah Invoice
                </span>
                <div style={{ fontWeight: 700, color: '#17375f' }}>
                  {dipilih.jumlahInvoice}
                </div>
              </div>
            </div>

            <div className={styles.field}>
              <span>Sub Total (otomatis dari tiap invoice)</span>
              <div
                style={{
                  padding: '10px 12px',
                  color: '#087b44',
                  background: '#e5f7ed',
                  border: '1px solid #bfe5cf',
                  borderRadius: 10,
                  fontWeight: 700,
                }}
              >
                {formatRupiah(subTotal)}
              </div>
            </div>

            <div className={styles.fieldGrid}>
              <label className={styles.field}>
                <span>PPN 11% (VAT) - Rp (referensi, sudah termasuk di Sub Total)</span>
                <input
                  className={styles.input}
                  type="text"
                  inputMode="numeric"
                  value={formatRibuan(ppn)}
                  onChange={(event) => setPpn(bersihkanAngka(event.target.value))}
                  placeholder="0"
                />
              </label>

              <label className={styles.field}>
                <span>PPH 23 (Bukti Potong) - Rp</span>
                <input
                  className={styles.input}
                  type="text"
                  inputMode="numeric"
                  value={formatRibuan(pph23)}
                  onChange={(event) => setPph23(bersihkanAngka(event.target.value))}
                  placeholder="0"
                />
              </label>
            </div>

            <label className={styles.field}>
              <span>Grand Total (dari tagihan resmi vendor) - Rp</span>
              <input
                className={styles.input}
                type="text"
                inputMode="numeric"
                value={formatRibuan(grandTotalVendor)}
                onChange={(event) =>
                  setGrandTotalVendor(bersihkanAngka(event.target.value))
                }
                placeholder="0"
              />
            </label>

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px 14px',
                marginBottom: 14,
                background: '#f8fbff',
                border: '1px solid #d8e3ee',
                borderRadius: 10,
              }}
            >
              <span style={{ fontSize: 11, color: '#526a85', fontWeight: 700 }}>
                Sub Total - PPH23 =
              </span>
              <strong style={{ fontSize: 15, color: '#17375f' }}>
                {formatRupiah(grandTotalHitungPreview)}
              </strong>
            </div>

            <button
              type="button"
              className={transportStyles.primary}
              onClick={() => void hitungRekap()}
              disabled={proses}
            >
              {proses ? 'Menghitung...' : 'Hitung & Simpan Rekap'}
            </button>

            {sudahDihitung ? (
              <div style={{ marginTop: 16 }}>
                {cocok ? (
                  <div className={styles.successMessage}>
                    <strong>COCOK</strong> - Grand Total hasil hitung (
                    {formatRupiah(dipilih!.grandTotalHitung)}) sama dengan
                    Grand Total tagihan vendor (
                    {formatRupiah(dipilih!.grandTotalVendor)}).
                  </div>
                ) : (
                  <div className={styles.errorMessage}>
                    <strong>SELISIH</strong> - Grand Total hasil hitung (
                    {formatRupiah(dipilih!.grandTotalHitung)}) berbeda{' '}
                    {formatRupiah(Math.abs(selisih))} dari Grand Total
                    tagihan vendor ({formatRupiah(dipilih!.grandTotalVendor)}
                    ).
                  </div>
                )}
                {dipilih!.dihitungPada ? (
                  <div className={styles.subText}>
                    Terakhir dihitung {formatWaktu(dipilih!.dihitungPada)}
                    {dipilih!.penghitung ? ` oleh ${dipilih!.penghitung.name}` : ''}
                  </div>
                ) : null}
              </div>
            ) : null}
          </>
        ) : (
          <div className={styles.kosong}>
            Pilih rekap Billing dulu di atas untuk mulai menghitung.
          </div>
        )}
      </section>
    </>
  );
}
