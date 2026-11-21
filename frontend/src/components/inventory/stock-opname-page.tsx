"use client";

// ==================================================
// Stock Opname (cek fisik barang) — dipakai Inventory Infras, Mess, Electric.
// Daftar sesi -> buka sesi -> isi jumlah fisik + kondisi per barang (tersimpan
// per baris) -> Selesaikan: stok disesuaikan otomatis, selisih masuk Deviasi Stok.
// ==================================================

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, CheckCircle2, ClipboardCheck, Plus, Printer, Search, Trash2, X } from "lucide-react";
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

const NAMA_SCOPE: Record<ScopeOpname, string> = { GENERAL: "Infras", MESS: "Mess", ELECTRIC: "Electric" };
const LOKASI: Record<LokasiGudang, { label: string; warna: string; latar: string }> = {
  GUDANG_GA: { label: "Gudang GA", warna: "#047857", latar: "#dcfce7" },
  GUDANG_ELEKTRIK: { label: "Gudang Elektrik", warna: "#7e22ce", latar: "#f3e8ff" },
};
const KONDISI: Record<KondisiOpname, string> = { BAIK: "Baik", RUSAK: "Rusak", KADALUARSA: "Kadaluarsa" };
const ROLE_BOLEH = ["ADMIN", "SUPER_ADMIN", "SECTION_HEAD"];

const waktu = (nilai?: string | null) =>
  nilai
    ? new Date(nilai).toLocaleString("id-ID", { timeZone: "Asia/Makassar", day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
    : "-";

function LokasiChip({ lokasi }: { lokasi: LokasiGudang | null }) {
  if (!lokasi) return <span className={s.chipNetral}>Semua lokasi</span>;
  const info = LOKASI[lokasi];
  return <span className={s.chip} style={{ background: info.latar, color: info.warna }}>{info.label}</span>;
}

/** Draf input per baris sebelum tersimpan. */
type Draf = { stokFisik: string; kondisi: KondisiOpname; catatan: string };

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

  async function samakanSemuaBelum() {
    if (!detail) return;
    const belum = detail.items.filter((row) => row.stokFisik === null);
    if (!belum.length) return;
    if (!window.confirm(`Isi jumlah fisik = stok sistem untuk ${belum.length} barang yang belum dicek? (kondisi Baik)`)) return;
    for (const baris of belum) {
      // eslint-disable-next-line no-await-in-loop
      await simpanBaris(baris, { stokFisik: String(baris.stokSistem), kondisi: "BAIK" });
    }
  }

  async function selesaikan() {
    if (!detail) return;
    const r = detail.ringkasan;
    if (
      !window.confirm(
        `Selesaikan ${detail.nomor}?\n\n${r.barangSelisih} barang memiliki selisih. Stok sistem akan langsung disesuaikan dengan jumlah fisik dan selisihnya dicatat di Deviasi Stok. Setelah selesai, data tidak bisa diubah.`,
      )
    )
      return;
    setProses(true);
    setError("");
    try {
      const hasil = await stockOpnameApi.selesaikan(scope, detail.id);
      setDetail(hasil);
      setSukses(`${hasil.nomor} selesai. Stok sudah disesuaikan.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Gagal menyelesaikan stock opname");
    } finally {
      setProses(false);
    }
  }

  async function batalkan(sesi: SesiOpname) {
    if (!window.confirm(`Batalkan ${sesi.nomor}? Semua isian checklist sesi ini akan dihapus.`)) return;
    setError("");
    try {
      const hasil = await stockOpnameApi.batalkan(scope, sesi.id);
      setSukses(hasil.message);
      if (detail?.id === sesi.id) buka(null);
      else void muatDaftar();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Gagal membatalkan");
    }
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
                    <button type="button" className={s.tombolNetral} onClick={() => void batalkan(detail)}>
                      <Trash2 size={15} /> Batalkan
                    </button>
                    <button
                      type="button"
                      className={s.tombolUtama}
                      disabled={proses || r.sudahDicek < r.totalBarang}
                      title={r.sudahDicek < r.totalBarang ? "Semua barang harus dicek dulu" : undefined}
                      onClick={() => void selesaikan()}
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
              <article><small>Progres</small><strong>{r.sudahDicek}/{r.totalBarang}</strong><div className={s.bar}><i style={{ width: `${persen}%` }} /></div></article>
              <article className={s.kartuSelisih}><small>Barang Selisih</small><strong>{r.barangSelisih}</strong><span>Kurang {r.totalKurang} · Lebih {r.totalLebih}</span></article>
              <article className={s.kartuRusak}><small>Rusak / Kadaluarsa</small><strong>{r.barangRusak + r.barangKadaluarsa}</strong><span>Rusak {r.barangRusak} · Kadaluarsa {r.barangKadaluarsa}</span></article>
            </section>

            <section className={s.alat}>
              <label className={s.cari}>
                <Search size={17} aria-hidden />
                <input value={cari} onChange={(e) => setCari(e.target.value)} placeholder="Cari kode atau nama barang..." aria-label="Cari barang" />
                {cari && <button type="button" onClick={() => setCari("")} aria-label="Hapus pencarian"><X size={13} /></button>}
              </label>
              <div className={s.filterChip}>
                {([["SEMUA", "Semua"], ["BELUM", "Belum dicek"], ["SUDAH", "Sudah dicek"], ["SELISIH", "Ada selisih"]] as const).map(([nilai, label]) => (
                  <button key={nilai} type="button" className={filter === nilai ? s.chipAktif : ""} onClick={() => setFilter(nilai)}>{label}</button>
                ))}
              </div>
              {berjalan && r.sudahDicek < r.totalBarang && (
                <button type="button" className={s.tombolNetral} onClick={() => void samakanSemuaBelum()} title="Untuk barang yang jumlahnya sudah pasti sama">
                  Isi sisa = stok sistem
                </button>
              )}
            </section>

            <section className={s.tabelWrap}>
              <table className={s.tabel}>
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
                            <input
                              className={s.inputFisik}
                              type="number"
                              inputMode="numeric"
                              min={0}
                              value={nilai.stokFisik}
                              placeholder="0"
                              onChange={(e) => ubahDraf(baris, { stokFisik: e.target.value })}
                              onBlur={() => void simpanBaris(baris)}
                              onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
                              aria-label={`Jumlah fisik ${baris.item.code}`}
                            />
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
                            <select
                              className={s.inputKondisi}
                              value={nilai.kondisi}
                              onChange={(e) => {
                                const kondisi = e.target.value as KondisiOpname;
                                ubahDraf(baris, { kondisi });
                                void simpanBaris(baris, { kondisi });
                              }}
                              aria-label={`Kondisi ${baris.item.code}`}
                            >
                              {(Object.keys(KONDISI) as KondisiOpname[]).map((k) => <option key={k} value={k}>{KONDISI[k]}</option>)}
                            </select>
                          ) : (
                            <span className={baris.kondisi && baris.kondisi !== "BAIK" ? s.kondisiBuruk : ""}>{baris.kondisi ? KONDISI[baris.kondisi] : "-"}</span>
                          )}
                        </td>
                        <td data-label="Catatan">
                          {berjalan ? (
                            <input
                              className={s.inputCatatan}
                              value={nilai.catatan}
                              maxLength={300}
                              placeholder="Opsional"
                              onChange={(e) => ubahDraf(baris, { catatan: e.target.value })}
                              onBlur={() => void simpanBaris(baris)}
                              aria-label={`Catatan ${baris.item.code}`}
                            />
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
                        <button type="button" className={s.tombolHapus} onClick={() => void batalkan(sesi)} aria-label={`Batalkan ${sesi.nomor}`}>
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
        <div className={base.modalOverlay}>
          <div className={base.modal}>
            <div className={base.modalHeader}>
              <div>
                <h2>Mulai Stock Opname</h2>
                <p>Checklist berisi semua barang aktif beserta stok sistem saat ini.</p>
              </div>
              <button type="button" onClick={() => setModalBaru(false)} aria-label="Tutup"><X size={18} /></button>
            </div>
            <div className={s.formBaru}>
              {scope === "ELECTRIC" && (
                <div>
                  <span className={s.labelForm}>Lokasi Gudang</span>
                  <div className={s.pilihLokasi}>
                    {([["", "Semua lokasi", "#0f172a", "#f1f5f9"], ...Object.entries(LOKASI).map(([k, v]) => [k, v.label, v.warna, v.latar])] as Array<[string, string, string, string]>).map(([nilai, label, warna, latar]) => {
                      const aktif = lokasiBaru === nilai;
                      return (
                        <button
                          key={nilai || "semua"}
                          type="button"
                          onClick={() => setLokasiBaru(nilai as LokasiGudang | "")}
                          style={{ borderColor: aktif ? warna : "#d9e2ec", background: aktif ? latar : "#fff", color: aktif ? warna : "#475569" }}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
              <label>
                <span className={s.labelForm}>Catatan (opsional)</span>
                <textarea value={catatanBaru} onChange={(e) => setCatatanBaru(e.target.value)} maxLength={500} rows={3} placeholder="Mis. Opname akhir bulan November" />
              </label>
              {error && <div className={base.errorMessage}>{error}</div>}
            </div>
            <div className={s.formAksi}>
              <button type="button" className={s.tombolNetral} onClick={() => setModalBaru(false)}>Batal</button>
              <button type="button" className={s.tombolUtama} disabled={proses} onClick={() => void mulai()}>
                {proses ? "Menyiapkan..." : "Mulai & Buat Checklist"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
