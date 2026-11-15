'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Wrench, X } from 'lucide-react';
import { getStoredUser } from '@/lib/access-control';
import { isAdminPeminjaman } from '@/components/tool-borrowing/akses';
import { STATUS_ALAT } from '@/components/tool-borrowing/tool-borrowing-modals';
import { toolBorrowingApi, type ToolAsset, type ToolInspectionTemplate } from '@/lib/tool-borrowing-api';
import tp from '@/components/transport/transport.module.css';
import tb from '@/components/tool-borrowing/tool-borrowing.module.css';

export default function MasterAlat() {
  const router = useRouter();
  const [tools, setTools] = useState<ToolAsset[]>([]);
  const [templates, setTemplates] = useState<ToolInspectionTemplate[]>([]);
  const [search, setSearch] = useState('');
  const [owner, setOwner] = useState('ALL');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ owner: 'GA', code: '', name: '', inspectionType: '' });
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);

  async function load() {
    setLoading(true); setError('');
    try {
      const [toolRows, templateRows] = await Promise.all([toolBorrowingApi.tools(), toolBorrowingApi.inspectionTemplates()]);
      setTools(toolRows); setTemplates(templateRows);
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Gagal memuat data'); }
    finally { setLoading(false); }
  }

  useEffect(() => {
    if (!isAdminPeminjaman(getStoredUser())) { router.replace('/ga/peminjaman-alat/monitoring'); return; }
    void load();
  }, [router]);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tools.filter((tool) => (owner === 'ALL' || tool.owner === owner) && (!q || `${tool.code} ${tool.name}`.toLowerCase().includes(q)));
  }, [tools, search, owner]);

  const judulTemplate = (key: string) => templates.find((item) => item.key === key)?.title ?? key;

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true); setFormError('');
    try {
      await toolBorrowingApi.createTool(form);
      setModal(false); setForm((cur) => ({ ...cur, code: '', name: '', inspectionType: '' }));
      setSuccess('Master alat berhasil ditambahkan.');
      await load();
    } catch (caught) { setFormError(caught instanceof Error ? caught.message : 'Gagal menyimpan alat'); }
    finally { setBusy(false); }
  }

  async function ubahJenis(tool: ToolAsset, inspectionType: string) {
    setError(''); setSuccess('');
    try {
      await toolBorrowingApi.updateToolInspection(tool.id, inspectionType);
      setSuccess(`Jenis inspeksi ${tool.code} diperbarui.`);
      await load();
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Gagal mengubah jenis inspeksi'); }
  }

  return (
    <section>
      <div className={tp.hero}>
        <div>
          <span className={tp.heroIcon}><Wrench /></span>
          <div>
            <h1>Master Alat</h1>
            <p>Daftar alat GA &amp; Electric beserta jenis checklist inspeksi yang dipakai saat dipinjam.</p>
          </div>
        </div>
        <div className={tp.heroActions}>
          <button className={tp.primary} onClick={() => { setFormError(''); setModal(true); }}><Plus /> Tambah Alat</button>
        </div>
      </div>

      {error && <p className={tp.pageError}>{error}</p>}
      {success && <p className={tb.pageSuccess}>{success}</p>}

      <div className={tp.filterPanel} style={{ gridTemplateColumns: 'minmax(200px, 1fr) minmax(140px, 180px) auto' }}>
        <input placeholder="Cari kode atau nama alat..." value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Cari alat" />
        <select value={owner} onChange={(e) => setOwner(e.target.value)} aria-label="Filter tim"><option value="ALL">Semua tim</option><option value="GA">GA</option><option value="ELECTRIC">Electric</option></select>
        <button type="button" onClick={() => { setSearch(''); setOwner('ALL'); }}>Reset</button>
      </div>

      <div className={tp.tablePanel}>
        <div className={tp.tableTitle}><h3>Data Alat</h3><span>Total {rows.length} alat</span></div>
        <div className={tp.tableScroll}>
          <table>
            <thead><tr><th>No</th><th>Tim</th><th>Kode Alat</th><th>Nama Alat</th><th>Jenis Inspeksi</th><th>Status</th></tr></thead>
            <tbody>
              {rows.map((tool, index) => <tr key={tool.id}>
                <td>{index + 1}</td>
                <td>{tool.owner}</td>
                <td><b>{tool.code}</b></td>
                <td>{tool.name}</td>
                <td>
                  <select className={tb.typeSelect} value={tool.inspectionType ?? ''} onChange={(e) => void ubahJenis(tool, e.target.value)} aria-label={`Jenis inspeksi ${tool.code}`}>
                    <option value="">Otomatis: {judulTemplate(tool.inspectionKey)}</option>
                    {templates.map((item) => <option key={item.key} value={item.key}>{item.title}</option>)}
                  </select>
                </td>
                <td><span className={`${tb.badge} ${tb[tool.status.toLowerCase()]}`}>{STATUS_ALAT[tool.status]}</span></td>
              </tr>)}
              {!rows.length && <tr><td colSpan={6} className={tp.empty}>{loading ? 'Memuat data...' : 'Belum ada alat.'}</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {modal && <div className={tp.modalBack}>
        <form className={tp.modal} onSubmit={submit}>
          <header>
            <div><h2>Tambah Alat</h2><p>Jenis inspeksi menentukan checklist yang diisi saat alat dipinjam.</p></div>
            <button type="button" onClick={() => setModal(false)} aria-label="Tutup"><X /></button>
          </header>
          <div className={tp.formGrid}>
            <label>Tim<select value={form.owner} onChange={(e) => setForm((cur) => ({ ...cur, owner: e.target.value }))}><option value="GA">GA</option><option value="ELECTRIC">Electric</option></select></label>
            <label>Kode Alat<input required value={form.code} onChange={(e) => setForm((cur) => ({ ...cur, code: e.target.value }))} /></label>
            <label style={{ gridColumn: '1/-1' }}>Nama Alat<input required value={form.name} onChange={(e) => setForm((cur) => ({ ...cur, name: e.target.value }))} /></label>
            <label style={{ gridColumn: '1/-1' }}>Jenis Inspeksi
              <select value={form.inspectionType} onChange={(e) => setForm((cur) => ({ ...cur, inspectionType: e.target.value }))}>
                <option value="">Otomatis dari nama alat</option>
                {templates.map((item) => <option key={item.key} value={item.key}>{item.title}</option>)}
              </select>
            </label>
          </div>
          {formError && <p className={tp.error}>{formError}</p>}
          <footer>
            <button type="button" onClick={() => setModal(false)}>Batal</button>
            <button className={tp.primary} disabled={busy}>{busy ? 'Menyimpan...' : 'Simpan'}</button>
          </footer>
        </form>
      </div>}
    </section>
  );
}
