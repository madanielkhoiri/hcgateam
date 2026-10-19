"use client";

import { useMemo, useState } from "react";
import { X, Plus } from "lucide-react";

const KATALOG = {
  KTA: {
    "Housekeeping & akses": ["Material berserakan di jalur kerja", "Tumpahan menyebabkan licin", "Jalur evakuasi terhalang", "Pencahayaan tidak memadai"],
    "Ketinggian & scaffolding": ["Guardrail/toeboard tidak lengkap", "Platform kerja tidak aman", "Scaffolding tanpa inspeksi/tag", "Lubang lantai tanpa penutup"],
    Kelistrikan: ["Kabel terkelupas atau terbuka", "Panel terbuka tanpa pengaman", "Grounding tidak memadai", "Kabel melintang di jalur kerja"],
    "Alat & mesin": ["Pelindung mesin tidak terpasang", "Alat rusak/tidak layak", "Emergency stop tidak berfungsi", "Peralatan tanpa inspeksi"],
    "Lifting & material": ["Material ditumpuk tidak stabil", "Rigging rusak/tidak layak", "Area lifting tanpa barricade", "Beban tergantung tidak diamankan"],
    "Galian & struktur": ["Galian tanpa proteksi tepi", "Dinding galian tidak stabil", "Material berpotensi jatuh", "Struktur sementara tidak aman"],
    "Kebakaran & bahan kimia": ["APAR tidak tersedia/terhalang", "Bahan mudah terbakar tidak tertata", "Tabung gas tidak diamankan", "Bahan kimia tanpa label/SDS"],
  },
  TTA: {
    APD: ["Tidak menggunakan helm keselamatan", "Tidak memakai safety harness", "Tidak menggunakan pelindung mata/wajah", "APD digunakan tidak benar"],
    "Izin kerja & prosedur": ["Bekerja tanpa izin wajib", "Mengabaikan JSA atau SOP", "Bekerja di luar kewenangan", "Mengabaikan instruksi keselamatan"],
    Ketinggian: ["Tidak mengaitkan lanyard", "Memanjat tanpa akses aman", "Bekerja di tepi tanpa pengendalian", "Menjatuhkan alat/material"],
    "Kelistrikan & LOTO": ["Bekerja tanpa isolasi energi", "Tidak verifikasi bebas tegangan", "Melepas pengaman tanpa otorisasi", "Melakukan bypass interlock"],
    "Lifting & alat berat": ["Berada di bawah beban tergantung", "Masuk radius lifting tanpa izin", "Tidak mengikuti arahan rigger", "Mengoperasikan alat tanpa kompetensi"],
    "Perilaku & ergonomi": ["Bercanda berbahaya saat bekerja", "Mengangkat beban dengan teknik tidak aman", "Menggunakan ponsel saat aktivitas kritis", "Menerobos barricade"],
  },
} as const;

const inputStyle = { width: "100%", padding: "10px 11px", border: "1px solid #cbd5e1", borderRadius: 8, background: "white" };
const gridStyle = { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 12 };
const sectionStyle = { padding: 14, border: "1px solid #dce5ef", borderRadius: 12, background: "#fff" };

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label style={{ display: "grid", gap: 6, fontSize: 13, fontWeight: 700 }}>{label}{children}</label>;
}

function ModalForm({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return <div style={{ position: "fixed", inset: 0, zIndex: 1200, background: "rgba(8,24,48,.65)", display: "grid", placeItems: "center", padding: 18 }}>
    <div style={{ width: "min(1040px,96vw)", maxHeight: "94vh", overflow: "auto", background: "#f5f8fc", borderRadius: 16 }}>
      <header style={{ position: "sticky", top: 0, zIndex: 2, display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 18px", background: "white", borderBottom: "1px solid #dce5ef" }}>
        <h2 style={{ margin: 0 }}>{title}</h2><button type="button" onClick={onClose} style={{ border: 0, background: "#eef3f8", borderRadius: 8, padding: 8 }}><X size={18}/></button>
      </header>{children}
    </div>
  </div>;
}

export type SafetyFormPayload = { data: Record<string, unknown>; files: File[] };

export function KtaTtaPopup({ tipe, projectName, vendorName, onSubmit, submitting }: { tipe: "KTA" | "TTA"; projectName: string; vendorName: string; onSubmit: (payload: SafetyFormPayload) => Promise<void>; submitting: boolean }) {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<Record<string, string>>({ jenis: tipe, proyek: projectName, vendor: vendorName, statusTindakan: "Belum dilakukan", statusTindakLanjut: "Open" });
  const [files, setFiles] = useState<File[]>([]);
  const kategori = Object.keys(KATALOG[tipe]);
  const temuan = data.kategori ? [...KATALOG[tipe][data.kategori as keyof typeof KATALOG[typeof tipe]]] : [];
  const set = (key: string, value: string) => setData((current) => ({ ...current, [key]: value }));
  async function submit(e: React.FormEvent) { e.preventDefault(); await onSubmit({ data, files }); setOpen(false); }
  return <>
    <button type="button" onClick={() => setOpen(true)} style={{ display: "inline-flex", gap: 7, alignItems: "center", padding: "11px 15px", border: 0, borderRadius: 9, background: "#0868f6", color: "white", fontWeight: 800 }}><Plus size={17}/> Tambah {tipe}</button>
    {open && <ModalForm title={`Form Observasi ${tipe}`} onClose={() => setOpen(false)}><form onSubmit={submit} style={{ display: "grid", gap: 13, padding: 16 }}>
      <section style={sectionStyle}><h3>A. Informasi Observasi</h3><div style={gridStyle}>
        <Field label="Tanggal dan waktu"><input style={inputStyle} type="datetime-local" required value={data.tanggalWaktu ?? ""} onChange={e=>set("tanggalWaktu",e.target.value)}/></Field>
        <Field label="Proyek"><input style={inputStyle} value={projectName} readOnly/></Field><Field label="Kontraktor / Vendor"><input style={inputStyle} value={vendorName} readOnly/></Field>
        <Field label="Nama Pelapor"><input style={inputStyle} required value={data.pelapor ?? ""} onChange={e=>set("pelapor",e.target.value)}/></Field><Field label="Gedung / Area"><input style={inputStyle} required value={data.area ?? ""} onChange={e=>set("area",e.target.value)}/></Field><Field label="Lokasi detail"><input style={inputStyle} required value={data.lokasi ?? ""} onChange={e=>set("lokasi",e.target.value)}/></Field>
      </div></section>
      <section style={sectionStyle}><h3>B. Klasifikasi Temuan</h3><div style={gridStyle}>
        <Field label="Tingkat risiko awal"><select style={inputStyle} required value={data.risiko ?? ""} onChange={e=>set("risiko",e.target.value)}><option value="">Pilih</option><option>Rendah</option><option>Sedang</option><option>Tinggi</option><option>Kritis</option></select></Field>
        <Field label="Kategori temuan"><select style={inputStyle} required value={data.kategori ?? ""} onChange={e=>{set("kategori",e.target.value);set("temuan","")}}><option value="">Pilih</option>{kategori.map(x=><option key={x}>{x}</option>)}</select></Field>
        <Field label="Subkategori / temuan"><select style={inputStyle} required value={data.temuan ?? ""} onChange={e=>set("temuan",e.target.value)}><option value="">Pilih</option>{temuan.map(x=><option key={x}>{x}</option>)}</select></Field>
        <Field label="Potensi akibat / bahaya"><input style={inputStyle} required value={data.bahaya ?? ""} onChange={e=>set("bahaya",e.target.value)}/></Field>
      </div><Field label="Uraian kondisi atau tindakan"><textarea style={inputStyle} required value={data.uraian ?? ""} onChange={e=>set("uraian",e.target.value)}/></Field></section>
      <section style={sectionStyle}><h3>C. Tindakan Langsung</h3><div style={gridStyle}><Field label="Tindakan pengamanan awal"><input style={inputStyle} value={data.tindakanAwal ?? ""} onChange={e=>set("tindakanAwal",e.target.value)}/></Field><Field label="Status tindakan langsung"><select style={inputStyle} value={data.statusTindakan} onChange={e=>set("statusTindakan",e.target.value)}><option>Belum dilakukan</option><option>Dalam proses</option><option>Sudah dilakukan</option></select></Field></div><Field label="Uraian tindakan langsung"><textarea style={inputStyle} value={data.uraianTindakan ?? ""} onChange={e=>set("uraianTindakan",e.target.value)}/></Field></section>
      <section style={sectionStyle}><h3>D. Tindak Lanjut Temuan</h3><div style={gridStyle}><Field label="PIC tindak lanjut"><input style={inputStyle} value={data.pic ?? ""} onChange={e=>set("pic",e.target.value)}/></Field><Field label="Target penyelesaian"><input style={inputStyle} type="date" value={data.target ?? ""} onChange={e=>set("target",e.target.value)}/></Field><Field label="Status tindak lanjut"><select style={inputStyle} value={data.statusTindakLanjut} onChange={e=>set("statusTindakLanjut",e.target.value)}><option>Open</option><option>On Progress</option><option>Menunggu Verifikasi</option><option>Closed</option></select></Field><Field label="Rencana tindakan perbaikan"><input style={inputStyle} value={data.rencana ?? ""} onChange={e=>set("rencana",e.target.value)}/></Field></div></section>
      <section style={sectionStyle}><h3>E. Dokumentasi</h3><Field label="Foto temuan dan foto perbaikan"><input style={inputStyle} type="file" multiple accept="image/*" onChange={e=>setFiles(Array.from(e.target.files ?? []))}/></Field></section>
      <section style={sectionStyle}><h3>F. Verifikasi & Penutupan</h3><div style={gridStyle}><Field label="Nama verifikator"><input style={inputStyle} value={data.verifikator ?? ""} onChange={e=>set("verifikator",e.target.value)}/></Field><Field label="Keputusan verifikasi"><select style={inputStyle} value={data.keputusan ?? ""} onChange={e=>set("keputusan",e.target.value)}><option value="">Belum diverifikasi</option><option>Reject dengan Catatan</option><option>Approve dengan Catatan</option><option>Approve Langsung</option></select></Field></div><Field label="Catatan verifikator"><textarea style={inputStyle} value={data.catatanVerifikasi ?? ""} onChange={e=>set("catatanVerifikasi",e.target.value)}/></Field></section>
      <button disabled={submitting} style={{ padding: 12, border: 0, borderRadius: 9, background: "#0868f6", color: "white", fontWeight: 800 }}>{submitting ? "Menyimpan..." : "Simpan Form"}</button>
    </form></ModalForm>}
  </>;
}

const CHECKS = ["APD pekerja lengkap dan sesuai", "Peralatan kerja tersedia dan layak", "Material sesuai spesifikasi", "Shop drawing sudah disetujui", "JSA dan izin kerja tersedia", "Area kerja aman dan akses tidak terhalang", "Area kerja bersih dan rapi", "Sisa material dan limbah ditangani", "Pekerjaan sesuai shop drawing", "Material dan dimensi sesuai spesifikasi", "Metode pelaksanaan sesuai prosedur", "Hasil pekerjaan memenuhi kriteria"];

export function ConstructionChecklistPopup({ projectName, vendorName, owner, onSubmit, submitting }: { projectName: string; vendorName: string; owner: boolean; onSubmit: (payload: SafetyFormPayload & { nama: string }) => Promise<void>; submitting: boolean }) {
  const [open,setOpen]=useState(false); const [data,setData]=useState<Record<string,string>>({proyek:projectName,vendor:vendorName,kategori:"Struktur"}); const [hasil,setHasil]=useState<Record<string,string>>({}); const [file,setFile]=useState<File|null>(null);
  const set=(k:string,v:string)=>setData(c=>({...c,[k]:v})); const lengkap=useMemo(()=>CHECKS.every((_,i)=>hasil[String(i)]),[hasil]);
  async function submit(e:React.FormEvent){e.preventDefault();await onSubmit({nama:data.jenisPekerjaan,data:{...data,checklist:CHECKS.map((pertanyaan,i)=>({pertanyaan,hasil:hasil[String(i)]})),statusKesiapan:lengkap?"Siap Review":"Belum Lengkap"},files:file?[file]:[]});setOpen(false)}
  return <><button type="button" onClick={()=>setOpen(true)} style={{display:"inline-flex",gap:7,alignItems:"center",padding:"11px 15px",border:0,borderRadius:9,background:"#ef7100",color:"white",fontWeight:800}}><Plus size={17}/> Tambah Checklist</button>{open&&<ModalForm title="Construction Inspection Checklist" onClose={()=>setOpen(false)}><form onSubmit={submit} style={{display:"grid",gap:13,padding:16}}>
    <section style={sectionStyle}><h3>A. Informasi Umum Pekerjaan</h3><div style={gridStyle}><Field label="Nama Proyek"><input style={inputStyle} readOnly value={projectName}/></Field><Field label="Kontraktor / Vendor"><input style={inputStyle} readOnly value={vendorName}/></Field><Field label="Tanggal Inspeksi"><input style={inputStyle} type="date" required value={data.tanggal??""} onChange={e=>set("tanggal",e.target.value)}/></Field><Field label="Nomor Inspeksi"><input style={inputStyle} required value={data.nomorInspeksi??""} onChange={e=>set("nomorInspeksi",e.target.value)}/></Field><Field label="Kategori"><select style={inputStyle} value={data.kategori} onChange={e=>set("kategori",e.target.value)}><option>Arsitektur</option><option>Struktur</option><option>Elektrikal</option><option>Plumbing</option></select></Field><Field label="Jenis Pekerjaan"><input style={inputStyle} required value={data.jenisPekerjaan??""} onChange={e=>set("jenisPekerjaan",e.target.value)}/></Field><Field label="Gedung / Area"><input style={inputStyle} required value={data.area??""} onChange={e=>set("area",e.target.value)}/></Field><Field label="Lantai / Elevasi / Lokasi"><input style={inputStyle} required value={data.lokasi??""} onChange={e=>set("lokasi",e.target.value)}/></Field><Field label="Nomor Shop Drawing / Revisi"><input style={inputStyle} required value={data.shopDrawing??""} onChange={e=>set("shopDrawing",e.target.value)}/></Field><Field label="Jumlah Manpower"><input style={inputStyle} type="number" min="0" value={data.manpower??""} onChange={e=>set("manpower",e.target.value)}/></Field><Field label="Nama Pengawas Vendor"><input style={inputStyle} required value={data.pengawasVendor??""} onChange={e=>set("pengawasVendor",e.target.value)}/></Field><Field label="Peralatan kerja"><input style={inputStyle} value={data.peralatan??""} onChange={e=>set("peralatan",e.target.value)}/></Field></div></section>
    <section style={sectionStyle}><h3>B–E. Kesiapan, Keselamatan, Housekeeping, Izin & Checklist Teknis</h3>{CHECKS.map((q,i)=><Field key={q} label={`${i+1}. ${q}`}><select style={inputStyle} required value={hasil[String(i)]??""} onChange={e=>setHasil(c=>({...c,[String(i)]:e.target.value}))}><option value="">Pilih</option><option>OK</option><option>Tidak OK</option><option>N/A</option></select></Field>)}</section>
    <section style={sectionStyle}><h3>F. Dokumentasi dan Catatan</h3><Field label="Catatan / Temuan Lapangan"><textarea style={inputStyle} value={data.catatan??""} onChange={e=>set("catatan",e.target.value)}/></Field><Field label="Foto Dokumentasi"><input style={inputStyle} type="file" accept="image/*,.pdf" onChange={e=>setFile(e.target.files?.[0]??null)}/></Field></section>
    {owner&&<section style={sectionStyle}><h3>G. Review & Approval Inspector (Owner)</h3><div style={gridStyle}><Field label="Nama Inspector PPA"><input style={inputStyle} value={data.inspector??""} onChange={e=>set("inspector",e.target.value)}/></Field><Field label="Keputusan Inspector"><select style={inputStyle} value={data.keputusan??""} onChange={e=>set("keputusan",e.target.value)}><option value="">Belum diputuskan</option><option>Reject dengan Catatan</option><option>Approve dengan Catatan</option><option>Approve Langsung</option></select></Field></div><Field label="Catatan Inspector"><textarea style={inputStyle} value={data.catatanInspector??""} onChange={e=>set("catatanInspector",e.target.value)}/></Field></section>}
    <button disabled={submitting} style={{padding:12,border:0,borderRadius:9,background:"#ef7100",color:"white",fontWeight:800}}>{submitting?"Menyimpan...":"Simpan Checklist"}</button>
  </form></ModalForm>}</>;
}
