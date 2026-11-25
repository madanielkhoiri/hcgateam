'use client';

// ==================================================
// Rincian TPS 3R mengikuti format Excel:
// - TIMBULAN  : Organik, Guna Ulang/Reuse, Daur Ulang/Recycle, Residu
// - PENANGANAN: Penanganan Organik, Penanganan Anorganik, Residu ke TPA
// Dipakai halaman Tabel Laporan & Sampah Terkelola (tabel + form popup).
// ==================================================

import { Pencil, Trash2, X } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { formatTanggal } from '@/lib/format-tanggal';
import type { LaporanTps3rInput } from '@/lib/tps3r-api';
import s from './rincian-tps3r.module.css';

export type KolomRincian = { key: string; label: string; ket?: string };

export type GrupRincian = {
  judul: string;
  warna: string;
  latar: string;
  kolom: KolomRincian[];
  /** Total kategori untuk data lama yang belum dirinci. Kosong = kolom tunggal (nilainya sendiri). */
  totalLama?: (baris: BarisRincian) => number;
};

export type BarisRincian = { id: number; tanggal: string } & Record<string, unknown>;

export const GRUP_TIMBULAN: GrupRincian[] = [
  {
    judul: 'Organik',
    warna: '#047857',
    latar: '#dcfce7',
    totalLama: (b) => Number(b.beratOrganik ?? 0),
    kolom: [
      { key: 'organikMakanan', label: 'Sampah makanan', ket: 'Sisa buah, sayuran, dsb.' },
      { key: 'organikTaman', label: 'Sampah taman', ket: 'Daun, potongan rumput, dsb.' },
    ],
  },
  {
    judul: 'Guna Ulang / Reuse',
    warna: '#a16207',
    latar: '#fef9c3',
    totalLama: (b) => Number(b.beratReuse ?? 0),
    kolom: [
      { key: 'reuseKertas', label: 'Kardus, karton, kertas HVS', ket: 'Dan sejenisnya' },
      { key: 'reusePlastik', label: 'Plastik', ket: 'Botol, wadah makan/minum' },
      { key: 'reuseLainnya', label: 'Lainnya' },
    ],
  },
  {
    judul: 'Daur Ulang / Recycle',
    warna: '#b91c1c',
    latar: '#fee2e2',
    totalLama: (b) => Number(b.beratRecycle ?? 0),
    kolom: [
      { key: 'recycleKertas', label: 'Kardus, karton, kertas', ket: 'Terkontaminasi' },
      { key: 'recyclePlastikKeras', label: 'Potongan plastik keras' },
      { key: 'recyclePallet', label: 'Pallet' },
      { key: 'recycleKaca', label: 'Kaca' },
      { key: 'recycleLogam', label: 'Kaleng, logam', ket: 'Kaleng minuman, logam, dsb.' },
    ],
  },
  {
    judul: 'Residu',
    warna: '#475569',
    latar: '#e2e8f0',
    kolom: [{ key: 'beratResidu', label: 'Residu', ket: 'Kain, puntung rokok, popok, dsb.' }],
  },
];

export const GRUP_PENANGANAN: GrupRincian[] = [
  {
    judul: 'Penanganan Organik',
    warna: '#047857',
    latar: '#dcfce7',
    totalLama: (b) => Number(b.beratOrganik ?? 0),
    kolom: [
      { key: 'tanganiBiopori', label: 'Biopori' },
      { key: 'tanganiKompos', label: 'Kompos' },
      { key: 'tanganiMaggot', label: 'Maggot' },
    ],
  },
  {
    judul: 'Penanganan Anorganik',
    warna: '#c2410c',
    latar: '#ffedd5',
    // Data lama: anorganik = guna ulang + daur ulang.
    totalLama: (b) => Number(b.beratReuse ?? 0) + Number(b.beratRecycle ?? 0),
    kolom: [
      { key: 'tanganiTpsNavaraha', label: 'TPS 3R Navaraha' },
      { key: 'tanganiTpsMenanti', label: 'TPS 3R Menanti' },
      { key: 'tanganiTpsMajuBersama', label: 'TPS 3R Maju Bersama' },
      { key: 'tanganiBankSampah', label: 'TPS 3R lainnya', ket: 'Bank Sampah Harapan Baru' },
    ],
  },
  {
    judul: 'Residu ke TPA',
    warna: '#475569',
    latar: '#e2e8f0',
    kolom: [{ key: 'beratResidu', label: 'Residu & lainnya ke TPA' }],
  },
];

// ---------- util ----------
const angka = (v: unknown): number | null => (v === null || v === undefined || v === '' ? null : Number(v));
const kg = (n: number) => n.toLocaleString('id-ID', { maximumFractionDigits: 2 });
const adaRincian = (g: GrupRincian, b: BarisRincian) => g.kolom.some((k) => angka(b[k.key]) !== null);
/** Data lama: kategori punya total tapi rinciannya belum diisi. */
const lamaGrup = (g: GrupRincian, b: BarisRincian) => !!g.totalLama && !adaRincian(g, b) && g.totalLama(b) > 0;
/** Kategori tidak diisi sama sekali di baris ini -> tampil kosong ("-"), bukan 0. */
const grupKosong = (g: GrupRincian, b: BarisRincian) =>
  g.totalLama ? !adaRincian(g, b) && !lamaGrup(g, b) : !angka(b[g.kolom[0].key]);

/** Total grup: jumlah rincian; data lama yang belum dirinci pakai total lama. */
export function totalGrup(g: GrupRincian, b: BarisRincian): number {
  if (!g.totalLama) return angka(b[g.kolom[0].key]) ?? 0;
  if (!adaRincian(g, b)) return g.totalLama(b);
  return g.kolom.reduce((n, k) => n + (angka(b[k.key]) ?? 0), 0);
}

// ---------- TABEL ----------
export function TabelRincian({
  grup,
  data,
  onEdit,
  onHapus,
  tampilPelapor,
  labelTotal = 'Total',
}: {
  grup: GrupRincian[];
  data: BarisRincian[];
  onEdit: (baris: BarisRincian) => void;
  onHapus: (baris: BarisRincian) => void;
  tampilPelapor?: boolean;
  labelTotal?: string;
}) {
  const multi = (g: GrupRincian) => g.kolom.length > 1;
  const jumlahKolom = (key: string) => data.reduce((n, b) => n + (angka(b[key]) ?? 0), 0);
  const kolomTerisi = (key: string) => data.some((b) => angka(b[key]) !== null);
  const jumlahGrup = (g: GrupRincian) => data.reduce((n, b) => n + totalGrup(g, b), 0);
  const adaDataLama = data.some((b) => grup.some((g) => lamaGrup(g, b)));
  const grupTerisi = (g: GrupRincian) => data.some((b) => !grupKosong(g, b));

  return (
    <div>
    {adaDataLama && (
      <p className={s.legenda}>
        <span className={s.contohLama}>Belum dirinci</span>
        Data lama yang hanya berisi total per kategori. Klik ubah untuk mengisi rinciannya.
      </p>
    )}
    <div className={s.tabelWrap}>
      <table className={s.tabel}>
        <thead>
          <tr>
            <th rowSpan={2} className={s.kolomTanggal}>Tanggal</th>
            {grup.map((g) => (
              <th
                key={g.judul}
                colSpan={g.kolom.length + (multi(g) ? 1 : 0)}
                rowSpan={multi(g) ? 1 : 2}
                className={s.thGrup}
                style={{ background: g.latar, color: g.warna, borderBottomColor: g.warna }}
              >
                {g.judul} <small>(kg)</small>
              </th>
            ))}
            {tampilPelapor && <th rowSpan={2}>Dilaporkan Oleh</th>}
            <th rowSpan={2} className={s.kolomAksi}>Aksi</th>
          </tr>
          <tr>
            {grup.filter(multi).flatMap((g) => [
              ...g.kolom.map((k) => (
                <th key={k.key} className={s.thKolom} title={k.ket}>
                  {k.label}
                  {k.ket && <small>{k.ket}</small>}
                </th>
              )),
              <th key={`${g.judul}-total`} className={s.thTotal} style={{ color: g.warna }}>Total</th>,
            ])}
          </tr>
        </thead>
        <tbody>
          {data.map((b) => (
            <tr key={b.id}>
              <td className={s.kolomTanggal}>{formatTanggal(b.tanggal, { timeZone: 'UTC' })}</td>
              {grup.flatMap((g) => {
                const lama = lamaGrup(g, b);
                const kosong = grupKosong(g, b);
                const sel = lama
                  ? [<td key={`${g.judul}-lama`} colSpan={g.kolom.length} className={s.selLama}>Belum dirinci</td>]
                  : g.kolom.map((k) => {
                      const v = angka(b[k.key]);
                      // Kolom tunggal (Residu) tersimpan 0 bila tidak diisi -> tampil kosong.
                      const tampilKosong = v === null || (!multi(g) && v === 0);
                      return <td key={k.key} className={tampilKosong ? s.kosong : ''}>{tampilKosong ? '-' : kg(v)}</td>;
                    });
                if (multi(g)) {
                  sel.push(
                    <td
                      key={`${g.judul}-total`}
                      className={`${s.tdTotal} ${kosong ? s.kosong : ''}`}
                      style={kosong ? undefined : { color: g.warna, background: `color-mix(in srgb, ${g.latar} 45%, #fff)` }}
                    >
                      {kosong ? '-' : kg(totalGrup(g, b))}
                    </td>,
                  );
                }
                return sel;
              })}
              {tampilPelapor && (
                <td className={s.pelapor}>
                  {(b.createdBy as { name?: string } | undefined)?.name ?? '-'}
                  {(b.createdBy as { nrp?: string | null } | undefined)?.nrp && <small>{(b.createdBy as { nrp: string }).nrp}</small>}
                </td>
              )}
              <td className={s.kolomAksi}>
                <div className={s.aksi}>
                  <button type="button" className={s.tombolIkon} onClick={() => onEdit(b)} title="Ubah"><Pencil size={13} /></button>
                  <button type="button" className={`${s.tombolIkon} ${s.tombolHapus}`} onClick={() => onHapus(b)} title="Hapus"><Trash2 size={13} /></button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
        {data.length > 0 && (
          <tfoot>
            <tr>
              <th className={s.kolomTanggal}>{labelTotal}</th>
              {grup.flatMap((g) => {
                const sel = g.kolom.map((k) => (
                  <th key={k.key} className={kolomTerisi(k.key) ? '' : s.kosong}>{kolomTerisi(k.key) ? kg(jumlahKolom(k.key)) : '-'}</th>
                ));
                const totalTh = grupTerisi(g) ? (
                  <th key={`${g.judul}-total`} style={{ color: g.warna }}>{kg(jumlahGrup(g))}</th>
                ) : (
                  <th key={`${g.judul}-total`} className={s.kosong}>-</th>
                );
                if (!multi(g)) return [totalTh];
                sel.push(totalTh);
                return sel;
              })}
              {tampilPelapor && <th />}
              <th className={s.kolomAksi} />
            </tr>
          </tfoot>
        )}
      </table>
    </div>
    </div>
  );
}

// ---------- FORM ----------
type IsiForm = Record<string, string>;

function isiAwal(grup: GrupRincian[], baris?: BarisRincian | null): IsiForm {
  const isi: IsiForm = { tanggal: baris ? baris.tanggal.slice(0, 10) : new Date().toISOString().slice(0, 10) };
  for (const g of grup) for (const k of g.kolom) {
    const v = baris ? angka(baris[k.key]) : null;
    // Kolom tunggal (Residu) tersimpan 0 bila dulu tidak diisi -> tampil kosong.
    isi[k.key] = v === null || (g.kolom.length === 1 && v === 0) ? '' : String(v);
  }
  return isi;
}

/** Susun payload: grup rinci yang dibiarkan kosong saat edit data lama -> tidak dikirim (total lama dipertahankan). */
function susunPayload(grup: GrupRincian[], isi: IsiForm, baris?: BarisRincian | null): LaporanTps3rInput {
  const payload: LaporanTps3rInput = { tanggal: isi.tanggal };
  for (const g of grup) {
    const terisi = g.kolom.some((k) => isi[k.key].trim() !== '');
    const dataLama = !!baris && lamaGrup(g, baris);
    if (!terisi && dataLama) continue;
    for (const k of g.kolom) payload[k.key] = isi[k.key].trim() === '' ? null : Number(isi[k.key].replace(',', '.'));
  }
  return payload;
}

export function FormRincian({
  judul,
  labelTanggal = 'Tanggal',
  grup,
  baris,
  onTutup,
  onSimpan,
}: {
  judul: string;
  labelTanggal?: string;
  grup: GrupRincian[];
  baris?: BarisRincian | null;
  onTutup: () => void;
  onSimpan: (payload: LaporanTps3rInput) => Promise<void>;
}) {
  const [isi, setIsi] = useState<IsiForm>(() => isiAwal(grup, baris));
  const [simpan, setSimpan] = useState(false);
  const [error, setError] = useState('');
  const tutupRef = useRef(onTutup);
  useEffect(() => {
    tutupRef.current = onTutup;
  }, [onTutup]);

  useEffect(() => {
    const tekan = (e: KeyboardEvent) => { if (e.key === 'Escape') tutupRef.current(); };
    window.addEventListener('keydown', tekan);
    const sebelum = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', tekan);
      document.body.style.overflow = sebelum;
    };
  }, []);

  const nilai = (key: string) => {
    const t = isi[key]?.trim();
    return t ? Number(t.replace(',', '.')) || 0 : 0;
  };

  async function kirim() {
    if (!isi.tanggal) {
      setError('Tanggal wajib diisi');
      return;
    }
    const salah = grup.flatMap((g) => g.kolom).find((k) => {
      const t = isi[k.key].trim();
      return t !== '' && (Number.isNaN(Number(t.replace(',', '.'))) || Number(t.replace(',', '.')) < 0);
    });
    if (salah) {
      setError(`${salah.label}: isi angka 0 atau lebih`);
      return;
    }
    setSimpan(true);
    setError('');
    try {
      await onSimpan(susunPayload(grup, isi, baris));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal menyimpan');
      setSimpan(false);
    }
  }

  const totalSemua = grup.reduce((n, g) => n + g.kolom.reduce((m, k) => m + nilai(k.key), 0), 0);

  return createPortal(
    <div className={s.overlay} onMouseDown={(e) => { if (e.target === e.currentTarget && !simpan) onTutup(); }}>
      <div className={s.dialog} role="dialog" aria-modal="true" aria-label={judul}>
        <div className={s.dialogKepala}>
          <h2>{judul}</h2>
          <button type="button" className={s.tutup} onClick={onTutup} aria-label="Tutup" disabled={simpan}><X size={18} /></button>
        </div>

        <div className={s.dialogIsi}>
          <div className={s.barisTanggal}>
            <label className={s.fieldTanggal}>
              <span>{labelTanggal}</span>
              <input type="date" value={isi.tanggal} onChange={(e) => setIsi({ ...isi, tanggal: e.target.value })} />
            </label>
            {isi.tanggal && <b className={s.tanggalBaca}>{formatTanggal(isi.tanggal, { hari: 'long', timeZone: 'UTC' })}</b>}
            <p className={s.petunjuk}>Isi berat dalam kg. Kolom yang tidak ada sampahnya biarkan kosong.</p>
          </div>

          {grup.map((g) => {
            const sub = g.kolom.reduce((n, k) => n + nilai(k.key), 0);
            const dataLama = !!baris && lamaGrup(g, baris);
            return (
              <section key={g.judul} className={s.grupForm} style={{ borderColor: g.latar }}>
                <header style={{ background: g.latar, color: g.warna }}>
                  <b>{g.judul}</b>
                  {g.kolom.length > 1 && <span className={s.subtotal}>Subtotal <strong>{kg(sub)} kg</strong></span>}
                </header>
                {dataLama && (
                  <p className={s.catatanLama}>
                    Data lama: total <b>{kg(g.totalLama!(baris!))} kg</b> belum dirinci. Biarkan kosong untuk mempertahankan total ini, atau isi rinciannya.
                  </p>
                )}
                <div className={s.gridInput}>
                  {g.kolom.map((k) => (
                    <Isian key={k.key} kolom={k} warna={g.warna} nilai={isi[k.key]} onUbah={(v) => setIsi({ ...isi, [k.key]: v })} />
                  ))}
                </div>
              </section>
            );
          })}
          {error && <p className={s.error}>{error}</p>}
        </div>

        <div className={s.dialogKaki}>
          <div className={s.ringkasKaki}>
            {grup.map((g) => (
              <span key={g.judul} className={s.chipGrup} style={{ background: g.latar, color: g.warna }}>
                {g.judul.split(' / ')[0]} <b>{kg(g.kolom.reduce((n, k) => n + nilai(k.key), 0))}</b>
              </span>
            ))}
            <span className={s.totalSemua}>Total <b>{kg(totalSemua)} kg</b></span>
          </div>
          <button type="button" className={s.tombolNetral} onClick={onTutup} disabled={simpan}>Batal</button>
          <button type="button" className={s.tombolUtama} onClick={() => void kirim()} disabled={simpan}>
            {simpan ? 'Menyimpan...' : 'Simpan'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function Isian({ kolom, warna, nilai, onUbah }: { kolom: KolomRincian; warna: string; nilai: string; onUbah: (v: string) => void }): ReactNode {
  return (
    <label className={s.isian} style={{ ['--warna' as string]: warna }}>
      <span>
        {kolom.label}
        {kolom.ket && <small>{kolom.ket}</small>}
      </span>
      <div className={s.inputKg}>
        <input
          type="text"
          inputMode="decimal"
          value={nilai}
          placeholder=""
          onFocus={(e) => e.currentTarget.select()}
          onChange={(e) => onUbah(e.target.value.replace(/[^0-9.,]/g, ''))}
        />
        <em>kg</em>
      </div>
    </label>
  );
}
