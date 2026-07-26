"use client";

import {
  Check,
  Eraser,
  Loader2,
  PenLine,
  RefreshCw,
  Save,
  X,
} from "lucide-react";
import {
  PointerEvent as ReactPointerEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import styles from "./signature-picker-modal.module.css";

type SignatureItem = {
  name: string;
  filename: string;
  path: string;
};

type SignatureMode = "coordinator" | "supervisor";

type SignaturePickerModalProps = {
  open: boolean;
  mode: SignatureMode;
  selectedPath?: string;
  defaultName?: string;
  apiUrl: string;
  token: string;
  onClose: () => void;
  onSelect: (item: SignatureItem) => void;
};

function fileUrl(apiUrl: string, path: string) {
  if (!path) {
    return "";
  }

  if (
    path.startsWith("http://") ||
    path.startsWith("https://") ||
    path.startsWith("blob:")
  ) {
    return path;
  }

  return `${apiUrl.replace(/\/api\/?$/, "")}${path}`;
}

async function readError(response: Response) {
  const result = await response.json().catch(() => null);

  const message = Array.isArray(result?.message)
    ? result.message.join(", ")
    : result?.message;

  return message || "Proses tanda tangan gagal.";
}

export default function SignaturePickerModal({
  open,
  mode,
  selectedPath = "",
  defaultName = "",
  apiUrl,
  token,
  onClose,
  onSelect,
}: SignaturePickerModalProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);

  const [items, setItems] = useState<SignatureItem[]>([]);
  const [name, setName] = useState(defaultName);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [drawingMode, setDrawingMode] = useState(false);
  const [error, setError] = useState("");

  const endpoint = mode === "coordinator" ? "coordinators" : "supervisors";

  useEffect(() => {
    if (!open) {
      return;
    }

    setName(defaultName);
    setDrawingMode(mode === "coordinator");
    setError("");
    void loadItems();
  }, [open, mode, defaultName]);

  useEffect(() => {
    if (!open || !drawingMode) {
      return;
    }

    const canvas = canvasRef.current;

    if (!canvas) {
      return;
    }

    const rect = canvas.getBoundingClientRect();
    const scale = window.devicePixelRatio || 1;

    canvas.width = Math.max(1, Math.floor(rect.width * scale));
    canvas.height = Math.max(1, Math.floor(rect.height * scale));

    const context = canvas.getContext("2d");

    if (!context) {
      return;
    }

    context.scale(scale, scale);
    context.lineWidth = 2.5;
    context.lineCap = "round";
    context.lineJoin = "round";
    context.strokeStyle = "#111827";
    context.clearRect(0, 0, rect.width, rect.height);
  }, [open, drawingMode]);

  async function loadItems() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`${apiUrl}/signature-library/${endpoint}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error(await readError(response));
      }

      const result = (await response.json()) as SignatureItem[];

      setItems(Array.isArray(result) ? result : []);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Daftar tanda tangan gagal dimuat.",
      );
    } finally {
      setLoading(false);
    }
  }

  function canvasPoint(event: ReactPointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;

    if (!canvas) {
      return null;
    }

    const rect = canvas.getBoundingClientRect();

    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  }

  function startDrawing(event: ReactPointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    const point = canvasPoint(event);

    if (!canvas || !point) {
      return;
    }

    const context = canvas.getContext("2d");

    if (!context) {
      return;
    }

    drawingRef.current = true;
    canvas.setPointerCapture(event.pointerId);

    context.beginPath();
    context.moveTo(point.x, point.y);
  }

  function draw(event: ReactPointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current) {
      return;
    }

    const canvas = canvasRef.current;
    const point = canvasPoint(event);

    if (!canvas || !point) {
      return;
    }

    const context = canvas.getContext("2d");

    if (!context) {
      return;
    }

    context.lineTo(point.x, point.y);
    context.stroke();
  }

  function stopDrawing(event: ReactPointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;

    drawingRef.current = false;

    if (canvas && canvas.hasPointerCapture(event.pointerId)) {
      canvas.releasePointerCapture(event.pointerId);
    }
  }

  function clearCanvas() {
    const canvas = canvasRef.current;

    if (!canvas) {
      return;
    }

    const context = canvas.getContext("2d");

    if (!context) {
      return;
    }

    const rect = canvas.getBoundingClientRect();

    context.clearRect(0, 0, rect.width, rect.height);
  }

  async function saveCanvas() {
    const canvas = canvasRef.current;

    if (!canvas) {
      return;
    }

    if (!name.trim()) {
      setError("Nama koordinator wajib diisi.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(resolve, "image/png", 1);
      });

      if (!blob) {
        throw new Error("Tanda tangan gagal diproses.");
      }

      const formData = new FormData();
      formData.append("file", blob, `${name.trim()}.png`);
      formData.append("name", name.trim());

      const response = await fetch(`${apiUrl}/signature-library/coordinators`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error(await readError(response));
      }

      const result = (await response.json()) as {
        filename: string;
        path: string;
      };

      const item: SignatureItem = {
        name: name.trim(),
        filename: result.filename,
        path: result.path,
      };

      await loadItems();
      onSelect(item);
      onClose();
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Tanda tangan gagal disimpan.",
      );
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return null;
  }

  return (
    <div className={styles.backdrop}>
      <div className={styles.modal}>
        <header className={styles.header}>
          <div>
            <h2>
              {mode === "coordinator"
                ? "Tanda Tangan Koordinator"
                : "Tanda Tangan Pengawas"}
            </h2>

            <p>
              {mode === "coordinator"
                ? "Pilih tanda tangan tersimpan atau buat tanda tangan baru."
                : "Pilih tanda tangan pengawas yang tersedia."}
            </p>
          </div>

          <button
            type="button"
            className={styles.closeButton}
            onClick={onClose}
          >
            <X size={19} />
          </button>
        </header>

        {error && <div className={styles.error}>{error}</div>}

        <div className={styles.body}>
          {!drawingMode ? (
            <>
              <div className={styles.listHeader}>
                <strong>Daftar Tanda Tangan</strong>

                <button
                  type="button"
                  onClick={() => void loadItems()}
                  disabled={loading}
                >
                  <RefreshCw size={15} />
                  Muat Ulang
                </button>
              </div>

              {loading ? (
                <div className={styles.loading}>
                  <Loader2 className={styles.spinner} size={22} />
                  Memuat tanda tangan...
                </div>
              ) : (
                <div className={styles.signatureGrid}>
                  {items.map((item) => {
                    const active = selectedPath === item.path;

                    return (
                      <button
                        type="button"
                        key={item.path}
                        className={`${styles.signatureCard} ${
                          active ? styles.selectedCard : ""
                        }`}
                        onClick={() => {
                          onSelect(item);
                          onClose();
                        }}
                      >
                        <img src={fileUrl(apiUrl, item.path)} alt={item.name} />

                        <span>{item.name}</span>

                        {active && (
                          <i>
                            <Check size={14} />
                          </i>
                        )}
                      </button>
                    );
                  })}

                  {!items.length && (
                    <div className={styles.empty}>
                      Belum ada tanda tangan tersimpan.
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className={styles.canvasSection}>
              <label>
                <span>Nama Koordinator</span>
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Masukkan nama koordinator"
                />
              </label>

              <div className={styles.canvasWrapper}>
                <canvas
                  ref={canvasRef}
                  onPointerDown={startDrawing}
                  onPointerMove={draw}
                  onPointerUp={stopDrawing}
                  onPointerCancel={stopDrawing}
                  onPointerLeave={stopDrawing}
                />
              </div>

              <p className={styles.canvasHint}>
                Gunakan mouse atau sentuhan untuk membuat tanda tangan.
              </p>

              <div className={styles.canvasActions}>
                <button
                  type="button"
                  className={styles.clearButton}
                  onClick={clearCanvas}
                  disabled={saving}
                >
                  <Eraser size={17} />
                  Bersihkan
                </button>

                <button
                  type="button"
                  className={styles.saveButton}
                  onClick={() => void saveCanvas()}
                  disabled={saving}
                >
                  {saving ? (
                    <Loader2 className={styles.spinner} size={17} />
                  ) : (
                    <Save size={17} />
                  )}

                  {saving ? "Menyimpan..." : "Simpan Tanda Tangan"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
