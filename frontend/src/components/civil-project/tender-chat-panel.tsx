"use client";

import { Mail, MailWarning, Paperclip, Send, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import { getAccessToken } from "@/lib/access-control";
import { epromApi, urlFileEprom, type TenderPesan } from "@/lib/eprom-api";
import styles from "./tender-chat-panel.module.css";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";
const SOCKET_URL = API_BASE.replace(/\/api\/?$/, "");

type TenderChatPanelProps = {
  tenderId: number;
  vendorId: number;
  namaTender: string;
  namaVendor: string;
  onClose: () => void;
};

function formatJam(iso: string): string {
  return new Date(iso).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
}

function formatTanggalPendek(iso: string): string {
  return new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

export function TenderChatPanel({ tenderId, vendorId, namaTender, namaVendor, onClose }: TenderChatPanelProps) {
  const [pesan, setPesan] = useState<TenderPesan[]>([]);
  const [undanganId, setUndanganId] = useState<number | null>(null);
  const [mailAktif, setMailAktif] = useState(false);
  const [memuat, setMemuat] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isi, setIsi] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [mengirim, setMengirim] = useState(false);

  const socketRef = useRef<Socket | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    let batal = false;

    epromApi.tender.pesan
      .daftar(tenderId, vendorId)
      .then((hasil) => {
        if (batal) return;
        setPesan(hasil.pesan);
        setUndanganId(hasil.undanganId);
        setMailAktif(hasil.mailAktif);
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Gagal memuat percakapan"))
      .finally(() => !batal && setMemuat(false));

    return () => {
      batal = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenderId, vendorId]);

  useEffect(() => {
    if (!undanganId) return;

    const socket = io(`${SOCKET_URL}/eprom-tender-chat`, {
      auth: { token: getAccessToken() },
      transports: ["websocket"],
    });
    socketRef.current = socket;

    socket.emit("join_undangan", undanganId);
    socket.on("pesan:baru", (baru: TenderPesan) => {
      setPesan((cur) => (cur.some((p) => p.id === baru.id) ? cur : [...cur, baru]));
    });

    return () => {
      socket.emit("leave_undangan", undanganId);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [undanganId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [pesan.length]);

  const bisaKirim = useMemo(() => (isi.trim().length > 0 || files.length > 0) && !mengirim, [isi, files, mengirim]);

  async function kirim() {
    if (!bisaKirim) return;
    setMengirim(true);
    setError(null);
    try {
      const baru = await epromApi.tender.pesan.kirim(tenderId, vendorId, isi.trim(), files);
      setPesan((cur) => (cur.some((p) => p.id === baru.id) ? cur : [...cur, baru]));
      setIsi("");
      setFiles([]);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mengirim pesan");
    } finally {
      setMengirim(false);
    }
  }

  function tambahFile(daftar: FileList | null) {
    if (!daftar || daftar.length === 0) return;
    setFiles((cur) => [...cur, ...Array.from(daftar)]);
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.panel} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <div className={styles.headerInfo}>
            <strong>{namaVendor}</strong>
            <span>{namaTender}</span>
          </div>
          <button type="button" className={styles.closeButton} onClick={onClose} title="Tutup">
            <X size={18} />
          </button>
        </div>

        <div className={`${styles.statusBar} ${mailAktif ? styles.statusBarAktif : styles.statusBarNonaktif}`}>
          {mailAktif ? <Mail size={13} /> : <MailWarning size={13} />}
          {mailAktif
            ? "Terhubung ke email vendor lewat Mailgun"
            : "Mailgun belum dikonfigurasi — pesan tersimpan, belum terkirim ke email vendor"}
        </div>

        {error && <p className={styles.errorText}>{error}</p>}

        <div className={styles.body} ref={scrollRef}>
          {memuat ? (
            <p className={styles.emptyState}>Memuat percakapan...</p>
          ) : pesan.length === 0 ? (
            <div className={styles.emptyState}>
              <Mail size={28} />
              <p>Belum ada percakapan dengan vendor ini.</p>
              <span>Kirim pesan pertama di bawah — otomatis terkirim ke email vendor.</span>
            </div>
          ) : (
            pesan.map((p) => (
              <div key={p.id} className={p.arah === "KELUAR" ? styles.bubbleRowKeluar : styles.bubbleRowMasuk}>
                <div className={p.arah === "KELUAR" ? styles.bubbleKeluar : styles.bubbleMasuk}>
                  <span className={styles.bubbleSender}>
                    {p.arah === "KELUAR" ? p.pengirim?.name ?? "Staff" : namaVendor}
                  </span>
                  <p className={styles.bubbleText}>{p.isiPesan}</p>
                  {p.lampiran.length > 0 && (
                    <div className={styles.bubbleLampiran}>
                      {p.lampiran.map((file) => (
                        <a
                          key={file.id}
                          href={urlFileEprom(file.urlFile)}
                          target="_blank"
                          rel="noreferrer"
                          className={styles.lampiranChip}
                        >
                          <Paperclip size={11} /> {file.namaFile}
                        </a>
                      ))}
                    </div>
                  )}
                  <span className={styles.bubbleTime}>
                    {formatTanggalPendek(p.createdAt)} · {formatJam(p.createdAt)}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {files.length > 0 && (
          <div className={styles.filePreviewBar}>
            {files.map((file, index) => (
              <span key={`${file.name}-${index}`} className={styles.filePreviewChip}>
                {file.name}
                <button type="button" onClick={() => setFiles((cur) => cur.filter((_, i) => i !== index))}>
                  <X size={11} />
                </button>
              </span>
            ))}
          </div>
        )}

        <div className={styles.footer}>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className={styles.hiddenFileInput}
            onChange={(e) => tambahFile(e.target.files)}
          />
          <button
            type="button"
            className={styles.attachButton}
            onClick={() => fileInputRef.current?.click()}
            title="Lampirkan file"
          >
            <Paperclip size={17} />
          </button>
          <textarea
            className={styles.textarea}
            placeholder="Tulis pesan ke vendor..."
            value={isi}
            rows={1}
            onChange={(e) => setIsi(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                kirim();
              }
            }}
          />
          <button type="button" className={styles.sendButton} onClick={kirim} disabled={!bisaKirim} title="Kirim">
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
