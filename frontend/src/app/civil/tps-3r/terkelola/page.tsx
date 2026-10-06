'use client';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Modal } from '@/components/civil-project/modal';
import { tps3rApi, type LaporanTps3rInput, type SampahTerkelolaTps3r } from '@/lib/tps3r-api';
import styles from '../../project/tender/tender.module.css';
import formStyles from '../tps3r-form.module.css';

const kosong = (): LaporanTps3rInput => ({ tanggal:new Date().toISOString().slice(0,10), beratOrganik:0, beratReuse:0, beratRecycle:0, beratResidu:0 });
const formatTanggal = (v:string) => new Intl.DateTimeFormat('id-ID',{day:'2-digit',month:'long',year:'numeric'}).format(new Date(v));
const kategori = [
  { label:'Organik', key:'beratOrganik', color:'#07984c' },
  { label:'Daur Ulang', key:'beratRecycle', color:'#ef2b22' },
  { label:'Guna Ulang', key:'beratReuse', color:'#d4bf00' },
  { label:'Residu', key:'beratResidu', color:'#7f8b9c' },
] as const;

export default function Page(){
  const [data,setData]=useState<SampahTerkelolaTps3r[]>([]);
  const [form,setForm]=useState<LaporanTps3rInput>(kosong());
  const [edit,setEdit]=useState<number|null>(null);
  const [open,setOpen]=useState(false);
  const [error,setError]=useState('');
  const [saving,setSaving]=useState(false);
  const load=()=>tps3rApi.daftarTerkelola().then(setData).catch(e=>setError(e.message));
  useEffect(()=>{void load()},[]);
  const buka=(item?:SampahTerkelolaTps3r)=>{setEdit(item?.id??null);setForm(item?{tanggal:item.tanggal.slice(0,10),beratOrganik:item.beratOrganik,beratReuse:item.beratReuse,beratRecycle:item.beratRecycle,beratResidu:item.beratResidu}:kosong());setOpen(true)};
  const simpan=async()=>{setSaving(true);try{edit?await tps3rApi.ubahTerkelola(edit,form):await tps3rApi.buatTerkelola(form);setOpen(false);await load()}catch(e){setError(e instanceof Error?e.message:'Gagal menyimpan')}finally{setSaving(false)}};
  const hapus=async(id:number)=>{if(confirm('Hapus data sampah terkelola ini?')){await tps3rApi.hapusTerkelola(id);await load()}};
  return <div className={styles.page}>
    <div className={styles.headerRow}><div><h1>Sampah Terkelola</h1><p>Input terpisah untuk sampah terkelola per kategori.</p></div><button className={styles.primaryButton} onClick={()=>buka()}><Plus size={16}/>Tambah Data</button></div>
    {error&&<p className={styles.errorText}>{error}</p>}
    <div className={styles.tableWrap}><table className={styles.table}><thead><tr><th>Tanggal</th><th>Organik</th><th>Daur Ulang</th><th>Guna Ulang</th><th>Residu</th><th>Aksi</th></tr></thead><tbody>{data.map(x=><tr key={x.id}><td>{formatTanggal(x.tanggal)}</td><td>{x.beratOrganik} kg</td><td>{x.beratRecycle} kg</td><td>{x.beratReuse} kg</td><td>{x.beratResidu} kg</td><td><div className={formStyles.actions}><button className={styles.iconButton} onClick={()=>buka(x)} title="Ubah"><Pencil size={14}/></button><button className={styles.iconButtonDanger} onClick={()=>hapus(x.id)} title="Hapus"><Trash2 size={14}/></button></div></td></tr>)}</tbody></table>{!data.length&&<div className={formStyles.empty}>Belum ada data sampah terkelola.</div>}</div>
    {open&&<Modal title={edit?'Ubah Sampah Terkelola':'Tambah Sampah Terkelola'} onClose={()=>setOpen(false)}><div className={formStyles.modalBody}><label className={`${formStyles.field} ${formStyles.full}`}>Tanggal Penyerahan<input className={formStyles.input} type="date" value={form.tanggal} onChange={e=>setForm({...form,tanggal:e.target.value})}/></label><div className={formStyles.grid}>{kategori.map(x=><label className={formStyles.field} key={x.key}><span><i style={{background:x.color}}/>{x.label} <small>(kg)</small></span><input className={formStyles.input} type="number" min="0" step="0.01" value={form[x.key]} onChange={e=>setForm({...form,[x.key]:Number(e.target.value)})}/></label>)}</div><div className={formStyles.footer}><button className={styles.secondaryButton} onClick={()=>setOpen(false)}>Batal</button><button className={styles.primaryButton} disabled={saving} onClick={simpan}>{saving?'Menyimpan...':'Simpan Data'}</button></div></div></Modal>}
  </div>;
}
