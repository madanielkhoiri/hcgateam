"use client";

import { useMemo, useState } from "react";
import { Plus, X } from "lucide-react";
import { CONSTRUCTION_INSPECTION_CATALOG } from "./construction-inspection-catalog";

const COMMON = ["APD pekerja lengkap dan sesuai", "Peralatan kerja tersedia dan layak", "Material tersedia dan sesuai spesifikasi", "Shop drawing sudah disetujui", "JSA dan izin kerja tersedia", "Area kerja aman dan akses tidak terhalang"];
const HOUSEKEEPING = ["Area kerja bersih dan rapi", "Sisa material dan limbah ditangani dengan benar"];
const PERMITS = ["Hot Work Permit", "Working at Height Permit", "Confined Space Permit", "Excavation Permit", "Lifting Permit", "Electrical Permit", "Lock Out Tag Out (LOTO)", "Radiography Permit", "Road Closure Permit", "General Work Permit"];
const inputStyle = { width: "100%", padding: "10px 11px", border: "1px solid #cbd5e1", borderRadius: 8, background: "white" };
const gridStyle = { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 12 };
const sectionStyle = { padding: 14, border: "1px solid #dce5ef", borderRadius: 12, background: "#fff" };

type Payload = { nama: string; data: Record<string, unknown>; files: File[] };
type ChecklistItem = { key: string; bagian: string; pertanyaan: string };

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label style={{ display: "grid", gap: 6, fontSize: 13, fontWeight: 700 }}>{label}{children}</label>;
}

function Results({ items, hasil, setHasil }: { items: ChecklistItem[]; hasil: Record<string, string>; setHasil: React.Dispatch<React.SetStateAction<Record<string, string>>> }) {
  return <div style={{ display: "grid", gap: 10 }}>{items.map((item, index) => <Field key={item.key} label={`${index + 1}. ${item.pertanyaan}`}><select style={inputStyle} required value={hasil[item.key] ?? ""} onChange={event => setHasil(current => ({ ...current, [item.key]: event.target.value }))}><option value="">Pilih</option><option>OK</option><option>Tidak OK</option><option>N/A</option></select></Field>)}</div>;
}

export function ConstructionChecklistPopupV2({ projectName, vendorName, owner, onSubmit, submitting }: { projectName: string; vendorName: string; owner: boolean; onSubmit: (payload: Payload) => Promise<void>; submitting: boolean }) {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<Record<string, string>>({ proyek: projectName, vendor: vendorName, kategori: "", izinKhusus: "Tidak" });
  const [hasil, setHasil] = useState<Record<string, string>>({});
  const [file, setFile] = useState<File | null>(null);
  const [search, setSearch] = useState("");
  const set = (key: string, value: string) => setData(current => ({ ...current, [key]: value }));
  const jobs = useMemo(() => CONSTRUCTION_INSPECTION_CATALOG.filter(item => (!data.kategori || item.category === data.kategori) && `${item.id} ${item.name}`.toLowerCase().includes(search.toLowerCase())), [data.kategori, search]);
  const job = useMemo(() => CONSTRUCTION_INSPECTION_CATALOG.find(item => item.id === data.kodePekerjaan), [data.kodePekerjaan]);
  const groups = useMemo(() => ({
    B: COMMON.map((pertanyaan, i) => ({ key: `common-${i}`, bagian: "B", pertanyaan })),
    C: HOUSEKEEPING.map((pertanyaan, i) => ({ key: `house-${i}`, bagian: "C", pertanyaan })),
    E: (job?.questions ?? []).map((pertanyaan, i) => ({ key: `technical-${i}`, bagian: "E", pertanyaan })),
  }), [job]);
  const checklist = [...groups.B, ...groups.C, ...groups.E];
  const complete = groups.E.length > 0 && checklist.every(item => hasil[item.key]);
  const chooseCategory = (category: string) => { setData(current => ({ ...current, kategori: category, kodePekerjaan: "", jenisPekerjaan: "" })); setHasil({}); setSearch(""); };
  const chooseJob = (code: string) => { const selected = CONSTRUCTION_INSPECTION_CATALOG.find(item => item.id === code); setData(current => ({ ...current, kodePekerjaan: code, jenisPekerjaan: selected?.name ?? "", kategori: selected?.category ?? current.kategori })); setHasil({}); };
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    await onSubmit({ nama: data.jenisPekerjaan, data: { ...data, checklist: checklist.map(item => ({ bagian: item.bagian, pertanyaan: item.pertanyaan, hasil: hasil[item.key] })), statusKesiapan: complete ? "Siap Review" : "Belum Lengkap" }, files: file ? [file] : [] });
    setOpen(false);
  }
  return <>
    <button type="button" onClick={() => setOpen(true)} style={{ display: "inline-flex", gap: 7, alignItems: "center", padding: "11px 15px", border: 0, borderRadius: 9, background: "#ef7100", color: "white", fontWeight: 800 }}><Plus size={17}/> Tambah Checklist</button>
    {open && <div style={{ position: "fixed", inset: 0, zIndex: 1200, background: "rgba(8,24,48,.65)", display: "grid", placeItems: "center", padding: 18 }}><div style={{ width: "min(1040px,96vw)", maxHeight: "94vh", overflow: "auto", background: "#f5f8fc", borderRadius: 16 }}>
      <header style={{ position: "sticky", top: 0, zIndex: 2, display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 18px", background: "white", borderBottom: "1px solid #dce5ef" }}><h2 style={{ margin: 0 }}>Construction Inspection Checklist</h2><button type="button" onClick={() => setOpen(false)} style={{ border: 0, background: "#eef3f8", borderRadius: 8, padding: 8 }}><X size={18}/></button></header>
      <form onSubmit={submit} style={{ display: "grid", gap: 13, padding: 16 }}>
        <section style={sectionStyle}><h3>A. Informasi Umum Pekerjaan</h3><div style={gridStyle}>
          <Field label="Nama Proyek"><input style={inputStyle} readOnly value={projectName}/></Field><Field label="Kontraktor / Vendor"><input style={inputStyle} readOnly value={vendorName}/></Field><Field label="Tanggal Inspeksi"><input style={inputStyle} type="date" required value={data.tanggal ?? ""} onChange={e => set("tanggal", e.target.value)}/></Field><Field label="Nomor Inspeksi"><input style={inputStyle} required value={data.nomorInspeksi ?? ""} onChange={e => set("nomorInspeksi", e.target.value)}/></Field>
          <Field label="Kategori"><select style={inputStyle} value={data.kategori} onChange={e => chooseCategory(e.target.value)}><option value="">Semua Kategori (383 pekerjaan)</option>{["Arsitektur", "Struktur", "Elektrikal", "Plumbing"].map(x => <option key={x}>{x}</option>)}</select></Field><Field label="Cari Jenis Pekerjaan"><input style={inputStyle} placeholder="Contoh: pintu, beton, kabel..." value={search} onChange={e => setSearch(e.target.value)}/></Field><Field label={`Jenis Pekerjaan (${jobs.length} dari 383)`}><select style={inputStyle} required value={data.kodePekerjaan ?? ""} onChange={e => chooseJob(e.target.value)}><option value="">Pilih pekerjaan</option>{jobs.map((item, index) => <option key={item.id} value={item.id}>{data.kategori ? "" : `${index + 1}. `}{item.id} — {item.name}</option>)}</select></Field>
          <Field label="Gedung / Area"><input style={inputStyle} required value={data.area ?? ""} onChange={e => set("area", e.target.value)}/></Field><Field label="Lantai / Elevasi / Lokasi"><input style={inputStyle} required value={data.lokasi ?? ""} onChange={e => set("lokasi", e.target.value)}/></Field><Field label="Nomor Shop Drawing / Revisi"><input style={inputStyle} required value={data.shopDrawing ?? ""} onChange={e => set("shopDrawing", e.target.value)}/></Field><Field label="Jumlah Manpower"><input style={inputStyle} type="number" min="0" value={data.manpower ?? ""} onChange={e => set("manpower", e.target.value)}/></Field><Field label="Nama Pengawas Vendor"><input style={inputStyle} required value={data.pengawasVendor ?? ""} onChange={e => set("pengawasVendor", e.target.value)}/></Field><Field label="Peralatan Kerja"><input style={inputStyle} value={data.peralatan ?? ""} onChange={e => set("peralatan", e.target.value)}/></Field>
        </div></section>
        <section style={sectionStyle}><h3>B. Kesiapan dan Keselamatan Kerja</h3><Results items={groups.B} hasil={hasil} setHasil={setHasil}/></section>
        <section style={sectionStyle}><h3>C. Housekeeping</h3><Results items={groups.C} hasil={hasil} setHasil={setHasil}/></section>
        <section style={sectionStyle}><h3>D. Izin Kerja Khusus</h3><div style={gridStyle}><Field label="Memerlukan izin kerja khusus?"><select style={inputStyle} value={data.izinKhusus} onChange={e => set("izinKhusus", e.target.value)}><option>Tidak</option><option>Ya</option></select></Field>{data.izinKhusus === "Ya" && <Field label="Jenis Izin"><select style={inputStyle} required value={data.jenisIzin ?? ""} onChange={e => set("jenisIzin", e.target.value)}><option value="">Pilih izin</option>{PERMITS.map(x => <option key={x}>{x}</option>)}</select></Field>}</div></section>
        <section style={sectionStyle}><h3>E. Checklist Teknis{job ? ` — ${job.id} ${job.name}` : ""}</h3>{job ? <Results items={groups.E} hasil={hasil} setHasil={setHasil}/> : <p style={{ color: "#64748b" }}>Pilih jenis pekerjaan pada Bagian A agar checklist teknis muncul otomatis.</p>}</section>
        <section style={sectionStyle}><h3>F. Dokumentasi dan Catatan</h3><Field label="Catatan / Temuan Lapangan"><textarea style={inputStyle} value={data.catatan ?? ""} onChange={e => set("catatan", e.target.value)}/></Field><Field label="Foto Dokumentasi"><input style={inputStyle} type="file" accept="image/*,.pdf" onChange={e => setFile(e.target.files?.[0] ?? null)}/></Field></section>
        {owner && <section style={sectionStyle}><h3>G. Review & Approval Inspector (Owner)</h3><div style={gridStyle}><Field label="Nama Inspector PPA"><input style={inputStyle} value={data.inspector ?? ""} onChange={e => set("inspector", e.target.value)}/></Field><Field label="Keputusan Inspector"><select style={inputStyle} value={data.keputusan ?? ""} onChange={e => set("keputusan", e.target.value)}><option value="">Belum diputuskan</option><option>Reject dengan Catatan</option><option>Approve dengan Catatan</option><option>Approve Langsung</option></select></Field></div><Field label="Catatan Inspector"><textarea style={inputStyle} value={data.catatanInspector ?? ""} onChange={e => set("catatanInspector", e.target.value)}/></Field></section>}
        <button disabled={submitting} style={{ padding: 12, border: 0, borderRadius: 9, background: "#ef7100", color: "white", fontWeight: 800 }}>{submitting ? "Menyimpan..." : "Simpan Checklist"}</button>
      </form>
    </div></div>}
  </>;
}
