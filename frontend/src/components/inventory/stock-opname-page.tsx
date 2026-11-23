"use client";

// ==================================================
// Stock Opname (cek fisik barang) — dipakai Inventory Infras, Mess, Electric.
// Daftar sesi -> buka sesi -> isi jumlah fisik + kondisi per barang (tersimpan
// per baris) -> Selesaikan: stok disesuaikan otomatis, selisih masuk Deviasi Stok.
// ==================================================

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  CheckCircle2,
  ClipboardCheck,
  Layers,
  ListChecks,
  Minus,
  PencilLine,
  Plus,
  Printer,
  Search,
  Trash2,
  Warehouse,
  X,
  Zap,
} from "lucide-react";
import { getStoredUser } from "@/lib/access-control";
import {
  stockOpnameApi,
  type BarisOpname,
  type DetailOpname,
  type KondisiOpname,
  type LokasiGudang,
  type ScopeOpname,
  type SesiOpname,
} from "@/lib/stock-opname-api";
import base from "./inventory-crud.module.css";
import s from "./stock-opname.module.css";

import { formatTanggal } from "@/lib/format-tanggal";
const NAMA_SCOPE: Record<ScopeOpname, string> = { GENERAL: "Infras", MESS: "Mess", ELECTRIC: "Electric" };
const LOKASI: Record<LokasiGudang, { label: string; warna: string; latar: string }> = {
  GUDANG_GA: { label: "Gudang GA", warna: "#047857", latar: "#dcfce7" },
  GUDANG_ELEKTRIK: { label: "Gudang Elektrik", warna: "#7e22ce", latar: "#f3e8ff" },
};
const KONDISI: Record<KondisiOpname, string> = { BAIK: "Baik", RUSAK: "Rusak", KADALUARSA: "Kadaluarsa" };
const ROLE_BOLEH = ["ADMIN", "SUPER_ADMIN", "SECTION_HEAD"];

const waktu = (nilai?: string | null) =>
  nilai
    ? formatTanggal(new Date(nilai), { waktu: true, timeZone: "Asia/Makassar" })
    : "-";

function LokasiChip({ lokasi }: { lokasi: LokasiGudang | null }) {
  if (!lokasi) return <span className={s.chipNetral}>Semua lokasi</span>;
  const info = LOKASI[lokasi];
  return <span className={s.chip} style={{ background: info.latar, color: info.warna }}>{info.label}</span>;
}

/** Draf input per baris sebelum tersimpan. */
type Draf = { stokFisik: string; kondisi: KondisiOpname; catatan: string };

type Konfirmasi = { jenis: "sisa"; jumlah: number } | { jenis: "selesai" } | { jenis: "batal"; sesi: SesiOpname };

const KONDISI_GAYA: Record<KondisiOpname, string> = { BAIK: s.kondisiBaik, RUSAK: s.kondisiRusak, KADALUARSA: s.kondisiKadaluarsa };

/** Popup dengan portal (tidak tertutup header), Esc / klik luar untuk menutup. */
function Dialog({ label, onClose, lebar = 520, children }: { label: string; onClose: () => void; lebar?: number; children: ReactNode }) {
  const tutupRef = useRef(onClose);
  useEffect(() => {
    tutupRef.current = onClose;
  }, [onClose]);
  useEffect(() => {
    const tekan = (e: KeyboardEvent) => { if (e.key === "Escape") tutupRef.current(); };
    window.addEventListener("keydown", tekan);
    const sebelum = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", tekan);
      document.body.style.overflow = sebelum;
    };
  }, []);
  return createPortal(
    <div className={s.overlay} onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div role="dialog" aria-modal="true" aria-label={label} className={s.dialog} style={{ maxWidth: lebar }}>
        {children}
      </div>
    </div>,
    document.body,
  );
}

function bulanIni() {
  return new Date().toLocaleDateString("id-ID", { month: "long", year: "numeric", timeZone: "Asia/Makassar" });
}

export default function StockOpnamePage({ scope }: { scope: ScopeOpname }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const idTerbuka = Number(searchParams.get("id")) || null;

  const [bolehAkses, setBolehAkses] = useState<boolean | null>(null);
  const [daftar, setDaftar] = useState<SesiOpname[]>([]);
  const [detail, setDetail] = useState<DetailOpname | null>(null);
  const [memuat, setMemuat] = useState(true);
  const [error, setError] = useState("");
  const [sukses, setSukses] = useState("");

  const [modalBaru, setModalBaru] = useState(false);
  const [lokasiBaru, setLokasiBaru] = useState<LokasiGudang | "">("");
  const [catatanBaru, setCatatanBaru] = useState("");
  const [proses, setProses] = useState(false);

  const [cari, setCari] = useState("");
  const [filter, setFilter] = useState<"SEMUA" | "BELUM" | "SUDAH" | "SELISIH">("SEMUA");
  const [draf, setDraf] = useState<Record<number, Draf>>({});
  const [menyimpan, setMenyimpan] = useState<Record<number, boolean>>({});
  const [konfirmasi, setKonfirmasi] = useState<Konfirmasi | null>(null);
  const timerSimpan = useRef<Record<number, ReturnType<typeof setTimeout>>>({});

  useEffect(() => {
    const timer = timerSimpan.current;
    return () => Object.values(timer).forEach(clearTimeout);
  }, []);

  useEffect(() => {
    const role = getStoredUser()?.role ?? "";
    setBolehAkses(ROLE_BOLEH.includes(role) || (scope === "ELECTRIC" && role === "ELEKTRIK"));
  }, [scope]);

  const muatDaftar = useCallback(async () => {
    setMemuat(true);
    setError("");
    try {
      setDaftar(await stockOpnameApi.daftar(scope));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Gagal memuat stock opname");
    } finally {
      setMemuat(false);
    }
  }, [scope]);

  const muatDetail = useCallback(async (id: number) => {
    setMemuat(true);
    setError("");
    try {
      const data = await stockOpnameApi.detail(scope, id);
      setDetail(data);
      setDraf({});
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Gagal memuat sesi");
      setDetail(null);
    } finally {
      setMemuat(false);
    }
  }, [scope]);

  useEffect(() => {
    if (!bolehAkses) return;
    if (idTerbuka) void muatDetail(idTerbuka);
    else {
      setDetail(null);
      void muatDaftar();
    }
  }, [bolehAkses, idTerbuka, muatDaftar, muatDetail]);

  const buka = (id: number | null) => router.push(id ? `${pathname}?id=${id}` : pathname);

  async function mulai() {
    setProses(true);
    setError("");
    try {
      const sesi = await stockOpnameApi.buat(scope, {
        ...(scope === "ELECTRIC" && lokasiBaru ? { lokasiGudang: lokasiBaru } : {}),
        catatan: catatanBaru.trim() || undefined,
      });
      setModalBaru(false);
      setCatatanBaru("");
      setLokasiBaru("");
      buka(sesi.id);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Gagal memulai stock opname");
    } finally {
      setProses(false);
    }
  }

  function nilaiBaris(baris: BarisOpname): Draf {
    return (
      draf[baris.itemId] ?? {
        stokFisik: baris.stokFisik === null ? "" : String(baris.stokFisik),
        kondisi: baris.kondisi ?? "BAIK",
        catatan: baris.catatan ?? "",
      }
    );
  }

  function ubahDraf(baris: BarisOpname, perubahan: Partial<Draf>) {
    setDraf((cur) => ({ ...cur, [baris.itemId]: { ...nilaiBaris(baris), ...perubahan } }));
  }

  async function simpanBaris(baris: BarisOpname, paksa?: Partial<Draf>) {
    if (!detail) return;
    const nilai = { ...nilaiBaris(baris), ...paksa };
    if (nilai.stokFisik.trim() === "") return;
    const fisik = Number(nilai.stokFisik);
    if (!Number.isInteger(fisik) || fisik < 0) {
      setError(`Jumlah fisik ${baris.item.code} harus angka bulat ≥ 0`);
      return;
    }
    // Tidak ada perubahan dari yang tersimpan -> tidak perlu kirim.
    if (baris.stokFisik === fisik && (baris.kondisi ?? "BAIK") === nilai.kondisi && (baris.catatan ?? "") === nilai.catatan.trim()) return;

    setMenyimpan((cur) => ({ ...cur, [baris.itemId]: true }));
    setError("");
    try {
      const hasil = await stockOpnameApi.isiItem(scope, detail.id, baris.itemId, {
        stokFisik: fisik,
        kondisi: nilai.kondisi,
        catatan: nilai.catatan.trim() || undefined,
      });
      setDetail((cur) => {
        if (!cur) return cur;
        const items = cur.items.map((row) => (row.itemId === hasil.itemId ? { ...row, ...hasil } : row));
        const dicek = items.filter((row) => row.stokFisik !== null);
        return {
          ...cur,
          items,
          ringkasan: {
            ...cur.ringkasan,
            sudahDicek: dicek.length,
            barangSelisih: dicek.filter((row) => row.stokFisik !== row.stokSistem).length,
            totalKurang: dicek.reduce((n, row) => n + Math.max(0, row.stokSistem - (row.stokFisik ?? 0)), 0),
            totalLebih: dicek.reduce((n, row) => n + Math.max(0, (row.stokFisik ?? 0) - row.stokSistem), 0),
            barangRusak: dicek.filter((row) => row.kondisi === "RUSAK").length,
            barangKadaluarsa: dicek.filter((row) => row.kondisi === "KADALUARSA").length,
          },
        };
      });
      setDraf((cur) => {
        const salinan = { ...cur };
        delete salinan[baris.itemId];
        return salinan;
      });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Gagal menyimpan");
    } finally {
      setMenyimpan((cur) => ({ ...cur, [baris.itemId]: false }));
    }
  }

  /** Tombol −/+ : ubah draf lalu simpan otomatis setelah jeda singkat. */
  function geserFisik(baris: BarisOpname, langkah: number) {
    const nilai = nilaiBaris(baris);
    const dasar = nilai.stokFisik.trim() === "" ? baris.stokSistem : Number(nilai.stokFisik) || 0;
    const baru = { ...nilai, stokFisik: String(Math.max(0, dasar + langkah)) };
    ubahDraf(baris, baru);
    clearTimeout(timerSimpan.current[baris.itemId]);
    timerSimpan.current[baris.itemId] = setTimeout(() => void simpanBaris(baris, baru), 700);
  }

  function samakanBaris(baris: BarisOpname) {
    const nilai = { ...nilaiBaris(baris), stokFisik: String(baris.stokSistem) };
    ubahDraf(baris, nilai);
    void simpanBaris(baris, nilai);
  }

  async function samakanSemuaBelum() {
    if (!detail) return;
    const belum = detail.items.filter((row) => row.stokFisik === null);
    setKonfirmasi(null);
    for (const baris of belum) {
      await simpanBaris(baris, { stokFisik: String(baris.stokSistem), kondisi: "BAIK" });
    }
  }

  async function selesaikan() {
    if (!detail) return;
    setProses(true);
    setError("");
    try {
      const hasil = await stockOpnameApi.selesaikan(scope, detail.id);
      setDetail(hasil);
      setKonfirmasi(null);
      setSukses(`${hasil.nomor} selesai. Stok sudah disesuaikan.`);
    } catch (caught) {
      setKonfirmasi(null);
      setError(caught instanceof Error ? caught.message : "Gagal menyelesaikan stock opname");
    } finally {
      setProses(false);
    }
  }

  async function batalkan(sesi: SesiOpname) {
    setProses(true);
    setError("");
    try {
      const hasil = await stockOpnameApi.batalkan(scope, sesi.id);
      setKonfirmasi(null);
      setSukses(hasil.message);
      if (detail?.id === sesi.id) buka(null);
      else void muatDaftar();
    } catch (caught) {
      setKonfirmasi(null);
      setError(caught instanceof Error ? caught.message : "Gagal membatalkan");
    } finally {
      setProses(false);
    }
  }

  // ================= POPUP KONFIRMASI =================
  function renderKonfirmasi() {
    if (!konfirmasi) return null;
    const tutup = () => { if (!proses) setKonfirmasi(null); };

    if (konfirmasi.jenis === "sisa") {
      return (
        <Dialog label="Isi sisa sama dengan stok sistem" onClose={tutup} lebar={440}>
          <div className={s.konfirmasi}>
            <span className={s.ikonBulat}><ListChecks size={24} /></span>
            <h2>Isi sisa = stok sistem?</h2>
            <p>
              <b>{konfirmasi.jumlah} barang</b> yang belum dicek akan diisi jumlah fisik sama dengan stok sistem, kondisi <b>Baik</b>.
            </p>
            <p className={s.petunjuk}>Pakai hanya untuk barang yang jumlahnya sudah dipastikan sama. Isian masih bisa diubah sebelum opname diselesaikan.</p>
          </div>
          <div className={s.dialogAksi}>
            <button type="button" className={s.tombolNetral} onClick={tutup}>Batal</button>
            <button type="button" className={s.tombolUtama} onClick={() => void samakanSemuaBelum()}>
              <Check size={16} /> Ya, isi {konfirmasi.jumlah} barang
            </button>
          </div>
        </Dialog>
      );
    }

    if (konfirmasi.jenis === "selesai" && detail) {
      const r = detail.ringkasan;
      return (
        <Dialog label="Selesaikan stock opname" onClose={tutup} lebar={500}>
          <div className={s.konfirmasi}>
            <span className={s.ikonBulat}><CheckCircle2 size={24} /></span>
            <h2>Selesaikan {detail.nomor}?</h2>
            <p>Periksa ringkasan hasil cek fisik di bawah ini.</p>
          </div>
          <div className={s.ringkasDialog}>
            <div><small>Barang dicek</small><b>{r.sudahDicek}/{r.totalBarang}</b></div>
            <div className={r.barangSelisih ? s.ringkasMerah : ""}><small>Barang selisih</small><b>{r.barangSelisih}</b><span>−{r.totalKurang} · +{r.totalLebih}</span></div>
            <div className={r.barangRusak + r.barangKadaluarsa ? s.ringkasKuning : ""}><small>Rusak / Kadaluarsa</small><b>{r.barangRusak + r.barangKadaluarsa}</b><span>{r.barangRusak} · {r.barangKadaluarsa}</span></div>
          </div>
          <ul className={s.peringatan}>
            <li>Stok sistem langsung disesuaikan dengan jumlah fisik.</li>
            <li>Setiap selisih dicatat otomatis di <b>Deviasi Stok</b>.</li>
            <li>Setelah selesai, checklist terkunci dan tidak bisa diubah.</li>
          </ul>
          <div className={s.dialogAksi}>
            <button type="button" className={s.tombolNetral} onClick={tutup} disabled={proses}>Periksa lagi</button>
            <button type="button" className={s.tombolUtama} disabled={proses} onClick={() => void selesaikan()}>
              <CheckCircle2 size={16} /> {proses ? "Menyimpan..." : "Ya, Selesaikan"}
            </button>
          </div>
        </Dialog>
      );
    }

    if (konfirmasi.jenis === "batal") {
      const sesi = konfirmasi.sesi;
      return (
        <Dialog label="Batalkan stock opname" onClose={tutup} lebar={440}>
          <div className={s.konfirmasi}>
            <span className={`${s.ikonBulat} ${s.ikonBahaya}`}><AlertTriangle size={24} /></span>
            <h2>Batalkan {sesi.nomor}?</h2>
            <p>
              Semua isian checklist sesi ini (<b>{sesi.ringkasan.sudahDicek} barang</b> sudah dicek) akan dihapus. Stok barang tidak berubah.
            </p>
          </div>
          <div className={s.dialogAksi}>
            <button type="button" className={s.tombolNetral} onClick={tutup} disabled={proses}>Kembali</button>
            <button type="button" className={s.tombolBahaya} disabled={proses} onClick={() => void batalkan(sesi)}>
              <Trash2 size={15} /> {proses ? "Membatalkan..." : "Ya, Batalkan"}
            </button>
          </div>
        </Dialog>
      );
    }
    return null;
  }

  const barisTampil = useMemo(() => {
    if (!detail) return [];
    const q = cari.trim().toLowerCase();
    return detail.items.filter((row) => {
      if (q && !`${row.item.code} ${row.item.name}`.toLowerCase().includes(q)) return false;
      if (filter === "BELUM") return row.stokFisik === null;
      if (filter === "SUDAH") return row.stokFisik !== null;
      if (filter === "SELISIH") return row.stokFisik !== null && row.stokFisik !== row.stokSistem;
      return true;
    });
  }, [detail, cari, filter]);

  if (bolehAkses === false) {
    return (
      <main className={base.page}>
        <div className={base.errorMessage}>Stock Opname hanya untuk Admin / Section Head{scope === "ELECTRIC" ? " / Elektrik" : ""}.</div>
      </main>
    );
  }

  // ================= DETAIL SESI =================
  if (idTerbuka) {
    const r = detail?.ringkasan;
    const berjalan = detail?.status === "BERJALAN";
    const persen = r && r.totalBarang ? Math.round((r.sudahDicek / r.totalBarang) * 100) : 0;

    return (
      <main className={`${base.page} ${s.halaman}`}>
        <button type="button" className={s.kembali} onClick={() => buka(null)}>
          <ArrowLeft size={16} /> Kembali ke daftar
        </button>

        {error && <div className={base.errorMessage}>{error}</div>}
        {sukses && <div className={base.successMessage}>{sukses}</div>}

        {memuat && !detail ? (
          <div className={s.kosong}>Memuat checklist...</div>
        ) : detail && r ? (
          <>
            <div className={s.cetakJudul}>
              <h2>BERITA ACARA STOCK OPNAME</h2>
              <p>Inventory {NAMA_SCOPE[scope]}</p>
            </div>

            <section className={s.kepala}>
              <div>
                <div className={s.nomor}>{detail.nomor}</div>
                <h1>Stock Opname Inventory {NAMA_SCOPE[scope]}</h1>
                <div className={s.meta}>
                  {scope === "ELECTRIC" && <LokasiChip lokasi={detail.lokasiGudang} />}
                  <span className={berjalan ? s.statusJalan : s.statusSelesai}>{berjalan ? "Berjalan" : "Selesai"}</span>
                  <span>Mulai {waktu(detail.createdAt)} oleh {detail.dibuatOlehNama}</span>
                  {!berjalan && <span>Selesai {waktu(detail.selesaiAt)} oleh {detail.selesaiOlehNama}</span>}
                </div>
                {detail.catatan && <p className={s.catatanSesi}>{detail.catatan}</p>}
              </div>
              <div className={s.aksiKepala}>
                {berjalan ? (
                  <>
                    <button type="button" className={s.tombolNetral} onClick={() => setKonfirmasi({ jenis: "batal", sesi: detail })}>
                      <Trash2 size={15} /> Batalkan
                    </button>
                    <button
                      type="button"
                      className={s.tombolUtama}
                      disabled={proses || r.sudahDicek < r.totalBarang}
                      title={r.sudahDicek < r.totalBarang ? "Semua barang harus dicek dulu" : undefined}
                      onClick={() => setKonfirmasi({ jenis: "selesai" })}
                    >
                      <CheckCircle2 size={16} /> {proses ? "Menyimpan..." : "Selesaikan Opname"}
                    </button>
                  </>
                ) : (
                  <button type="button" className={s.tombolUtama} onClick={() => window.print()}>
                    <Printer size={16} /> Cetak Berita Acara
                  </button>
                )}
              </div>
            </section>

            <section className={s.kartu}>
              <article className={s.kartuProgres}>
                <div className={s.kartuAtas}>
                  <small>Progres</small>
                  <span className={s.kartuIkon}><ListChecks size={18} /></span>
                </div>
                <strong>{r.sudahDicek}<em>/{r.totalBarang} barang</em></strong>
                <div className={s.barBaris}>
                  <div className={s.bar}><i style={{ width: `${persen}%` }} /></div>
                  <b>{persen}%</b>
                </div>
              </article>
              <article className={s.kartuSelisih}>
                <div className={s.kartuAtas}>
                  <small>Barang Selisih</small>
                  <span className={s.kartuIkon}><AlertTriangle size={18} /></span>
                </div>
                <strong>{r.barangSelisih}<em> barang</em></strong>
                <div className={s.kartuDetail}>
                  <span className={s.selisihKurang}>Kurang {r.totalKurang}</span>
                  <span className={s.selisihLebih}>Lebih {r.totalLebih}</span>
                </div>
              </article>
              <article className={s.kartuRusak}>
                <div className={s.kartuAtas}>
                  <small>Rusak / Kadaluarsa</small>
                  <span className={s.kartuIkon}><Trash2 size={18} /></span>
                </div>
                <strong>{r.barangRusak + r.barangKadaluarsa}<em> barang</em></strong>
                <div className={s.kartuDetail}>
                  <span className={s.kondisiRusak}>Rusak {r.barangRusak}</span>
                  <span className={s.kondisiKadaluarsa}>Kadaluarsa {r.barangKadaluarsa}</span>
                </div>
              </article>
            </section>

            <section className={s.alat}>
              <label className={s.cari}>
                <Search size={17} aria-hidden />
                <input value={cari} onChange={(e) => setCari(e.target.value)} placeholder="Cari kode atau nama barang..." aria-label="Cari barang" />
                {cari && <button type="button" onClick={() => setCari("")} aria-label="Hapus pencarian"><X size={13} /></button>}
              </label>
              <div className={s.filterChip}>
                {([
                  ["SEMUA", "Semua", r.totalBarang],
                  ["BELUM", "Belum dicek", r.totalBarang - r.sudahDicek],
                  ["SUDAH", "Sudah dicek", r.sudahDicek],
                  ["SELISIH", "Ada selisih", r.barangSelisih],
                ] as const).map(([nilai, label, jumlah]) => (
                  <button key={nilai} type="button" className={filter === nilai ? s.chipAktif : ""} onClick={() => setFilter(nilai)}>
                    {label} <i>{jumlah}</i>
                  </button>
                ))}
              </div>
              {berjalan && r.sudahDicek < r.totalBarang && (
                <button
                  type="button"
                  className={s.tombolNetral}
                  onClick={() => setKonfirmasi({ jenis: "sisa", jumlah: r.totalBarang - r.sudahDicek })}
                  title="Untuk barang yang jumlahnya sudah pasti sama"
                >
                  <ListChecks size={15} /> Isi sisa = stok sistem
                </button>
              )}
            </section>

            <section className={s.tabelWrap}>
              <table className={`${s.tabel} ${s.tabelCek}`}>
                <thead>
                  <tr>
                    <th>No</th>
                    <th>Barang</th>
                    <th>Stok Sistem</th>
                    <th>Jumlah Fisik</th>
                    <th>Selisih</th>
                    <th>Kondisi</th>
                    <th>Catatan</th>
                    <th className={s.kolomStatus}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {barisTampil.map((baris, index) => {
                    const nilai = nilaiBaris(baris);
                    const fisik = nilai.stokFisik.trim() === "" ? null : Number(nilai.stokFisik);
                    const selisih = fisik === null || Number.isNaN(fisik) ? null : fisik - baris.stokSistem;
                    const tersimpan = baris.stokFisik !== null && !draf[baris.itemId];
                    return (
                      <tr key={baris.id} className={tersimpan ? s.barisSelesai : ""}>
                        <td data-label="No">{index + 1}</td>
                        <td data-label="Barang" className={s.selBarang}>
                          <b>{baris.item.code}</b>
                          <span>{baris.item.name}</span>
                          {scope === "ELECTRIC" && baris.item.lokasiGudang && (
                            <em style={{ color: LOKASI[baris.item.lokasiGudang].warna }}>● {LOKASI[baris.item.lokasiGudang].label}</em>
                          )}
                        </td>
                        <td data-label="Stok Sistem"><b>{baris.stokSistem}</b> <small>{baris.item.unit}</small></td>
                        <td data-label="Jumlah Fisik">
                          {berjalan ? (
                            <div className={s.isianFisik}>
                              <div className={`${s.stepper} ${fisik !== null ? s.stepperTerisi : ""}`}>
                                <button type="button" onClick={() => geserFisik(baris, -1)} aria-label={`Kurangi ${baris.item.code}`}><Minus size={14} /></button>
                                <input
                                  type="number"
                                  inputMode="numeric"
                                  min={0}
                                  value={nilai.stokFisik}
                                  placeholder="—"
                                  onChange={(e) => ubahDraf(baris, { stokFisik: e.target.value })}
                                  onBlur={() => void simpanBaris(baris)}
                                  onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
                                  aria-label={`Jumlah fisik ${baris.item.code}`}
                                />
                                <button type="button" onClick={() => geserFisik(baris, 1)} aria-label={`Tambah ${baris.item.code}`}><Plus size={14} /></button>
                              </div>
                              {/* Selalu dirender (disembunyikan saat terisi) supaya tinggi baris tidak berubah. */}
                              <button
                                type="button"
                                className={`${s.tombolSama} ${fisik !== null ? s.tersembunyi : ""}`}
                                onClick={() => samakanBaris(baris)}
                                title="Jumlah fisik sama dengan stok sistem"
                                tabIndex={fisik !== null ? -1 : undefined}
                                aria-hidden={fisik !== null || undefined}
                              >
                                <Check size={13} /> Sesuai
                              </button>
                            </div>
                          ) : (
                            <b>{baris.stokFisik ?? "-"}</b>
                          )}
                        </td>
                        <td data-label="Selisih">
                          {selisih === null ? <span className={s.redup}>-</span> : (
                            <span className={selisih === 0 ? s.selisihNol : selisih < 0 ? s.selisihKurang : s.selisihLebih}>
                              {selisih > 0 ? `+${selisih}` : selisih}
                            </span>
                          )}
                        </td>
                        <td data-label="Kondisi">
                          {berjalan ? (
                            <div className={s.segmen} role="radiogroup" aria-label={`Kondisi ${baris.item.code}`}>
                              {(Object.keys(KONDISI) as KondisiOpname[]).map((k) => (
                                <button
                                  key={k}
                                  type="button"
                                  role="radio"
                                  aria-checked={nilai.kondisi === k}
                                  className={nilai.kondisi === k ? KONDISI_GAYA[k] : ""}
                                  onClick={() => {
                                    if (nilai.kondisi === k) return;
                                    ubahDraf(baris, { kondisi: k });
                                    void simpanBaris(baris, { kondisi: k });
                                  }}
                                >
                                  {KONDISI[k]}
                                </button>
                              ))}
                            </div>
                          ) : baris.kondisi ? (
                            <span className={`${s.labelKondisi} ${KONDISI_GAYA[baris.kondisi]}`}>{KONDISI[baris.kondisi]}</span>
                          ) : (
                            <span className={s.redup}>-</span>
                          )}
                        </td>
                        <td data-label="Catatan">
                          {berjalan ? (
                            <label className={s.inputCatatan}>
                              <PencilLine size={14} aria-hidden />
                              <input
                                value={nilai.catatan}
                                maxLength={300}
                                placeholder="Tambah catatan..."
                                onChange={(e) => ubahDraf(baris, { catatan: e.target.value })}
                                onBlur={() => void simpanBaris(baris)}
                                onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
                                aria-label={`Catatan ${baris.item.code}`}
                              />
                            </label>
                          ) : (
                            baris.catatan || <span className={s.redup}>-</span>
                          )}
                        </td>
                        <td data-label="Status" className={s.kolomStatus}>
                          {menyimpan[baris.itemId] ? (
                            <span className={s.redup}>Menyimpan…</span>
                          ) : tersimpan ? (
                            <span className={s.ok} title={`Dicek ${baris.dicekOlehNama ?? ""} ${waktu(baris.dicekAt)}`}><CheckCircle2 size={15} /> Dicek</span>
                          ) : (
                            <span className={s.belum}>Belum</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {!barisTampil.length && <div className={s.kosong}>Tidak ada barang sesuai filter.</div>}
            </section>

            <section className={s.ttd}>
              <div><span>Dibuat oleh</span><b>{detail.dibuatOlehNama}</b></div>
              <div><span>Diselesaikan oleh</span><b>{detail.selesaiOlehNama ?? "-"}</b></div>
              <div><span>Mengetahui</span><b>&nbsp;</b></div>
            </section>
          </>
        ) : null}
        {renderKonfirmasi()}
      </main>
    );
  }

  // ================= DAFTAR SESI =================
  const adaBerjalan = daftar.some((sesi) => sesi.status === "BERJALAN");

  return (
    <main className={base.page}>
      <div className={base.heading}>
        <div>
          <h1>Stock Opname</h1>
          <p>Cek fisik barang Inventory {NAMA_SCOPE[scope]}. Saat diselesaikan, stok otomatis disesuaikan dan selisihnya tercatat di Deviasi Stok.</p>
        </div>
        <button type="button" className={base.addButton} onClick={() => { setError(""); setModalBaru(true); }}>
          <Plus size={18} /> Mulai Stock Opname
        </button>
      </div>

      {error && !modalBaru && <div className={base.errorMessage}>{error}</div>}
      {sukses && <div className={base.successMessage}>{sukses}</div>}
      {adaBerjalan && <div className={s.info}><ClipboardCheck size={16} /> Ada stock opname yang masih berjalan. Lanjutkan pengisian dari tombol <b>Lanjutkan</b>.</div>}

      <section className={s.tabelWrap}>
        <table className={s.tabel}>
          <thead>
            <tr>
              <th>No</th>
              <th>Nomor</th>
              <th>Mulai</th>
              {scope === "ELECTRIC" && <th>Lokasi</th>}
              <th>Progres</th>
              <th>Selisih</th>
              <th>Status</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {daftar.map((sesi, index) => {
              const r = sesi.ringkasan;
              return (
                <tr key={sesi.id}>
                  <td data-label="No">{index + 1}</td>
                  <td data-label="Nomor"><b>{sesi.nomor}</b><small className={s.sub}>oleh {sesi.dibuatOlehNama}</small></td>
                  <td data-label="Mulai">{waktu(sesi.createdAt)}</td>
                  {scope === "ELECTRIC" && <td data-label="Lokasi"><LokasiChip lokasi={sesi.lokasiGudang} /></td>}
                  <td data-label="Progres">
                    <b>{r.sudahDicek}/{r.totalBarang}</b>
                    <div className={s.bar}><i style={{ width: `${r.totalBarang ? (r.sudahDicek / r.totalBarang) * 100 : 0}%` }} /></div>
                  </td>
                  <td data-label="Selisih">
                    {r.barangSelisih ? <span className={s.selisihKurang}>{r.barangSelisih} barang</span> : <span className={s.selisihNol}>Tidak ada</span>}
                  </td>
                  <td data-label="Status"><span className={sesi.status === "BERJALAN" ? s.statusJalan : s.statusSelesai}>{sesi.status === "BERJALAN" ? "Berjalan" : "Selesai"}</span></td>
                  <td data-label="Aksi">
                    <div className={s.aksiBaris}>
                      <button type="button" className={s.tombolUtamaKecil} onClick={() => buka(sesi.id)}>
                        {sesi.status === "BERJALAN" ? "Lanjutkan" : "Lihat"}
                      </button>
                      {sesi.status === "BERJALAN" && (
                        <button type="button" className={s.tombolHapus} onClick={() => setKonfirmasi({ jenis: "batal", sesi })} aria-label={`Batalkan ${sesi.nomor}`}>
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!daftar.length && <div className={s.kosong}>{memuat ? "Memuat..." : "Belum ada stock opname. Klik \"Mulai Stock Opname\" untuk membuat checklist."}</div>}
      </section>

      {modalBaru && (
        <Dialog label="Mulai Stock Opname" onClose={() => { if (!proses) setModalBaru(false); }} lebar={560}>
          <div className={s.dialogKepala}>
            <span className={s.ikonKepala}><ClipboardCheck size={22} /></span>
            <div>
              <h2>Mulai Stock Opname</h2>
              <p>Inventory {NAMA_SCOPE[scope]}</p>
            </div>
            <button type="button" className={s.tutupDialog} onClick={() => setModalBaru(false)} aria-label="Tutup" disabled={proses}><X size={18} /></button>
          </div>

          <ol className={s.langkah}>
            <li><span>1</span><div><b>Checklist dibuat</b><small>Semua barang aktif + stok sistem saat ini</small></div></li>
            <li><span>2</span><div><b>Hitung fisik</b><small>Isi jumlah & kondisi, tersimpan otomatis</small></div></li>
            <li><span>3</span><div><b>Selesaikan</b><small>Stok disesuaikan, selisih ke Deviasi Stok</small></div></li>
          </ol>

          <div className={s.formBaru}>
            {scope === "ELECTRIC" && (
              <div>
                <span className={s.labelForm}>Lokasi gudang yang dicek</span>
                <div className={s.pilihLokasi} role="radiogroup" aria-label="Lokasi gudang">
                  {([
                    ["", "Semua lokasi", "Gudang GA + Elektrik", Layers, "#0f766e", "#f0fdfa"],
                    ["GUDANG_GA", LOKASI.GUDANG_GA.label, "Barang di gudang GA", Warehouse, LOKASI.GUDANG_GA.warna, LOKASI.GUDANG_GA.latar],
                    ["GUDANG_ELEKTRIK", LOKASI.GUDANG_ELEKTRIK.label, "Barang di gudang elektrik", Zap, LOKASI.GUDANG_ELEKTRIK.warna, LOKASI.GUDANG_ELEKTRIK.latar],
                  ] as const).map(([nilai, label, ket, Ikon, warna, latar]) => {
                    const aktif = lokasiBaru === nilai;
                    return (
                      <button
                        key={nilai || "semua"}
                        type="button"
                        role="radio"
                        aria-checked={aktif}
                        className={`${s.kartuLokasi} ${aktif ? s.kartuLokasiAktif : ""}`}
                        onClick={() => setLokasiBaru(nilai)}
                        style={aktif ? { borderColor: warna, background: latar, color: warna } : undefined}
                      >
                        <span className={s.ikonLokasi} style={{ background: aktif ? warna : latar, color: aktif ? "#fff" : warna }}><Ikon size={17} /></span>
                        <b>{label}</b>
                        <small>{ket}</small>
                        {aktif && <i className={s.centang} style={{ background: warna }}><Check size={11} /></i>}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <label className={s.fieldCatatan}>
              <span className={s.labelForm}>Catatan <em>(opsional)</em></span>
              <textarea
                value={catatanBaru}
                onChange={(e) => setCatatanBaru(e.target.value)}
                maxLength={500}
                rows={3}
                placeholder={`Mis. Opname akhir bulan ${bulanIni()}`}
              />
              <div className={s.bawahCatatan}>
                <div className={s.saran}>
                  {[`Opname akhir bulan ${bulanIni()}`, "Opname rutin mingguan", "Cek mendadak"].map((teks) => (
                    <button key={teks} type="button" onClick={() => setCatatanBaru(teks)}>{teks}</button>
                  ))}
                </div>
                <small>{catatanBaru.length}/500</small>
              </div>
            </label>

            {error && <div className={base.errorMessage}>{error}</div>}
          </div>

          <div className={s.dialogAksi}>
            <button type="button" className={s.tombolNetral} onClick={() => setModalBaru(false)} disabled={proses}>Batal</button>
            <button type="button" className={s.tombolUtama} disabled={proses} onClick={() => void mulai()}>
              <ClipboardCheck size={16} /> {proses ? "Menyiapkan checklist..." : "Mulai & Buat Checklist"}
            </button>
          </div>
        </Dialog>
      )}
      {renderKonfirmasi()}
    </main>
  );
}
