"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { ArrowLeft, FileText, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { getStoredUser } from "@/lib/access-control";
import {
  epromApi,
  formatBulanLabel,
  formatTanggal,
  isEpromOwner,
  isEpromVendor,
  LABEL_TIPE_LINK_MEETING,
  urlFileEprom,
  type DokumentasiMeetingItem,
  type MeetingItem,
  type MomItem,
  type Project,
  type ProgressItem,
  type TipeLinkMeeting,
} from "@/lib/eprom-api";
import engineerStyles from "../../engineer/engineer.module.css";

const ACCEPT_FOTO = ".jpg,.jpeg,.png,.webp";

type Tab = "meeting" | "dokumentasi" | "mom";

function labelProgress(item: ProgressItem, tipeLink: TipeLinkMeeting): string {
  return tipeLink === "MINGGUAN" ? `Minggu ke-${item.mingguKe ?? "-"}` : formatBulanLabel(item.bulan);
}

function labelMeeting(m: MeetingItem): string {
  const bagian = [LABEL_TIPE_LINK_MEETING[m.tipeLink]];
  if (m.progressLabel) bagian.push(m.progressLabel);
  if (m.tanggalMeeting) bagian.push(formatTanggal(m.tanggalMeeting));
  return bagian.join(" — ");
}

export default function MeetingDetailPage() {
  const params = useParams<{ projectId: string }>();
  const searchParams = useSearchParams();
  const projectId = Number(params.projectId);
  const user = getStoredUser();
  const boleh = isEpromOwner(user);
  const vendorSaya = isEpromVendor(user);

  const tab = (searchParams.get("tab") as Tab | null) ?? "meeting";

  const [project, setProject] = useState<Project | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [meetings, setMeetings] = useState<MeetingItem[]>([]);
  const [selectedMeetingId, setSelectedMeetingId] = useState<number | null>(null);

  const muatMeetings = useCallback(() => {
    epromApi.meeting
      .daftar(projectId)
      .then((data) => {
        setMeetings(data);
        setSelectedMeetingId((cur) => cur ?? data[0]?.id ?? null);
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Gagal memuat meeting"));
  }, [projectId]);

  useEffect(() => {
    epromApi.project
      .detail(projectId)
      .then(setProject)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Gagal memuat project"));
  }, [projectId]);

  useEffect(muatMeetings, [muatMeetings]);

  return (
    <div className={engineerStyles.page}>
      <Link href="/civil/project/meeting" className={engineerStyles.backLink}>
        <ArrowLeft size={16} /> Kembali ke daftar Project
      </Link>

      <div className={engineerStyles.detailHeader}>
        <div>
          <h1>{project?.namaProject ?? "Memuat..."}</h1>
          {project && (
            <p>
              Kontrak {project.kontrak.nomorKontrak} — {project.kontrak.vendor.namaVendor}
            </p>
          )}
        </div>
      </div>

      <p className={engineerStyles.tabHint}>
        {tab === "meeting" ? "Meeting" : tab === "dokumentasi" ? "Dokumentasi Meeting" : "MOM"}
        <span> — pilih tahapan lain lewat menu Meeting Progress di sidebar.</span>
      </p>

      {error && <p className={engineerStyles.errorText}>{error}</p>}

      {tab === "meeting" && (
        <MeetingTab
          projectId={projectId}
          meetings={meetings}
          onChanged={muatMeetings}
          boleh={boleh}
          vendorSaya={vendorSaya}
        />
      )}
      {tab === "dokumentasi" && (
        <DokumentasiTab
          meetings={meetings}
          selectedMeetingId={selectedMeetingId}
          onSelectMeeting={setSelectedMeetingId}
          boleh={boleh}
          vendorSaya={vendorSaya}
        />
      )}
      {tab === "mom" && (
        <MomTab
          meetings={meetings}
          selectedMeetingId={selectedMeetingId}
          onSelectMeeting={setSelectedMeetingId}
          boleh={boleh}
          vendorSaya={vendorSaya}
        />
      )}
    </div>
  );
}

function MeetingTab({
  projectId,
  meetings,
  onChanged,
  boleh,
  vendorSaya,
}: {
  projectId: number;
  meetings: MeetingItem[];
  onChanged: () => void;
  boleh: boolean;
  vendorSaya: boolean;
}) {
  const [tipeLink, setTipeLink] = useState<TipeLinkMeeting>("MINGGUAN");
  const [sumber, setSumber] = useState<ProgressItem[]>([]);
  const [refProgressId, setRefProgressId] = useState("");
  const [tanggalMeeting, setTanggalMeeting] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    epromApi.meeting
      .sumberProgress(projectId, tipeLink)
      .then((data) => {
        setSumber(data);
        setRefProgressId("");
      })
      .catch(() => setSumber([]));
  }, [projectId, tipeLink]);

  async function buatMeeting(event: React.FormEvent) {
    event.preventDefault();
    if (!refProgressId) {
      setError("Pilih data Progress terlebih dahulu");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await epromApi.meeting.buat({
        projectId,
        tipeLink,
        refProgressId: Number(refProgressId),
        tanggalMeeting,
      });
      setRefProgressId("");
      setTanggalMeeting("");
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal membuat meeting");
    } finally {
      setSubmitting(false);
    }
  }

  async function hapus(meeting: MeetingItem) {
    if (!confirm("Hapus meeting ini beserta Dokumentasi dan MOM di dalamnya?")) return;
    try {
      await epromApi.meeting.hapus(meeting.id);
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menghapus meeting");
    }
  }

  return (
    <div className={engineerStyles.panel}>
      <h2 className={engineerStyles.sectionTitle}>Meeting</h2>

      {(boleh || vendorSaya) && (
        <form className={engineerStyles.formCard} onSubmit={buatMeeting} style={{ marginBottom: 18 }}>
          <label>
            Sumber Data
            <select value={tipeLink} onChange={(e) => setTipeLink(e.target.value as TipeLinkMeeting)}>
              <option value="MINGGUAN">Progress Mingguan</option>
              <option value="BULANAN">Progress Bulanan</option>
            </select>
          </label>
          <label>
            Pilih File
            <select value={refProgressId} onChange={(e) => setRefProgressId(e.target.value)} required>
              <option value="">Pilih...</option>
              {sumber.map((item) => (
                <option key={item.id} value={item.id}>
                  {labelProgress(item, tipeLink)}
                </option>
              ))}
            </select>
          </label>
          <label>
            Tanggal Meeting
            <input
              type="date"
              value={tanggalMeeting}
              onChange={(e) => setTanggalMeeting(e.target.value)}
              required
            />
          </label>
          <button type="submit" className={engineerStyles.primaryButton} disabled={submitting}>
            {submitting ? "Menyimpan..." : "Buat Meeting"}
          </button>
        </form>
      )}

      {error && <p className={engineerStyles.errorText}>{error}</p>}
      {meetings.length === 0 && <p className={engineerStyles.emptyText}>Belum ada meeting.</p>}

      <div className={engineerStyles.itemList}>
        {meetings.map((m) => (
          <div key={m.id} className={engineerStyles.itemRow}>
            <div className={engineerStyles.itemRowTop}>
              <strong>{labelMeeting(m)}</strong>
            </div>
            <div className={engineerStyles.itemRowMeta}>
              {m.progressFileUrl && (
                <a href={urlFileEprom(m.progressFileUrl)} target="_blank" rel="noreferrer">
                  <FileText size={12} style={{ verticalAlign: "middle", marginRight: 4 }} />
                  Lihat File Progress
                </a>
              )}
              <span>
                {m._count?.dokumentasi ?? 0} dokumentasi &middot; {m._count?.mom ?? 0} MOM
              </span>
            </div>
            {(boleh || vendorSaya) && (
              <button
                type="button"
                className={engineerStyles.iconButtonDanger}
                onClick={() => hapus(m)}
                title="Hapus"
                style={{ marginTop: 10 }}
              >
                <Trash2 size={13} />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function PilihMeeting({
  meetings,
  selectedMeetingId,
  onSelectMeeting,
}: {
  meetings: MeetingItem[];
  selectedMeetingId: number | null;
  onSelectMeeting: (id: number) => void;
}) {
  if (meetings.length === 0) {
    return (
      <p className={engineerStyles.emptyText} style={{ marginBottom: 14 }}>
        Belum ada Meeting — buat Meeting dulu di tab Meeting.
      </p>
    );
  }

  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 18 }}>
      <span style={{ color: "#34506f", fontSize: 11, fontWeight: 700 }}>Pilih Meeting</span>
      <select
        value={selectedMeetingId ?? ""}
        onChange={(e) => onSelectMeeting(Number(e.target.value))}
        style={{
          padding: "9px 11px",
          border: "1px solid #d8e4f2",
          borderRadius: 9,
          fontSize: 12,
          maxWidth: 420,
        }}
      >
        {meetings.map((m) => (
          <option key={m.id} value={m.id}>
            {labelMeeting(m)}
          </option>
        ))}
      </select>
    </label>
  );
}

function DokumentasiTab({
  meetings,
  selectedMeetingId,
  onSelectMeeting,
  boleh,
  vendorSaya,
}: {
  meetings: MeetingItem[];
  selectedMeetingId: number | null;
  onSelectMeeting: (id: number) => void;
  boleh: boolean;
  vendorSaya: boolean;
}) {
  const [items, setItems] = useState<DokumentasiMeetingItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [fileBaru, setFileBaru] = useState<File | null>(null);

  const muat = useCallback(() => {
    if (!selectedMeetingId) {
      setItems([]);
      return;
    }
    setLoading(true);
    epromApi.meeting
      .daftarDokumentasi(selectedMeetingId)
      .then(setItems)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Gagal memuat data"))
      .finally(() => setLoading(false));
  }, [selectedMeetingId]);

  useEffect(() => {
    muat();
    setFileBaru(null);
  }, [muat]);

  async function unggah(event: React.FormEvent) {
    event.preventDefault();
    if (!selectedMeetingId || !fileBaru) {
      setError("Pilih file terlebih dahulu");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await epromApi.meeting.unggahDokumentasi(selectedMeetingId, fileBaru);
      setFileBaru(null);
      muat();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mengunggah");
    } finally {
      setSubmitting(false);
    }
  }

  async function hapus(item: DokumentasiMeetingItem) {
    if (!confirm("Hapus foto ini?")) return;
    try {
      await epromApi.meeting.hapusDokumentasi(item.id);
      muat();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menghapus");
    }
  }

  return (
    <div className={engineerStyles.panel}>
      <h2 className={engineerStyles.sectionTitle}>Dokumentasi Meeting</h2>

      <PilihMeeting
        meetings={meetings}
        selectedMeetingId={selectedMeetingId}
        onSelectMeeting={onSelectMeeting}
      />

      {selectedMeetingId && (boleh || vendorSaya) && (
        <form className={engineerStyles.formCard} onSubmit={unggah} style={{ marginBottom: 18 }}>
          <label>
            Foto
            <input
              type="file"
              accept={ACCEPT_FOTO}
              onChange={(e) => setFileBaru(e.target.files?.[0] ?? null)}
            />
          </label>
          <button type="submit" className={engineerStyles.primaryButton} disabled={submitting}>
            {submitting ? "Mengunggah..." : "Unggah Foto"}
          </button>
        </form>
      )}

      {error && <p className={engineerStyles.errorText}>{error}</p>}
      {loading && <p className={engineerStyles.emptyText}>Memuat...</p>}
      {selectedMeetingId && !loading && items.length === 0 && (
        <p className={engineerStyles.emptyText}>Belum ada dokumentasi.</p>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
          gap: 12,
        }}
      >
        {items.map((item) => (
          <div key={item.id} style={{ position: "relative" }}>
            {item.fileFoto ? (
              <a href={urlFileEprom(item.fileFoto)} target="_blank" rel="noreferrer">
                <img
                  src={urlFileEprom(item.fileFoto)}
                  alt="Dokumentasi meeting"
                  style={{
                    width: "100%",
                    height: 110,
                    objectFit: "cover",
                    borderRadius: 10,
                    border: "1px solid #e4edf7",
                  }}
                />
              </a>
            ) : (
              <div className={engineerStyles.emptyText}>Tidak ada file</div>
            )}
            {(boleh || vendorSaya) && (
              <button
                type="button"
                className={engineerStyles.iconButtonDanger}
                onClick={() => hapus(item)}
                title="Hapus"
                style={{ marginTop: 6 }}
              >
                <Trash2 size={13} />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function MomTab({
  meetings,
  selectedMeetingId,
  onSelectMeeting,
  boleh,
  vendorSaya,
}: {
  meetings: MeetingItem[];
  selectedMeetingId: number | null;
  onSelectMeeting: (id: number) => void;
  boleh: boolean;
  vendorSaya: boolean;
}) {
  const [items, setItems] = useState<MomItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [pica, setPica] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [pic, setPic] = useState("");

  const muat = useCallback(() => {
    if (!selectedMeetingId) {
      setItems([]);
      return;
    }
    setLoading(true);
    epromApi.meeting
      .daftarMom(selectedMeetingId)
      .then(setItems)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Gagal memuat data"))
      .finally(() => setLoading(false));
  }, [selectedMeetingId]);

  useEffect(muat, [muat]);

  async function tambah(event: React.FormEvent) {
    event.preventDefault();
    if (!selectedMeetingId) return;

    setSubmitting(true);
    setError(null);
    try {
      await epromApi.meeting.buatMom(selectedMeetingId, { pica, dueDate, pic });
      setPica("");
      setDueDate("");
      setPic("");
      muat();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menambah MOM");
    } finally {
      setSubmitting(false);
    }
  }

  async function close(item: MomItem, file: File) {
    if (!confirm("Tutup MOM ini? Angka keterlambatan akan dibekukan saat ini.")) return;
    try {
      await epromApi.meeting.closeMom(item.id, file);
      muat();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menutup MOM");
    }
  }

  async function hapus(item: MomItem) {
    if (!confirm("Hapus MOM ini?")) return;
    try {
      await epromApi.meeting.hapusMom(item.id);
      muat();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menghapus MOM");
    }
  }

  function labelTerlambat(item: MomItem): string {
    const nilai = item.statusClose ? item.hariTerlambat : item.hariTerlambatLive;
    if (nilai === null || nilai === undefined) return "-";
    if (nilai <= 0) return item.statusClose ? "Tepat waktu" : "Belum jatuh tempo";
    return `Terlambat ${nilai} hari`;
  }

  return (
    <div className={engineerStyles.panel}>
      <h2 className={engineerStyles.sectionTitle}>MOM (Minutes of Meeting)</h2>

      <PilihMeeting
        meetings={meetings}
        selectedMeetingId={selectedMeetingId}
        onSelectMeeting={onSelectMeeting}
      />

      {selectedMeetingId && (boleh || vendorSaya) && (
        <form className={engineerStyles.formCard} onSubmit={tambah} style={{ marginBottom: 18 }}>
          <label>
            PICA (Tindak Lanjut)
            <input value={pica} onChange={(e) => setPica(e.target.value)} required />
          </label>
          <label>
            Due Date
            <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} required />
          </label>
          <label>
            PIC
            <input value={pic} onChange={(e) => setPic(e.target.value)} required />
          </label>
          <button type="submit" className={engineerStyles.primaryButton} disabled={submitting}>
            {submitting ? "Menyimpan..." : "Tambah MOM"}
          </button>
        </form>
      )}

      {error && <p className={engineerStyles.errorText}>{error}</p>}
      {loading && <p className={engineerStyles.emptyText}>Memuat...</p>}
      {selectedMeetingId && !loading && items.length === 0 && (
        <p className={engineerStyles.emptyText}>Belum ada MOM.</p>
      )}

      {items.length > 0 && (
        <div className={engineerStyles.tableWrap}>
          <table className={engineerStyles.table}>
            <thead>
              <tr>
                <th>PICA</th>
                <th>Due Date</th>
                <th>PIC</th>
                <th>Close</th>
                <th>Keterlambatan</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td>{item.pica}</td>
                  <td>{formatTanggal(item.dueDate)}</td>
                  <td>{item.pic}</td>
                  <td>
                    {item.statusClose ? (
                      <div className={engineerStyles.stackedText}>
                        <span className={`${engineerStyles.statusPill} ${engineerStyles.status_APPROVED}`}>
                          Close
                        </span>
                        {item.tglClose && <small>{formatTanggal(item.tglClose)}</small>}
                        {item.fileFotoClose && (
                          <a href={urlFileEprom(item.fileFotoClose)} target="_blank" rel="noreferrer">
                            <FileText size={12} style={{ verticalAlign: "middle", marginRight: 4 }} />
                            Lihat Foto
                          </a>
                        )}
                      </div>
                    ) : (boleh || vendorSaya) ? (
                      <div className={engineerStyles.inlineForm}>
                        <input
                          type="file"
                          accept={ACCEPT_FOTO}
                          style={{ maxWidth: 150 }}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            e.target.value = "";
                            if (file) close(item, file);
                          }}
                        />
                        <button
                          type="button"
                          className={engineerStyles.iconButtonDanger}
                          onClick={() => hapus(item)}
                          title="Hapus"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ) : (
                      <span className={`${engineerStyles.statusPill} ${engineerStyles.status_PENDING}`}>
                        Open
                      </span>
                    )}
                  </td>
                  <td>{labelTerlambat(item)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
