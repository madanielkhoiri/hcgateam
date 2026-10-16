'use client';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, ChevronRight, Edit3, Plus, Trash2, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { monitoringRkbApi, type BarangRkb, type MonitoringRkb, type MonitoringRkbInput, type ProjectRkb, type StatusRkb } from '@/lib/monitoring-rkb-api';
import styles from '../monitoring-rkb.module.css';

const labels:Record<StatusRkb,string>={WAITING_APPROVAL:'Waiting Approval',WAITING_SUPPLY:'Waiting Supply',CLOSE:'Close'};
const classes:Record<StatusRkb,string>={WAITING_APPROVAL:'waitingApproval',WAITING_SUPPLY:'waitingSupply',CLOSE:'close'};
const barangKosong=():BarangRkb=>({namaBarang:'',qty:1,satuan:''});

export default function DaftarRkbProject(){
 const {id}=useParams<{id:string}>(),projectId=Number(id);
 const [project,setProject]=useState<ProjectRkb|null>(null),[modal,setModal]=useState(false),[editId,setEditId]=useState<number|null>(null),[tanggal,setTanggal]=useState(new Date().toISOString().slice(0,10)),[nomor,setNomor]=useState(''),[status,setStatus]=useState<StatusRkb>('WAITING_APPROVAL'),[barang,setBarang]=useState<BarangRkb[]>([barangKosong()]),[error,setError]=useState('');
 const load=useCallback(async()=>{try{setProject(await monitoringRkbApi.detailProject(projectId));setError('')}catch(e){setError(e instanceof Error?e.message:'Project gagal dimuat')}},[projectId]);
 useEffect(()=>{void load()},[load]);
 function tambah(){setEditId(null);setTanggal(new Date().toISOString().slice(0,10));setNomor('');setStatus('WAITING_APPROVAL');setBarang([barangKosong()]);setModal(true)}
 function edit(r:MonitoringRkb){setEditId(r.id);setTanggal(r.tanggal.slice(0,10));setNomor(r.nomorRkb);setStatus(r.status);setBarang([]);setModal(true)}
 function ubahBarang(i:number,k:keyof BarangRkb,v:string){setBarang(rows=>rows.map((b,n)=>n===i?{...b,[k]:k==='qty'?Number(v):v}:b))}
 async function simpan(e:React.FormEvent){e.preventDefault();const d:MonitoringRkbInput={projectId,tanggal,nomorRkb:nomor,status,...(!editId?{barang}: {})};try{if(editId)await monitoringRkbApi.ubah(editId,d);else await monitoringRkbApi.buat(d);setModal(false);await load()}catch(e){setError(e instanceof Error?e.message:'RKB gagal disimpan')}}
 async function hapus(r:MonitoringRkb){if(!confirm(`Hapus RKB ${r.nomorRkb}?`))return;await monitoringRkbApi.hapus(r.id);await load()}
 return <main className={styles.page}>
  <Link className={styles.back} href="/ga/monitoring-rkb"><ArrowLeft size={16}/> Daftar Project</Link>
  <header className={styles.header}><div><h1>{project?.namaProject||'Project RKB'}</h1><p>Daftar RKB dipisahkan berdasarkan nomor.</p></div><button className={styles.primary} onClick={tambah}><Plus size={16}/> Tambah RKB</button></header>
  {error&&<div className={styles.error}>{error}</div>}
  <section className={styles.rkbGrid}>{project?.rkb.map(r=><article className={styles.rkbCard} key={r.id}><Link className={styles.cardLink} href={`/ga/monitoring-rkb/${projectId}/rkb/${r.id}`}><div className={styles.cardTop}><span className={`${styles.pill} ${styles[classes[r.status]]}`}>{labels[r.status]}</span></div><span className={styles.eyebrow}>{project.namaProject}</span><h2>{r.nomorRkb}</h2><p>{new Date(r.tanggal).toLocaleDateString('id-ID',{day:'2-digit',month:'long',year:'numeric'})}</p><div className={styles.cardMetric}><strong>{r.barang.length}</strong><span>Barang terdaftar</span><ChevronRight size={20}/></div></Link><div className={styles.cardActions}><button className={styles.iconButton} onClick={()=>edit(r)}><Edit3 size={15}/> Edit</button><button className={styles.danger} onClick={()=>void hapus(r)}><Trash2 size={15}/></button></div></article>)}</section>
  {project?.rkb.length===0&&<div className={styles.empty}>Belum ada nomor RKB pada project ini.</div>}
  {modal&&<div className={styles.overlay}><section className={editId?styles.modalSmall:styles.modal}><header className={styles.modalHeader}><h2>{editId?'Edit RKB':'Tambah RKB'}</h2><button className={styles.closeButton} onClick={()=>setModal(false)}><X size={18}/></button></header><form className={styles.form} onSubmit={simpan}><div className={styles.formGrid}><label className={styles.field}><span>Nomor RKB</span><input required value={nomor} onChange={e=>setNomor(e.target.value)}/></label><label className={styles.field}><span>Tanggal</span><input required type="date" value={tanggal} onChange={e=>setTanggal(e.target.value)}/></label><label className={styles.field}><span>Status</span><select value={status} onChange={e=>setStatus(e.target.value as StatusRkb)}>{Object.entries(labels).map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></label></div>{!editId&&<><div className={styles.itemsHeader}><h3>Daftar Barang ({barang.length})</h3><button type="button" className={styles.secondary} onClick={()=>setBarang(v=>[...v,barangKosong()])}><Plus size={14}/> Tambah Barang</button></div>{barang.map((b,i)=><div className={styles.itemRow} key={i}><input required placeholder="Nama barang" value={b.namaBarang} onChange={e=>ubahBarang(i,'namaBarang',e.target.value)}/><input required type="number" min="0.01" step="any" placeholder="QTY" value={b.qty} onChange={e=>ubahBarang(i,'qty',e.target.value)}/><input required placeholder="Satuan" value={b.satuan} onChange={e=>ubahBarang(i,'satuan',e.target.value)}/><button type="button" className={styles.remove} disabled={barang.length===1} onClick={()=>setBarang(v=>v.filter((_,n)=>n!==i))}><Trash2 size={15}/></button></div>)}</>}<footer className={styles.footer}><button type="button" className={styles.secondary} onClick={()=>setModal(false)}>Batal</button><button className={styles.primary}>Simpan RKB</button></footer></form></section></div>}
 </main>
}
