"use client";

import { Plus, Trash2, X } from "lucide-react";
import { useState } from "react";
import { epromApi } from "@/lib/eprom-api";
import styles from "./eprom-structured-report.module.css";

const ITEMS = [
  ["Housekeeping", "Area kerja bersih dari sampah dan material berserakan"], ["Housekeeping", "Material dan peralatan tersusun rapi dan aman"], ["Housekeeping", "Tempat sampah tersedia, memadai dan tidak meluap"],
  ["Akses & Jalur", "Jalur pejalan kaki / evakuasi bebas hambatan"], ["Akses & Jalur", "Jalur kendaraan dan area manuver aman"], ["Akses & Jalur", "Rambu dan pembatas area berbahaya tersedia"],
  ["Pencahayaan", "Pencahayaan area kerja mencukupi"], ["Ventilasi & Udara", "Ventilasi / sirkulasi udara memadai"], ["Ventilasi & Udara", "Debu, asap dan emisi dikendalikan"],
  ["Kebisingan", "Paparan kebisingan dikendalikan"], ["Drainase", "Drainase lancar, tidak ada genangan berbahaya"], ["Air & Sanitasi", "Air bersih dan fasilitas cuci tangan tersedia"],
  ["Air & Sanitasi", "Toilet / fasilitas sanitasi bersih dan layak"], ["Limbah", "Limbah domestik dipilah dan dikelola"], ["Limbah", "Limbah B3 disimpan dan diberi label sesuai ketentuan"],
  ["Bahan Kimia", "Bahan kimia disimpan aman, label dan SDS tersedia"], ["Tumpahan", "Tidak ada tumpahan oli / BBM / bahan kimia"], ["Cuaca & Panas", "Pengendalian panas, hujan, petir dan cuaca ekstrem memadai"],
  ["Vegetasi & Lingkungan", "Tidak ada gangguan lingkungan / erosi / pencemaran terlihat"], ["Fasilitas Darurat", "APAR, P3K dan akses darurat tidak terhalang"],
];

const today = () => new Date().toISOString().slice(0, 10);
const CUACA = ["Cerah", "Berawan", "Hujan", "-"];
const DAILY_TEAMS = ["Tim Sipil", "Tim Baja", "Tim MEP", "Tim Arsitektur"];

function DailyReportFormContent({ projectId, disabled, onSaved }: { projectId: number; disabled: boolean; onSaved: () => void }) {
  const [data, setData] = useState<any>({ tanggal: today(), waktuMulai: "08:00", waktuSelesai: "17:00", lokasi: "", hariKerjaKe: "", cuacaPagi: "Cerah", cuacaSiang: "Cerah", cuacaSore: "Cerah", cuacaMalam: "-", staff: [{ jabatan: "PJO", nama: "" }, { jabatan: "Site Engineer", nama: "" }, { jabatan: "Supervisor Sipil", nama: "" }, { jabatan: "Supervisor MEP", nama: "" }, { jabatan: "SHE", nama: "" }, { jabatan: "QS", nama: "" }, { jabatan: "Drafter", nama: "" }, { jabatan: "Surveyor", nama: "" }], dokumentasi: DAILY_TEAMS.map(tim => ({ tim, pekerjaan: "", file: null })) });
  const [saving, setSaving] = useState(false); const [error, setError] = useState("");
  const field = (key: string, value: string) => setData((v: any) => ({ ...v, [key]: value }));
  async function submit(e: React.FormEvent) { e.preventDefault(); setSaving(true); setError(""); try { const files = data.dokumentasi.map((d: any) => d.file).filter(Boolean); if (files.length !== data.dokumentasi.length) throw new Error("Setiap dokumentasi wajib memiliki foto"); if (!DAILY_TEAMS.every(tim => data.dokumentasi.some((d: any) => d.tim === tim))) throw new Error("Dokumentasi Tim Sipil, Tim Baja, Tim MEP, dan Tim Arsitektur wajib tersedia"); await epromApi.progress.buatForm("progress-harian", projectId, { ...data, dokumentasi: data.dokumentasi.map(({ file, ...d }: any) => d) }, files); onSaved(); } catch (err) { setError(err instanceof Error ? err.message : "Gagal menyimpan Daily Report"); } finally { setSaving(false); } }
  return <form className={styles.form} onSubmit={submit}>
    <div className={styles.notice}>Nama kontraktor diisi otomatis dari Vendor project.</div>
    <div className={styles.grid}>{[["tanggal","Tanggal","date"],["waktuMulai","Mulai","time"],["waktuSelesai","Selesai","time"],["lokasi","Lokasi","text"],["hariKerjaKe","Hari Kerja Ke","number"]].map(([k,l,t]) => <label key={k}>{l}<input type={t} value={data[k]} onChange={e=>field(k,e.target.value)} required /></label>)}</div>
    <h3>Cuaca</h3><div className={styles.grid}>{["Pagi","Siang","Sore","Malam"].map(x=><label key={x}>{x}<select value={data[`cuaca${x}`]} onChange={e=>field(`cuaca${x}`,e.target.value)}>{CUACA.map(c=><option key={c}>{c}</option>)}</select></label>)}</div>
    <h3>Tim Staff Proyek</h3><div className={styles.staffGrid}>{data.staff.map((s:any,i:number)=><label key={s.jabatan}>{s.jabatan}<input value={s.nama} onChange={e=>setData((v:any)=>({...v,staff:v.staff.map((r:any,j:number)=>j===i?{...r,nama:e.target.value}:r)}))}/></label>)}</div>
    <h3>Dokumentasi per Tim</h3>
    <div className={styles.docs}>{DAILY_TEAMS.map(tim => {
      const entries = data.dokumentasi.map((d:any, index:number) => ({ d, index })).filter(({ d }:any) => d.tim === tim);
      return <section key={tim}>
        <div className={styles.titleRow}><h3>{tim} ({entries.length}/10)</h3><button type="button" disabled={entries.length >= 10} onClick={()=>setData((v:any)=>({...v,dokumentasi:[...v.dokumentasi,{tim,pekerjaan:"",file:null}]}))}><Plus size={14}/> Tambah Foto {tim}</button></div>
        {entries.map(({ d, index }:any, position:number)=><div className={styles.doc} key={index}>
          <strong>Foto {position + 1}</strong>
          <input value={d.pekerjaan} placeholder="Uraian pekerjaan" onChange={e=>setData((v:any)=>({...v,dokumentasi:v.dokumentasi.map((r:any,j:number)=>j===index?{...r,pekerjaan:e.target.value}:r)}))} required/>
          <input type="file" accept="image/*" onChange={e=>setData((v:any)=>({...v,dokumentasi:v.dokumentasi.map((r:any,j:number)=>j===index?{...r,file:e.target.files?.[0]??null}:r)}))} required/>
          <button type="button" aria-label={`Hapus foto ${tim}`} onClick={()=>setData((v:any)=>({...v,dokumentasi:v.dokumentasi.filter((_:any,j:number)=>j!==index)}))} disabled={entries.length<=1}><Trash2 size={14}/></button>
        </div>)}
      </section>;
    })}</div>
    {error&&<p className={styles.error}>{error}</p>}<button className={styles.submit} disabled={disabled||saving}>{saving?"Membuat PDF...":"Simpan Daily Report & PDF"}</button>
  </form>;
}

function InspectionFormContent({ projectId, disabled, onSaved }: { projectId: number; disabled: boolean; onSaved: () => void }) {
  const [data,setData]=useState<any>({tanggal:today(),inspektor:"",pic:"",shiftJam:"",checklist:ITEMS.map(()=>({hasil:"N/A",temuan:"",risiko:""})),temuan:[],kesimpulan:""}); const [saving,setSaving]=useState(false); const [error,setError]=useState("");
  const setCheck=(i:number,k:string,v:string)=>setData((d:any)=>({...d,checklist:d.checklist.map((r:any,j:number)=>j===i?{...r,[k]:v,...(k==="hasil"?{risiko:v==="Tidak Baik"?(r.risiko||"Rendah"):""}:{})}:r)}));
  async function submit(e:React.FormEvent){e.preventDefault();setSaving(true);setError("");try{await epromApi.progress.buatForm("inspeksi-area",projectId,data);onSaved();}catch(err){setError(err instanceof Error?err.message:"Gagal menyimpan inspeksi");}finally{setSaving(false)}}
  return <form className={styles.form} onSubmit={submit}><div className={styles.notice}>Proyek dan nama Vendor diisi otomatis.</div><div className={styles.grid}><label>Tanggal<input type="date" value={data.tanggal} onChange={e=>setData({...data,tanggal:e.target.value})} required/></label><label>Inspektor<input value={data.inspektor} onChange={e=>setData({...data,inspektor:e.target.value})} required/></label><label>Pendamping / PIC<input value={data.pic} onChange={e=>setData({...data,pic:e.target.value})} required/></label><label>Shift / Jam<input value={data.shiftJam} onChange={e=>setData({...data,shiftJam:e.target.value})} required/></label></div>
  <div className={styles.tableWrap}><table><thead><tr><th>No</th><th>Kategori</th><th>Item Pemeriksaan</th><th>Hasil</th><th>Temuan / Keterangan</th><th>Risiko</th></tr></thead><tbody>{ITEMS.map((it,i)=><tr key={i}><td>{i+1}</td><td>{it[0]}</td><td>{it[1]}</td><td><select value={data.checklist[i].hasil} onChange={e=>setCheck(i,"hasil",e.target.value)}><option>Baik</option><option>Tidak Baik</option><option>N/A</option></select></td><td><input value={data.checklist[i].temuan} onChange={e=>setCheck(i,"temuan",e.target.value)}/></td><td><select value={data.checklist[i].risiko} onChange={e=>setCheck(i,"risiko",e.target.value)} disabled={data.checklist[i].hasil!=="Tidak Baik"}><option value="">-</option><option>Rendah</option><option>Sedang</option><option>Tinggi</option></select></td></tr>)}</tbody></table></div>
  <div className={styles.titleRow}><h3>Tindak Lanjut Temuan</h3><button type="button" onClick={()=>setData((d:any)=>({...d,temuan:[...d.temuan,{referensi:"",uraian:"",risiko:"Rendah",tindakan:"",pic:"",target:"",status:"Open"}]}))}><Plus size={14}/> Tambah Temuan</button></div>{data.temuan.map((t:any,i:number)=><div className={styles.finding} key={i}><b>{i+1}</b>{Object.entries(t).map(([k,v])=>k==="risiko"?<select key={k} value={String(v)} onChange={e=>setData((d:any)=>({...d,temuan:d.temuan.map((r:any,j:number)=>j===i?{...r,[k]:e.target.value}:r)}))}><option>Rendah</option><option>Sedang</option><option>Tinggi</option></select>:<input key={k} type={k==="target"?"date":"text"} value={String(v)} placeholder={k} onChange={e=>setData((d:any)=>({...d,temuan:d.temuan.map((r:any,j:number)=>j===i?{...r,[k]:e.target.value}:r)}))}/>)}</div>)}<label>Kesimpulan<textarea value={data.kesimpulan} onChange={e=>setData({...data,kesimpulan:e.target.value})}/></label>{error&&<p className={styles.error}>{error}</p>}<button className={styles.submit} disabled={disabled||saving}>{saving?"Membuat PDF...":"Simpan Inspeksi & PDF"}</button></form>;
}

function P5mReportFormContent({ projectId, disabled, onSaved }: { projectId: number; disabled: boolean; onSaved: () => void }) {
  const [data,setData]=useState<any>({activityDate:today(),location:"",speaker:"",supervisor:"",participants:"",topic:""});
  const [files,setFiles]=useState<File[]>([]); const [saving,setSaving]=useState(false); const [error,setError]=useState("");
  async function submit(e:React.FormEvent){e.preventDefault();setSaving(true);setError("");try{await epromApi.safetyMeeting.buatP5mForm(projectId,data,files);setFiles([]);onSaved();}catch(err){setError(err instanceof Error?err.message:"Gagal menyimpan P5M");}finally{setSaving(false)}}
  return <form className={styles.form} onSubmit={submit}><div className={styles.notice}>Format mengikuti P5M Administrasi. Nama kontraktor otomatis dari Vendor project; Pengawas diketik manual.</div><div className={styles.grid}><label>Tanggal<input type="date" value={data.activityDate} onChange={e=>setData({...data,activityDate:e.target.value})} required/></label><label>Lokasi<input value={data.location} onChange={e=>setData({...data,location:e.target.value})} required/></label><label>Pemateri<input value={data.speaker} onChange={e=>setData({...data,speaker:e.target.value})} required/></label><label>Pengawas<input value={data.supervisor} onChange={e=>setData({...data,supervisor:e.target.value})} placeholder="Ketik nama pengawas" required/></label></div><label>Peserta<textarea rows={3} value={data.participants} onChange={e=>setData({...data,participants:e.target.value})} required/></label><label>Materi<textarea rows={5} value={data.topic} onChange={e=>setData({...data,topic:e.target.value})} required/></label><label>Dokumentasi (maksimal 4 foto)<input type="file" accept="image/*" multiple onChange={e=>setFiles(Array.from(e.target.files??[]).slice(0,4))}/>{files.length} foto dipilih</label>{error&&<p className={styles.error}>{error}</p>}<button className={styles.submit} disabled={disabled||saving}>{saving?"Membuat PDF...":"Simpan P5M & PDF"}</button></form>;
}

function ReportModal({ title, buttonLabel, disabled, children }: { title: string; buttonLabel: string; disabled: boolean; children: (close: () => void) => React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return <>
    <button type="button" className={styles.openModal} disabled={disabled} onClick={() => setOpen(true)}><Plus size={16}/> {buttonLabel}</button>
    {open && <div className={styles.modalBackdrop} role="presentation" onMouseDown={() => setOpen(false)}>
      <section className={styles.modal} role="dialog" aria-modal="true" aria-label={title} onMouseDown={e => e.stopPropagation()}>
        <header className={styles.modalHeader}><h2>{title}</h2><button type="button" onClick={() => setOpen(false)} aria-label="Tutup"><X size={20}/></button></header>
        <div className={styles.modalBody}>{children(() => setOpen(false))}</div>
      </section>
    </div>}
  </>;
}

type ReportProps = { projectId: number; disabled: boolean; onSaved: () => void };

export function DailyReportForm(props: ReportProps) {
  return <ReportModal title="Buat Daily Report" buttonLabel="Buat Daily Report" disabled={props.disabled}>{close => <DailyReportFormContent {...props} onSaved={() => { props.onSaved(); close(); }}/>}</ReportModal>;
}

export function InspectionForm(props: ReportProps) {
  return <ReportModal title="Buat Inspeksi Area Pekerjaan" buttonLabel="Buat Inspeksi Area" disabled={props.disabled}>{close => <InspectionFormContent {...props} onSaved={() => { props.onSaved(); close(); }}/>}</ReportModal>;
}

export function P5mReportForm(props: ReportProps) {
  return <ReportModal title="Buat Laporan P5M" buttonLabel="Buat Laporan P5M" disabled={props.disabled}>{close => <P5mReportFormContent {...props} onSaved={() => { props.onSaved(); close(); }}/>}</ReportModal>;
}
