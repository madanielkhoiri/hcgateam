"use client";

// ==================================================
// Safety Stock Order — dipakai Inventory Infras, Mess, Electric.
// Analisa pemakaian (Barang Keluar) & Barang Masuk harian/bulanan ->
// safety stock, titik order, dan rekomendasi jumlah order bulan ini.
// ==================================================

import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  Download,
  Info,
  PackageX,
  Search,
  ShoppingCart,
} from "lucide-react";
import {
  ambilSafetyStock,
  type BarisSafetyStock,
  type HasilSafetyStock,
  type ScopeSafetyStock,
  type StatusSafetyStock,
} from "@/lib/safety-stock-api";
import { formatTanggal } from "@/lib/format-tanggal";
import base from "./inventory-crud.module.css";
import s from "./safety-stock.module.css";

const NAMA_SCOPE: Record<ScopeSafetyStock, string> = { GENERAL: "Infras", MESS: "Mess", ELECTRIC: "Electric" };
const BULAN_SINGKAT = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

const STATUS: Record<StatusSafetyStock, { label: string; kelas: string; urutan: number }> = {
  KRITIS: { label: "Kritis", kelas: s.statusKritis, urutan: 0 },
  PERLU_ORDER: { label: "Perlu Order", kelas: s.statusOrder, urutan: 1 },
  AMAN: { label: "Aman", kelas: s.statusAman, urutan: 2 },
  TIDAK_BERGERAK: { label: "Tidak Bergerak", kelas: s.statusDiam, urutan: 3 },
};

type Filter = "SEMUA" | StatusSafetyStock | "DIORDER";

const angka = (n: number, digit = 0) => n.toLocaleString("id-ID", { maximumFractionDigits: digit });
const labelBulan = (kunci: string) => `${BULAN_SINGKAT[Number(kunci.slice(5, 7)) - 1]} ${kunci.slice(2, 4)}`;

export default function SafetyStockPage({ scope }: { scope: ScopeSafetyStock }) {
  const [bulan, setBulan] = useState(3);
  const [leadTime, setLeadTime] = useState(7);
  const [leadTimeTeks, setLeadTimeTeks] = useState("7");
  const [serviceLevel, setServiceLevel] = useState(95);

  const [data, setData] = useState<HasilSafetyStock | null>(null);
  const [memuat, setMemuat] = useState(true);
  const [error, setError] = useState("");
  const [cari, setCari] = useState("");
  const [filter, setFilter] = useState<Filter>("SEMUA");
  const [terbuka, setTerbuka] = useState<number | null>(null);
  const [caraHitung, setCaraHitung] = useState(false);

  const muat = useCallback(async () => {
    setMemuat(true);
    setError("");
    try {
      setData(await ambilSafetyStock(scope, { bulan, leadTime, serviceLevel }));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Gagal memuat analisa");
    } finally {
      setMemuat(false);
    }
  }, [scope, bulan, leadTime, serviceLevel]);

  useEffect(() => {
    void muat();
  }, [muat]);

  function terapkanLeadTime() {
    const n = Math.round(Number(leadTimeTeks));
    if (Number.isFinite(n) && n >= 1 && n <= 90) setLeadTime(n);
    else setLeadTimeTeks(String(leadTime));
  }

  const daftar = useMemo(() => {
    const kata = cari.trim().toLowerCase();
    return (data?.items ?? [])
      .filter((b) => {
        if (filter === "DIORDER") return b.rekomendasiOrder > 0;
        return filter === "SEMUA" || b.status === filter;
      })
      .filter((b) => !kata || b.name.toLowerCase().includes(kata) || b.code.toLowerCase().includes(kata))
      .sort((a, b) => STATUS[a.status].urutan - STATUS[b.status].urutan || b.rekomendasiOrder - a.rekomendasiOrder);
  }, [data, cari, filter]);

  async function unduhExcel() {
    if (!data) return;
    const XLSX = await import("xlsx");
    const baris = daftar.map((b) => ({
      Kode: b.code,
      "Nama Barang": b.name,
      Satuan: b.unit,
      "Stok Saat Ini": b.stok,
      "Pemakaian / Bulan": b.kebutuhanBulanan,
      "Rata-rata / Hari": b.rataHarian,
      "Safety Stock": b.safetyStock,
      "Titik Order (ROP)": b.titikOrder,
      "Stok Tahan (hari)": b.hariTahan ?? "-",
      "Rekomendasi Order": b.rekomendasiOrder,
      Status: STATUS[b.status].label,
    }));
    const sheet = XLSX.utils.json_to_sheet(baris);
    sheet["!cols"] = [10, 34, 9, 12, 16, 14, 12, 16, 15, 17, 14].map((wch) => ({ wch }));
    const buku = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(buku, sheet, "Safety Stock");
    XLSX.writeFile(buku, `Safety Stock ${NAMA_SCOPE[scope]} ${data.periode.akhir}.xlsx`);
  }

  const r = data?.ringkasan;
  const dataSedikit = !!data && data.periode.jumlahHari < 60;

  const kartu: { kunci: Filter; label: string; nilai: number; ket: string; ikon: typeof AlertTriangle; kelas: string }[] = [
    { kunci: "KRITIS", label: "Kritis", nilai: r?.kritis ?? 0, ket: "Stok di bawah safety stock", ikon: AlertTriangle, kelas: s.kartuKritis },
    { kunci: "PERLU_ORDER", label: "Perlu Order", nilai: r?.perluOrder ?? 0, ket: "Stok sudah di titik order", ikon: ShoppingCart, kelas: s.kartuOrder },
    { kunci: "AMAN", label: "Aman", nilai: r?.aman ?? 0, ket: "Stok masih di atas titik order", ikon: CheckCircle2, kelas: s.kartuAman },
    { kunci: "TIDAK_BERGERAK", label: "Tidak Bergerak", nilai: r?.tidakBergerak ?? 0, ket: "Tidak ada pemakaian di periode ini", ikon: PackageX, kelas: s.kartuDiam },
  ];

  const chip: { kunci: Filter; label: string; jumlah: number }[] = [
    { kunci: "SEMUA", label: "Semua", jumlah: r?.totalBarang ?? 0 },
    { kunci: "DIORDER", label: "Ada rekomendasi order", jumlah: r?.barangDiorder ?? 0 },
    { kunci: "KRITIS", label: "Kritis", jumlah: r?.kritis ?? 0 },
    { kunci: "PERLU_ORDER", label: "Perlu Order", jumlah: r?.perluOrder ?? 0 },
    { kunci: "AMAN", label: "Aman", jumlah: r?.aman ?? 0 },
    { kunci: "TIDAK_BERGERAK", label: "Tidak Bergerak", jumlah: r?.tidakBergerak ?? 0 },
  ];

  return (
    <div className={`${base.page} ${s.halaman}`}>
      <header className={s.kepala}>
        <div>
          <span className={s.label}>Inventory {NAMA_SCOPE[scope]}</span>
          <h1>Safety Stock Order</h1>
          <p>Analisa pemakaian barang harian &amp; bulanan untuk menentukan stok pengaman dan jumlah order tiap bulan.</p>
        </div>
        <button type="button" className={s.tombolUnduh} onClick={() => void unduhExcel()} disabled={!data || !daftar.length}>
          <Download size={16} />
          Unduh Excel
        </button>
      </header>

      <section className={s.parameter}>
        <label>
          <span>Periode analisa</span>
          <select value={bulan} onChange={(e) => setBulan(Number(e.target.value))}>
            <option value={1}>1 bulan terakhir</option>
            <option value={3}>3 bulan terakhir</option>
            <option value={6}>6 bulan terakhir</option>
            <option value={12}>12 bulan terakhir</option>
          </select>
        </label>
        <label>
          <span>Lead time order</span>
          <div className={s.inputSatuan}>
            <input
              type="text"
              inputMode="numeric"
              value={leadTimeTeks}
              onChange={(e) => setLeadTimeTeks(e.target.value.replace(/\D/g, ""))}
              onBlur={terapkanLeadTime}
              onKeyDown={(e) => { if (e.key === "Enter") terapkanLeadTime(); }}
            />
            <em>hari</em>
          </div>
        </label>
        <label>
          <span>Tingkat layanan</span>
          <select value={serviceLevel} onChange={(e) => setServiceLevel(Number(e.target.value))}>
            <option value={90}>90% (stok lebih hemat)</option>
            <option value={95}>95% (disarankan)</option>
            <option value={98}>98%</option>
            <option value={99}>99% (paling aman)</option>
          </select>
        </label>
        <button type="button" className={s.tombolInfo} onClick={() => setCaraHitung((v) => !v)} aria-expanded={caraHitung}>
          <Info size={15} />
          Cara hitung
          <ChevronDown size={14} className={caraHitung ? s.putar : ""} />
        </button>
      </section>

      {caraHitung && (
        <section className={s.penjelasan}>
          <div>
            <b>Safety Stock</b>
            <p>Stok pengaman untuk menutup pemakaian yang naik-turun selama menunggu barang datang.</p>
            <code>Z × simpangan pemakaian harian × √lead time</code>
          </div>
          <div>
            <b>Titik Order (ROP)</b>
            <p>Saat stok menyentuh angka ini, barang harus segera dipesan.</p>
            <code>rata-rata harian × lead time + safety stock</code>
          </div>
          <div>
            <b>Rekomendasi Order</b>
            <p>Jumlah yang dipesan bulan ini agar cukup sebulan ke depan + masa tunggu, dan tetap menyisakan safety stock.</p>
            <code>rata-rata harian × (30 + lead time) + safety stock − stok</code>
          </div>
          <small>
            Z mengikuti tingkat layanan (90% = 1,28 · 95% = 1,65 · 98% = 2,05 · 99% = 2,33). Lead time = lama barang datang sejak dipesan.
            Data diambil dari Barang Keluar (pemakaian) dan Barang Masuk.
          </small>
        </section>
      )}

      {data && (
        <p className={`${s.catatanPeriode} ${dataSedikit ? s.catatanPeringatan : ""}`}>
          {dataSedikit ? <AlertTriangle size={15} /> : <Info size={15} />}
          <span>
            Data dianalisa <b>{formatTanggal(data.periode.awal, { timeZone: "UTC" })}</b> s.d.{" "}
            <b>{formatTanggal(data.periode.akhir, { timeZone: "UTC" })}</b> ({data.periode.jumlahHari} hari)
            {data.periode.dibatasiTransaksiPertama && " — dimulai dari transaksi pertama yang tercatat"}.
            {dataSedikit && " Data masih sedikit, hasil akan makin akurat setelah 2–3 bulan pemakaian tercatat."}
          </span>
        </p>
      )}

      <section className={s.kartu}>
        {kartu.map(({ kunci, label, nilai, ket, ikon: Ikon, kelas }) => (
          <button
            type="button"
            key={kunci}
            className={`${s.kartuItem} ${kelas} ${filter === kunci ? s.kartuAktif : ""}`}
            onClick={() => setFilter(filter === kunci ? "SEMUA" : kunci)}
          >
            <span className={s.kartuIkon}><Ikon size={18} /></span>
            <span className={s.kartuTeks}>
              <small>{label}</small>
              <strong>{memuat && !data ? "…" : angka(nilai)}</strong>
              <em>{ket}</em>
            </span>
          </button>
        ))}
      </section>

      <section className={s.alat}>
        <div className={s.cari}>
          <Search size={16} />
          <input value={cari} onChange={(e) => setCari(e.target.value)} placeholder="Cari nama atau kode barang..." />
        </div>
        <div className={s.chipBaris}>
          {chip.map((c) => (
            <button
              type="button"
              key={c.kunci}
              className={`${s.chip} ${filter === c.kunci ? s.chipAktif : ""}`}
              onClick={() => setFilter(c.kunci)}
            >
              {c.label}
              <span>{c.jumlah}</span>
            </button>
          ))}
        </div>
      </section>

      {error && <p className={s.error}>{error}</p>}

      <section className={s.tabelWrap}>
        <table className={s.tabel}>
          <thead>
            <tr>
              <th className={s.kolomBarang}>Barang</th>
              <th>Stok</th>
              <th>Pemakaian<small>/ bulan</small></th>
              <th>Rata-rata<small>/ hari</small></th>
              <th>Safety Stock</th>
              <th>Titik Order</th>
              <th>Stok Tahan</th>
              <th className={s.kolomOrder}>Rekomendasi Order</th>
              <th>Status</th>
              <th aria-label="Rincian" />
            </tr>
          </thead>
          <tbody>
            {memuat && !data ? (
              <tr><td colSpan={10} className={s.kosong}>Menghitung analisa...</td></tr>
            ) : !daftar.length ? (
              <tr><td colSpan={10} className={s.kosong}>Tidak ada barang yang cocok.</td></tr>
            ) : (
              daftar.map((b) => (
                <Fragment key={b.itemId}>
                  <tr
                    className={`${s.baris} ${terbuka === b.itemId ? s.barisTerbuka : ""}`}
                    onClick={() => setTerbuka(terbuka === b.itemId ? null : b.itemId)}
                  >
                    <td className={s.kolomBarang}>
                      <b>{b.name}</b>
                      <small>{b.code} · {b.unit}</small>
                    </td>
                    <td className={b.stok <= b.safetyStock && b.status !== "TIDAK_BERGERAK" ? s.angkaMerah : ""}>{angka(b.stok)}</td>
                    <td>{angka(b.kebutuhanBulanan)}</td>
                    <td>{angka(b.rataHarian, 2)}</td>
                    <td>{angka(b.safetyStock)}</td>
                    <td>{angka(b.titikOrder)}</td>
                    <td>{b.hariTahan === null ? "-" : `${angka(b.hariTahan)} hari`}</td>
                    <td className={s.kolomOrder}>
                      {b.rekomendasiOrder > 0 ? (
                        <span className={s.order}>{angka(b.rekomendasiOrder)} <small>{b.unit}</small></span>
                      ) : (
                        <span className={s.tidakOrder}>-</span>
                      )}
                    </td>
                    <td><span className={`${s.status} ${STATUS[b.status].kelas}`}>{STATUS[b.status].label}</span></td>
                    <td><ChevronDown size={16} className={`${s.panah} ${terbuka === b.itemId ? s.putar : ""}`} /></td>
                  </tr>
                  {terbuka === b.itemId && (
                    <tr className={s.barisDetail}>
                      <td colSpan={10}>
                        <Rincian baris={b} leadTime={data!.parameter.leadTime} z={data!.parameter.z} hari={data!.periode.jumlahHari} />
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}

function Rincian({ baris: b, leadTime, z, hari }: { baris: BarisSafetyStock; leadTime: number; z: number; hari: number }) {
  const maks = Math.max(1, ...b.perBulan.flatMap((p) => [p.masuk, p.keluar]));
  return (
    <div className={s.rincian}>
      <div className={s.grafik}>
        <div className={s.grafikJudul}>
          <b>Masuk &amp; keluar per bulan</b>
          <span><i className={s.legMasuk} /> Masuk <i className={s.legKeluar} /> Keluar</span>
        </div>
        <div className={s.batangWrap}>
          {b.perBulan.map((p) => (
            <div key={p.bulan} className={s.batangKolom}>
              <div className={s.batangPasang}>
                <div className={s.batangMasuk} style={{ height: `${(p.masuk / maks) * 100}%` }} title={`Masuk ${p.masuk}`}>
                  {p.masuk > 0 && <span>{angka(p.masuk)}</span>}
                </div>
                <div className={s.batangKeluar} style={{ height: `${(p.keluar / maks) * 100}%` }} title={`Keluar ${p.keluar}`}>
                  {p.keluar > 0 && <span>{angka(p.keluar)}</span>}
                </div>
              </div>
              <small>{labelBulan(p.bulan)}</small>
            </div>
          ))}
        </div>
      </div>

      <div className={s.statistik}>
        <div><small>Total keluar</small><b>{angka(b.totalKeluar)} {b.unit}</b></div>
        <div><small>Total masuk</small><b>{angka(b.totalMasuk)} {b.unit}</b></div>
        <div><small>Hari ada pemakaian</small><b>{b.hariAdaKeluar} dari {hari} hari</b></div>
        <div><small>Pemakaian terbanyak / hari</small><b>{angka(b.maksHarian)} {b.unit}</b></div>
      </div>

      {b.status !== "TIDAK_BERGERAK" && (
        <div className={s.hitungan}>
          <p>
            <span>Safety stock</span>
            <em>{z} × {angka(b.simpanganHarian, 2)} × √{leadTime} = <b>{angka(b.safetyStock)}</b></em>
          </p>
          <p>
            <span>Titik order</span>
            <em>{angka(b.rataHarian, 2)} × {leadTime} + {angka(b.safetyStock)} = <b>{angka(b.titikOrder)}</b></em>
          </p>
          <p>
            <span>Rekomendasi order</span>
            <em>
              {angka(b.rataHarian, 2)} × {30 + leadTime} + {angka(b.safetyStock)} − {angka(b.stok)} ={" "}
              <b>{angka(b.rekomendasiOrder)} {b.unit}</b>
            </em>
          </p>
        </div>
      )}
    </div>
  );
}
