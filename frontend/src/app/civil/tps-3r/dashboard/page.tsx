'use client';
import { useEffect, useState } from 'react';
import AnimatedLineChart from '@/components/dashboard-charts/animated-line-chart';
import MultiLineChart from '@/components/dashboard-charts/multi-line-chart';
import SimplePieChart from '@/components/dashboard-charts/simple-pie-chart';
import SimpleBarChart from '@/components/dashboard-charts/simple-bar-chart';
import PhotoCarousel from '@/components/tps3r/photo-carousel';
import { tps3rApi, type FotoPenyerahanTps3r, type RingkasanTps3r, type TrenBulananTps3r } from '@/lib/tps3r-api';
import styles from '../../project/tender/tender.module.css';

const BULAN = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
const BULAN_SINGKAT = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
const WARNA = { organik:'#07984c', recycle:'#ef2b22', reuse:'#e0cf16', residu:'#9ca3af' };
const selectStyle = { minWidth:120, padding:'9px 11px', border:'1px solid #d8e4f2', borderRadius:9, fontSize:12 };
const kg = (nilai:number) => `${nilai.toLocaleString('id-ID',{maximumFractionDigits:2})} kg`;
const bulat = (nilai:number) => Math.round(nilai * 100) / 100;

export default function Tps3rDashboardPage() {
  const sekarang = new Date();
  const [bulan,setBulan] = useState(sekarang.getMonth()+1);
  const [tahun,setTahun] = useState(sekarang.getFullYear());
  const [ringkasan,setRingkasan] = useState<RingkasanTps3r|null>(null);
  const [tren,setTren] = useState<TrenBulananTps3r[]>([]);
  const [foto,setFoto] = useState<FotoPenyerahanTps3r[]>([]);
  const [memuat,setMemuat] = useState(true);
  const [error,setError] = useState<string|null>(null);
  useEffect(()=>{setMemuat(true);setError(null);tps3rApi.ringkasan(bulan,tahun).then(setRingkasan).catch((e)=>setError(e instanceof Error?e.message:'Gagal memuat data')).finally(()=>setMemuat(false));},[bulan,tahun]);
  useEffect(()=>{tps3rApi.tren(tahun).then(setTren).catch(()=>setTren([]));},[tahun]);
  useEffect(()=>{tps3rApi.daftarFoto().then(setFoto).catch(()=>setFoto([]));},[]);
  const kategori = ringkasan ? [{label:'Organik',value:ringkasan.totalOrganik},{label:'Daur Ulang',value:ringkasan.totalRecycle},{label:'Guna Ulang',value:ringkasan.totalReuse},{label:'Residu',value:ringkasan.totalResidu}] : [];
  const pie = ringkasan ? [{label:'Organik',value:ringkasan.totalOrganik,color:WARNA.organik},{label:'Daur Ulang / Recycle',value:ringkasan.totalRecycle,color:WARNA.recycle},{label:'Guna Ulang / Reuse',value:ringkasan.totalReuse,color:WARNA.reuse},{label:'Residu',value:ringkasan.totalResidu,color:WARNA.residu}] : [];
  const totalTerkelola = ringkasan ? ringkasan.terkelolaOrganik + ringkasan.terkelolaRecycle + ringkasan.terkelolaReuse + ringkasan.terkelolaResidu : 0;
  return <div className={styles.page}>
    <div className={styles.headerRow}><div><h1>Dashboard TPS 3R</h1><p>Ringkasan timbangan sampah per kategori untuk periode terpilih.</p></div><div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
      <select value={bulan} onChange={(e)=>setBulan(Number(e.target.value))} style={selectStyle}>{BULAN.map((nama,i)=><option key={nama} value={i+1}>{nama}</option>)}</select>
      <select value={tahun} onChange={(e)=>setTahun(Number(e.target.value))} style={selectStyle}>{Array.from({length:5},(_,i)=>sekarang.getFullYear()-2+i).map((nilai)=><option key={nilai}>{nilai}</option>)}</select>
    </div></div>
    {error&&<p className={styles.errorText}>{error}</p>}
    {memuat||!ringkasan?<p className={styles.emptyText}>Memuat...</p>:<>
      <div className="dashboard-card-grid" style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))',gap:12}}>
        <Stat label="Organik" value={kg(ringkasan.totalOrganik)}/><Stat label="Daur Ulang / Recycle" value={kg(ringkasan.totalRecycle)}/><Stat label="Guna Ulang / Reuse" value={kg(ringkasan.totalReuse)}/><Stat label="Residu" value={kg(ringkasan.totalResidu)}/><Stat label="Sampah Terkelola" value={kg(totalTerkelola)}/><Stat label="Jumlah Laporan" value={String(ringkasan.totalLaporan)}/>
      </div>
      <div className="dashboard-card-grid" style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(300px,1fr))',gap:16}}>
        <AnimatedLineChart title="Total Timbangan per Kategori" subtitle={`${BULAN[bulan-1]} ${tahun} - satuan kg`} data={kategori} accent="green"/>
        <SimplePieChart title="Proporsi Kategori Sampah" subtitle={`${BULAN[bulan-1]} ${tahun}`} data={pie}/>
        <SimpleBarChart title="Sampah Terkelola" subtitle={`${BULAN[bulan-1]} ${tahun} - satuan kg`} data={[{label:'Organik',value:ringkasan.terkelolaOrganik,color:WARNA.organik},{label:'Daur Ulang',value:ringkasan.terkelolaRecycle,color:WARNA.recycle},{label:'Guna Ulang',value:ringkasan.terkelolaReuse,color:WARNA.reuse},{label:'Residu',value:ringkasan.terkelolaResidu,color:WARNA.residu}]}/>
      </div>
      <div className="dashboard-card-grid" style={{display:'grid',gridTemplateColumns:'minmax(0,2fr) minmax(320px,1fr)',gap:16}}><MultiLineChart title="Tren Sampah per Kategori per Bulan" subtitle={`${tahun} - satuan kg`} labels={BULAN_SINGKAT} series={[
        {label:'Organik',color:WARNA.organik,values:tren.map((x)=>bulat(x.organik))},{label:'Daur Ulang',color:WARNA.recycle,values:tren.map((x)=>bulat(x.recycle))},{label:'Guna Ulang',color:WARNA.reuse,values:tren.map((x)=>bulat(x.reuse))},{label:'Residu',color:WARNA.residu,values:tren.map((x)=>bulat(x.residu))}
      ]}/><PhotoCarousel items={foto}/></div>
    </>}
  </div>;
}

function Stat({label,value}:{label:string;value:string}) { return <div style={{padding:'14px 16px',background:'#f7fafd',border:'1px solid #e4edf7',borderRadius:14}}><div style={{color:'#7185a0',fontSize:11.5,fontWeight:700,marginBottom:4}}>{label}</div><div style={{color:'#10244a',fontSize:19,fontWeight:800}}>{value}</div></div>; }
