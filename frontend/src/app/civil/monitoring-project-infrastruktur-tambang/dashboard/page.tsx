'use client';

import { CheckCircle2, CircleDot, ListChecks } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { civilMonitoringProjectApi, TAHAPAN_PROJECT_TAMBANG, type MonitoringProjectTambang } from '@/lib/civil-monitoring-project-api';
import styles from '../monitoring-project.module.css';

function progres(item: MonitoringProjectTambang) {
  const jumlah = TAHAPAN_PROJECT_TAMBANG.filter((field) => item[field]).length;
  const total = TAHAPAN_PROJECT_TAMBANG.length - (item.dokumenProjectTidakBerlaku ? 1 : 0);
  return { jumlah, total, persen: Math.round(jumlah / total * 100) };
}

export default function MonitoringProjectDashboardPage() {
  const [data, setData] = useState<MonitoringProjectTambang[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => { civilMonitoringProjectApi.daftar().then(setData).catch((err: unknown) => setError(err instanceof Error ? err.message : 'Gagal memuat data')).finally(() => setLoading(false)); }, []);
  const ringkasan = useMemo(() => {
    const nilai = data.map(progres), totalTahapan = nilai.reduce((sum, item) => sum + item.total, 0), tahapanSelesai = nilai.reduce((sum, item) => sum + item.jumlah, 0);
    return { total: data.length, berjalan: data.filter((item) => !item.selesai).length, selesai: data.filter((item) => item.selesai).length, progress: totalTahapan ? Math.round(tahapanSelesai / totalTahapan * 100) : 0 };
  }, [data]);
  return <main className={styles.page}>
    <div className={styles.header}><div><h1>Dashboard Monitoring Project</h1><p>Ringkasan progres Project Infrastruktur Tambang.</p></div></div>
    {error && <p className={styles.error}>{error}</p>}
    <section className={styles.dashboardSummary}><div><ListChecks size={22}/><span>Total Pekerjaan</span><strong>{ringkasan.total}</strong></div><div><CircleDot size={22}/><span>Sedang Berjalan</span><strong>{ringkasan.berjalan}</strong></div><div><CheckCircle2 size={22}/><span>Selesai</span><strong>{ringkasan.selesai}</strong></div><div><ListChecks size={22}/><span>Progress Keseluruhan</span><strong>{ringkasan.progress}%</strong></div></section>
    <section className={`${styles.panel} ${styles.chartPanel}`}><div className={styles.dashboardTitle}><h2>Grafik Progress Pekerjaan</h2></div>{loading ? <p className={styles.state}>Memuat data...</p> : data.length ? <div className={styles.barChart}><div className={styles.chartScale}><span>100%</span><span>75%</span><span>50%</span><span>25%</span><span>0%</span></div><div className={styles.chartPlot}>{data.map((item) => { const nilai = progres(item); return <div key={item.id} className={styles.chartColumn}><strong>{nilai.persen}%</strong><div className={styles.chartTrack}><i style={{height:`${nilai.persen}%`}}/></div><span title={item.namaPekerjaan}>{item.namaPekerjaan}</span></div>; })}</div></div> : <p className={styles.empty}>Belum ada pekerjaan.</p>}</section>
    <section className={styles.panel}><div className={styles.dashboardTitle}><h2>Progress per Pekerjaan</h2></div>{loading ? <p className={styles.state}>Memuat data...</p> : <div className={styles.projectGrid}>{data.map((item) => { const nilai = progres(item); return <article key={item.id} className={styles.projectCard}><div><strong>{item.namaPekerjaan}</strong><span>{item.selesai?'Selesai':'Sedang Berjalan'}</span></div><div className={styles.cardProgress}><span style={{width:`${nilai.persen}%`}}/></div><small>{nilai.jumlah}/{nilai.total} tahapan • {nilai.persen}%</small></article>; })}{data.length===0&&<p className={styles.empty}>Belum ada pekerjaan.</p>}</div>}</section>
  </main>;
}
