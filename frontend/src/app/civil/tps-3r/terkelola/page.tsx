'use client';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Modal } from '@/components/civil-project/modal';
import { tps3rApi, type LaporanTps3rInput, type SampahTerkelolaTps3r } from '@/lib/tps3r-api';
import styles from '../../project/tender/tender.module.css';

const kosong = (): LaporanTps3rInput => ({ tanggal: new Date().toISOString().slice(0,10), beratOrganik:0, beratReuse:0, beratRecycle:0, beratResidu:0 });
const tanggal = (v:string) => new Intl.DateTimeFormat('id-ID',{day:'2-digit',month:'long',year:'numeric'}).format(new Date(v));
export default function Page(){
 const [data,setData]=useState<SampahTerkelolaTps3r[]>([]),[form,setForm]=useState(kosong()),[edit,setEdit]=useState<number|null>(null),[open,setOpen]=useState(false),[error,setError]=useState('');
 const load=()=>tps3rApi.daftarTerkelola().then(setData).catch(e=>setError(e.message)); useEffect(()=>{void load()},[]);
 const buka=(item?:SampahTerkelolaTps3r)=>{setEdit(item?.id??null);setForm(item?{tanggal:item.tanggal.slice(0,10),beratOrganik:item.beratOrganik,beratReuse:item.beratReuse,beratRecycle:item.beratRecycle,beratResidu:item.beratResidu}:kosong());setOpen(true)};
 const simpan=async()=>{try{edit?await tps3rApi.ubahTerkelola(edit,form):await tps3rApi.buatTerkelola(form);setOpen(false);load()}catch(e){setError(e instanceof Error?e.message:'Gagal menyimpan')}};
 const hapus=async(id:number)=>{if(confirm('Hapus data sampah terkelola ini?')){await tps3rApi.hapusTerkelola(id);load()}};
 return <div className={styles.page}><div className={styles.headerRow}><div><h1>Sampah Terkelola</h1><p>Input terpisah untuk sampah terkelola per kategori.</p></div><button className={styles.primaryButton} onClick={()=>buka()}><Plus size={16}/>Tambah Data</button></div>{error&&<p className={styles.errorText}>{error}</p>}<div className={styles.tableWrap}><table className={styles.table}><thead><tr><th>Tanggal</th><th>Organik</th><th>Daur Ulang</th><th>Guna Ulang</th><th>Residu</th><th>Aksi</th></tr></thead><tbody>{data.map(x=><tr key={x.id}><td>{tanggal(x.tanggal)}</td><td>{x.beratOrganik} kg</td><td>{x.beratRecycle} kg</td><td>{x.beratReuse} kg</td><td>{x.beratResidu} kg</td><td><button className={styles.iconButton} onClick={()=>buka(x)}><Pencil size={14}/></button> <button className={styles.iconButtonDanger} onClick={()=>hapus(x.id)}><Trash2 size={14}/></button></td></tr>)}</tbody></table></div>{open&&<Modal title={edit?'Ubah Sampah Terkelola':'Tambah Sampah Terkelola'} onClose={()=>setOpen(false)}><div style={{display:'grid',gap:12}}><label>Tanggal<input type="date" value={form.tanggal} onChange={e=>setForm({...form,tanggal:e.target.value})}/></label>{([['Organik','beratOrganik'],['Daur Ulang','beratRecycle'],['Guna Ulang','beratReuse'],['Residu','beratResidu']] as const).map(([l,k])=><label key={k}>{l} (kg)<input type="number" min="0" step="0.01" value={form[k]} onChange={e=>setForm({...form,[k]:Number(e.target.value)})}/></label>)}<button className={styles.primaryButton} onClick={simpan}>Simpan</button></div></Modal>}</div>
}
