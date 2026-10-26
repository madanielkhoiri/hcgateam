"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ChevronRight, Edit3, Plus, Search, Trash2, X } from "lucide-react";
import { monitoringRkbApi, type KategoriRkb, type ProjectRkb } from "@/lib/monitoring-rkb-api";
import styles from "./monitoring-rkb.module.css";

const KATEGORI: Array<{ value: KategoriRkb; label: string }> = [
  { value: "PROJECT", label: "Project" },
  { value: "MAINTENANCE", label: "Maintenance" },
  { value: "ATK", label: "ATK" },
  { value: "FURNITURE", label: "Furniture" },
  { value: "BANGUNAN", label: "Bangunan" },
];

const labelKategori = (value: KategoriRkb) => KATEGORI.find((item) => item.value === value)?.label ?? value;

export default function DaftarProjectRkb() {
  const [data, setData] = useState<ProjectRkb[]>([]);
  const [modal, setModal] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [nama, setNama] = useState("");
  const [kategori, setKategori] = useState<KategoriRkb>("PROJECT");
  const [filterKategori, setFilterKategori] = useState<"SEMUA" | KategoriRkb>("SEMUA");
  const [cari, setCari] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    try {
      setData(await monitoringRkbApi.daftarProject());
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Data gagal dimuat");
    }
  }

  useEffect(() => { void load(); }, []);

  const hasilFilter = useMemo(() => data.filter((item) => {
    const kategoriCocok = filterKategori === "SEMUA" || item.kategori === filterKategori;
    const pencarianCocok = item.namaProject.toLowerCase().includes(cari.trim().toLowerCase());
    return kategoriCocok && pencarianCocok;
  }), [data, filterKategori, cari]);

  function tambah() { setEditId(null); setNama(""); setKategori("PROJECT"); setModal(true); }
  function edit(project: ProjectRkb) { setEditId(project.id); setNama(project.namaProject); setKategori(project.kategori); setModal(true); }

  async function simpan(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      const payload = { namaProject: nama, kategori };
      if (editId) await monitoringRkbApi.ubahProject(editId, payload);
      else await monitoringRkbApi.buatProject(payload);
      setModal(false);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Data gagal disimpan");
    } finally {
      setSaving(false);
    }
  }

  async function hapus(project: ProjectRkb) {
    if (!confirm(`Hapus ${project.namaProject} beserta seluruh data RKB di dalamnya?`)) return;
    try { await monitoringRkbApi.hapusProject(project.id); await load(); }
    catch (e) { setError(e instanceof Error ? e.message : "Data gagal dihapus"); }
  }

  return <main className={styles.page}>
    <header className={styles.header}>
      <div><h1>Daftar RKB</h1><p>Data dipisahkan berdasarkan kategori agar lebih mudah dicari dan dipantau.</p></div>
      <button className={styles.primary} onClick={tambah}><Plus size={16}/> Tambah RKB</button>
    </header>
    <section className={styles.listFilters}>
      <label className={styles.searchBox}><Search size={16}/><input value={cari} onChange={(e) => setCari(e.target.value)} placeholder="Cari nama..."/></label>
      <select value={filterKategori} onChange={(e) => setFilterKategori(e.target.value as "SEMUA" | KategoriRkb)}>
        <option value="SEMUA">Semua kategori</option>
        {KATEGORI.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
      </select>
    </section>
    {error && <div className={styles.error}>{error}</div>}
    <div className={styles.categoryList}>{KATEGORI.map((kelompok) => {
      const projects = hasilFilter.filter((item) => item.kategori === kelompok.value);
      if (!projects.length && filterKategori !== kelompok.value) return null;
      return <section className={styles.categorySection} key={kelompok.value}>
        <div className={styles.categoryHeading}><div><span className={`${styles.categoryDot} ${styles[`dot${kelompok.value}`]}`}/><h2>{kelompok.label}</h2></div><strong>{projects.length} data</strong></div>
        {projects.length ? <div className={styles.rkbGrid}>{projects.map((project) => <article className={styles.rkbCard} key={project.id}>
          <Link className={styles.cardLink} href={`/ga/monitoring-rkb/${project.id}`}><div className={styles.cardTop}><span className={`${styles.pill} ${styles[`pill${project.kategori}`]}`}>{labelKategori(project.kategori)}</span></div><h2>{project.namaProject}</h2><div className={styles.cardMetric}><strong>{project.rkb.length}</strong><span>Nomor RKB</span><ChevronRight size={20}/></div></Link>
          <div className={styles.cardActions}><button className={styles.iconButton} onClick={() => edit(project)}><Edit3 size={15}/> Edit</button><button className={styles.danger} onClick={() => void hapus(project)}><Trash2 size={15}/></button></div>
        </article>)}</div> : <div className={styles.categoryEmpty}>Belum ada data {kelompok.label}.</div>}
      </section>;
    })}</div>
    {hasilFilter.length === 0 && filterKategori === "SEMUA" && <div className={styles.empty}>Data tidak ditemukan.</div>}
    {modal && <div className={styles.overlay}><section className={styles.modalSmall}>
      <header className={styles.modalHeader}><h2>{editId ? "Edit RKB" : "Tambah RKB"}</h2><button className={styles.closeButton} onClick={() => setModal(false)}><X size={18}/></button></header>
      <form className={styles.form} onSubmit={simpan}><div className={styles.formGrid}>
        <label className={styles.field}><span>Nama</span><input required value={nama} onChange={(e) => setNama(e.target.value)} placeholder="Contoh: TPS 3R"/></label>
        <label className={styles.field}><span>Kategori</span><select value={kategori} onChange={(e) => setKategori(e.target.value as KategoriRkb)}>{KATEGORI.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
      </div><footer className={styles.footer}><button type="button" className={styles.secondary} onClick={() => setModal(false)}>Batal</button><button className={styles.primary} disabled={saving}>{saving ? "Menyimpan..." : "Simpan"}</button></footer></form>
    </section></div>}
  </main>;
}
