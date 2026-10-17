'use client';

import Link from 'next/link';
import { CheckCircle2, CircleDot, ListChecks, Plus } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { civilMonitoringProjectApi, TAHAPAN_PROJECT_TAMBANG, type MonitoringProjectTambang } from '@/lib/civil-monitoring-project-api';
import styles from '../monitoring-project.module.css';

export default function MonitoringProjectDashboardPage() {
  const [data, setData] = useState<MonitoringProjectTambang[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    civilMonitoringProjectApi.daftar().then(setData).catch((err: unknown) => setError(err instanceof Error ? err.message : 'Gagal memuat data')).finally(() => setLoading(false));
  }, []);

  const ringkasan = useMemo(() => {
    const totalTahapan = data.length * TAHAPAN_PROJECT_TAMBANG.length;
    const tahapanSelesai = data.reduce((total, item) => total + TAHAPAN_PROJECT_TAMBANG.filter((field) => item[field]).length, 0);
    return {
      total: data.length,
      berjalan: data.filter((item) => !item.selesai).length,
      selesai: data.filter((item) => item.selesai).length,
      progress: totalTahapan ? Math.round((tahapanSelesai / totalTahapan) * 100) : 0,
    };
  }, [data]);

  return <main className={styles.page}>
    <div className={styles.header}><div><h1>Dashboard Monitoring Project</h1><p>Ringkasan progres Project Infrastruktur Tambang.</p></div><Link className={styles.primary} href="/civil/monitoring-project-infrastruktur-tambang"><Plus size={17} /> Input Monitoring</Link></div>
    {error && <p className={styles.error}>{error}</p>}
    <section className={styles.dashboardSummary}>
      <div><ListChecks size={22} /><span>Total Pekerjaan</span><strong>{ringkasan.total}</strong></div>
      <div><CircleDot size={22} /><span>Sedang Berjalan</span><strong>{ringkasan.berjalan}</strong></div>
      <div><CheckCircle2 size={22} /><span>Selesai</span><strong>{ringkasan.selesai}</strong></div>
      <div><ListChecks size={22} /><span>Progress Keseluruhan</span><strong>{ringkasan.progress}%</strong></div>
    </section>
    <section className={styles.panel}>
      <div className={styles.dashboardTitle}><h2>Progress per Pekerjaan</h2></div>
      {loading ? <p className={styles.state}>Memuat data...</p> : <div className={styles.projectGrid}>
        {data.map((item) => {
          const jumlah = TAHAPAN_PROJECT_TAMBANG.filter((field) => item[field]).length;
          const persen = Math.round((jumlah / 8) * 100);
          return <article key={item.id} className={styles.projectCard}><div><strong>{item.namaPekerjaan}</strong><span>{item.selesai ? 'Selesai' : 'Sedang Berjalan'}</span></div><div className={styles.cardProgress}><span style={{ width: `${persen}%` }} /></div><small>{jumlah}/8 tahapan • {persen}%</small></article>;
        })}
        {data.length === 0 && <p className={styles.empty}>Belum ada pekerjaan.</p>}
      </div>}
    </section>
  </main>;
}
