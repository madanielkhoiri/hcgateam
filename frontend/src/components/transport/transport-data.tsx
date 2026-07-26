"use client";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { Fuel, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import styles from "./transport.module.css";
const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";
const getToken = () =>
  localStorage.getItem("hcga_access_token") ||
  sessionStorage.getItem("hcga_access_token") ||
  localStorage.getItem("access_token") ||
  sessionStorage.getItem("access_token") ||
  "";
type Row={id:number;unitNumber:string;department:string;vehicleType:string;fuelDate:string;hmStart:string;hmEnd:string;totalHm:string;hmPerShift:string;kmPerLiter:string;totalLiter:string;lostTimeBd:string;targetUa:string;actualUa:string;uaPercentage:string;unitStatus:string;achievement:string;creator?:{name:string}};
const blank={unitNumber:"",department:"",vehicleType:"LV",fuelDate:new Date().toISOString().slice(0,10),hmStart:"",hmEnd:"",totalLiter:"",lostTimeBd:"0",unitStatus:"READY"};
export default function TransportData(){const [rows,setRows]=useState<Row[]>([]);const [search,setSearch]=useState("");const [month,setMonth]=useState("");const [year,setYear]=useState("");const [modal,setModal]=useState(false);const [edit,setEdit]=useState<Row|null>(null);const [form,setForm]=useState(blank);const [error,setError]=useState("");
const load = async () => {
  try {
    setError("");
    const token = getToken();
    if (!token) {
      setRows([]);
      setError("Sesi login tidak ditemukan. Silakan login ulang.");
      return;
    }

    const response = await fetch(`${API}/transport`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const body = await response.json().catch(() => null);

    if (!response.ok) {
      setRows([]);
      setError(
        Array.isArray(body?.message)
          ? body.message.join(", ")
          : body?.message || "Data transportasi gagal dimuat",
      );
      return;
    }

    setRows(Array.isArray(body) ? body : []);
  } catch {
    setRows([]);
    setError("Backend transportasi tidak dapat dihubungi.");
  }
};

useEffect(() => {
  void load();
}, []);
const filtered=useMemo(()=>rows.filter(r=>{const d=new Date(r.fuelDate);return(!search||`${r.unitNumber} ${r.department}`.toLowerCase().includes(search.toLowerCase()))&&(!month||d.getMonth()+1===+month)&&(!year||d.getFullYear()===+year)}),[rows,search,month,year]);
function open(row?:Row){setError("");setEdit(row??null);setForm(row?{unitNumber:row.unitNumber,department:row.department,vehicleType:row.vehicleType,fuelDate:row.fuelDate.slice(0,10),hmStart:String(row.hmStart),hmEnd:String(row.hmEnd),totalLiter:String(row.totalLiter),lostTimeBd:String(row.lostTimeBd),unitStatus:row.unitStatus}:blank);setModal(true)}
async function submit(e:FormEvent){e.preventDefault();setError("");const res=await fetch(`${API}/transport${edit?`/${edit.id}`:""}`,{method:edit?"PATCH":"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${getToken()}`},body:JSON.stringify({...form,hmStart:+form.hmStart,hmEnd:+form.hmEnd,totalLiter:+form.totalLiter,lostTimeBd:+form.lostTimeBd})});if(!res.ok){const b=await res.json().catch(()=>null);setError(Array.isArray(b?.message)?b.message.join(", "):b?.message||"Data gagal disimpan");return}setModal(false);load()}
async function remove(id:number){if(!confirm("Hapus data transportasi ini?"))return;await fetch(`${API}/transport/${id}`,{method:"DELETE",headers:{Authorization:`Bearer ${getToken()}`}});load()}
return <section><div className={styles.hero}><div><span className={styles.heroIcon}><Fuel/></span><div><h1>Data Transportasi</h1><p>Kelola HM, pemakaian fuel, availability, dan status setiap unit.</p></div></div><button className={styles.primary} onClick={()=>open()}><Plus/>Tambah Transportasi</button></div>
<div className={styles.filterPanel}><label><Search/><input placeholder="Cari no lambung atau departemen..." value={search} onChange={e=>setSearch(e.target.value)}/></label><select value={month} onChange={e=>setMonth(e.target.value)}><option value="">Semua Bulan</option>{Array.from({length:12},(_,i)=><option value={i+1} key={i}>{new Date(2026,i).toLocaleString("id-ID",{month:"long"})}</option>)}</select><select value={year} onChange={e=>setYear(e.target.value)}><option value="">Semua Tahun</option>{[2025,2026,2027,2028].map(y=><option key={y}>{y}</option>)}</select><button onClick={()=>{setSearch("");setMonth("");setYear("")}}>Reset</button></div>
{error && !modal && <p className={styles.pageError}>{error}</p>}<div className={styles.tablePanel}><div className={styles.tableTitle}><h3>Daftar Transportasi</h3><span>Total {filtered.length} data</span></div><div className={styles.tableScroll}><table><thead><tr><th>No</th><th>Tanggal</th><th>No Lambung</th><th>Jenis</th><th>Departemen</th><th>HM Awal</th><th>HM Akhir</th><th>Total HM</th><th>Liter</th><th>KM/L</th><th>UA</th><th>Status</th><th>Dibuat Oleh</th><th>Aksi</th></tr></thead><tbody>{filtered.map((r,i)=><tr key={r.id}><td>{i+1}</td><td>{new Date(r.fuelDate).toLocaleDateString("id-ID")}</td><td><b>{r.unitNumber}</b></td><td>{r.vehicleType}</td><td>{r.department}</td><td>{Number(r.hmStart).toLocaleString("id-ID")}</td><td>{Number(r.hmEnd).toLocaleString("id-ID")}</td><td>{Number(r.totalHm).toLocaleString("id-ID")}</td><td>{Number(r.totalLiter).toLocaleString("id-ID")}</td><td>{Number(r.kmPerLiter).toFixed(2)}</td><td>{Number(r.uaPercentage).toFixed(2)}%</td><td><span className={r.unitStatus==="READY"?styles.ready:styles.breakdown}>{r.unitStatus}</span></td><td>{r.creator?.name??"-"}</td><td><div className={styles.actions}><button onClick={()=>open(r)}><Pencil/></button><button onClick={()=>remove(r.id)}><Trash2/></button></div></td></tr>)}{!filtered.length&&<tr><td colSpan={14} className={styles.empty}>Belum ada data transportasi.</td></tr>}</tbody></table></div></div>
{modal&&<div className={styles.modalBack}><form className={styles.modal} onSubmit={submit}><header><div><h2>{edit?"Edit":"Tambah"} Transportasi</h2><p>Perhitungan HM, KM/Liter, dan UA diproses otomatis.</p></div><button type="button" onClick={()=>setModal(false)}><X/></button></header><div className={styles.formGrid}>{[["No Lambung","unitNumber","text"],["Departemen","department","text"],["Tanggal","fuelDate","date"],["HM Awal","hmStart","number"],["HM Akhir","hmEnd","number"],["Total Liter","totalLiter","number"],["Lost Time BD","lostTimeBd","number"]].map(([label,key,type])=><label key={key}>{label}<input required={!["lostTimeBd"].includes(key)} type={type} step={type==="number"?"0.01":undefined} min={type==="number"?0:undefined} value={(form as any)[key]} onChange={e=>setForm({...form,[key]:e.target.value})}/></label>)}<label>Jenis Sarana<select value={form.vehicleType} onChange={e=>setForm({...form,vehicleType:e.target.value})}><option>LV</option><option>BUS</option></select></label><label>Status Unit<select value={form.unitStatus} onChange={e=>setForm({...form,unitStatus:e.target.value})}><option>READY</option><option>BREAKDOWN</option></select></label></div>{error&&<p className={styles.error}>{error}</p>}<footer><button type="button" onClick={()=>setModal(false)}>Batal</button><button className={styles.primary}>Simpan</button></footer></form></div>}</section>}
