"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { ArrowLeft, FileText, Trash2, Upload } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { getStoredUser } from "@/lib/access-control";
import { epromApi, formatWaktuWITA, isEpromOwner, isEpromVendor, urlFileEprom, type Project, type SafetyMeetingFileItem, type TipeSafetyMeeting } from "@/lib/eprom-api";
import styles from "../../engineer/engineer.module.css";

type TipeFileProject = Extract<TipeSafetyMeeting, 'dokpro' | 'izin-kerja-khusus'>;
const LABEL: Record<TipeFileProject, string> = { dokpro: 'Dokpro', 'izin-kerja-khusus': 'Izin Kerja Khusus' };

export default function ProjectFilePage() {
  const params = useParams<{ projectId: string }>();
  const search = useSearchParams();
  const projectId = Number(params.projectId);
  const tipe: TipeFileProject = search.get('tab') === 'izin-kerja-khusus' ? 'izin-kerja-khusus' : 'dokpro';
  const user = getStoredUser();
  const boleh = isEpromOwner(user) || isEpromVendor(user);
  const [project, setProject] = useState<Project | null>(null);
  const [items, setItems] = useState<SafetyMeetingFileItem[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [inputKey, setInputKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const muat = useCallback(() => {
    setLoading(true);
    epromApi.safetyMeeting.daftar(tipe, projectId).then(setItems).catch((e) => setError(e instanceof Error ? e.message : 'Gagal memuat file')).finally(() => setLoading(false));
  }, [projectId, tipe]);

  useEffect(() => { epromApi.project.detail(projectId).then(setProject).catch(() => setProject(null)); }, [projectId]);
  useEffect(() => { muat(); }, [muat]);

  async function unggah(event: React.FormEvent) {
    event.preventDefault();
    if (!files.length) return;
    setSubmitting(true); setError(null);
    try { await epromApi.safetyMeeting.unggah(tipe, projectId, files); setFiles([]); setInputKey((v) => v + 1); muat(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Gagal mengunggah file'); }
    finally { setSubmitting(false); }
  }

  async function hapus(item: SafetyMeetingFileItem) {
    if (!confirm(`Hapus file ${item.originalFileName}?`)) return;
    await epromApi.safetyMeeting.hapus(tipe, item.id); muat();
  }

  return <div className={styles.page}>
    <Link href={tipe === 'dokpro' ? '/civil/project/engineer' : '/civil/project/konstruksi'} className={styles.backLink}><ArrowLeft size={16}/> Kembali ke daftar Project</Link>
    <div className={styles.detailHeader}><div><h1>{project?.namaProject ?? 'Memuat...'}</h1>{project && <p>Kontrak {project.kontrak.nomorKontrak} &mdash; {project.kontrak.vendor.namaVendor}</p>}</div></div>
    <p className={styles.tabHint}>{LABEL[tipe]} <span>&mdash; upload file tanpa proses approval.</span></p>
    <div className={styles.panel}>
      <h2 className={styles.sectionTitle}>File {LABEL[tipe]}</h2>
      {boleh && <form className={styles.formCard} onSubmit={unggah} style={{marginBottom:18}}><label>Pilih File<input key={inputKey} type="file" multiple accept="*/*" onChange={(e) => setFiles(Array.from(e.target.files ?? []))}/>{files.length > 0 && <span>{files.length} file dipilih</span>}</label><button className={styles.primaryButton} disabled={submitting || !files.length}><Upload size={14}/>{submitting ? 'Mengunggah...' : 'Unggah File'}</button></form>}
      {error && <p className={styles.errorText}>{error}</p>}{loading && <p className={styles.emptyText}>Memuat file...</p>}
      {!loading && !items.length && <p className={styles.emptyText}>Belum ada file.</p>}
      <div className={styles.itemList}>{items.map((item) => <div className={styles.itemRow} key={item.id}><div className={styles.itemRowTop}><strong>{item.originalFileName}</strong>{boleh && <button type="button" className={styles.iconButtonDanger} onClick={() => hapus(item)}><Trash2 size={13}/></button>}</div><div className={styles.itemRowMeta}><a href={urlFileEprom(item.fileUrl)} target="_blank" rel="noreferrer"><FileText size={12}/> Lihat File</a><span>Diunggah oleh {item.uploadedBy.name} &middot; {formatWaktuWITA(item.uploadedAt)}</span></div></div>)}</div>
    </div>
  </div>;
}
