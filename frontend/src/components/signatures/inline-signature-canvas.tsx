"use client";

import { Eraser, Loader2, Save, X } from "lucide-react";
import {
  PointerEvent as ReactPointerEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import styles from "./inline-signature-canvas.module.css";

type SavedSignature = {
  name: string;
  filename: string;
  path: string;
};

type InlineSignatureCanvasProps = {
  open: boolean;
  defaultName: string;
  apiUrl: string;
  token: string;
  onClose: () => void;
  onSaved: (item: SavedSignature) => void;
};

async function readError(response: Response) {
  const result = await response.json().catch(() => null);

  const message = Array.isArray(result?.message)
    ? result.message.join(", ")
    : result?.message;

  return message || "Tanda tangan gagal disimpan.";
}

export default function InlineSignatureCanvas({
  open,
  defaultName,
  apiUrl,
  token,
  onClose,
  onSaved,
}: InlineSignatureCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);

  const [name, setName] = useState(defaultName);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) {
      return;
    }

    setName(defaultName);
    setError("");

    const timeout = window.setTimeout(() => {
      prepareCanvas();
    }, 50);

    return () => window.clearTimeout(timeout);
  }, [open, defaultName]);

  function prepareCanvas() {
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

    context.setTransform(scale, 0, 0, scale, 0, 0);
    context.lineWidth = 2.5;
    context.lineCap = "round";
    context.lineJoin = "round";
    context.strokeStyle = "#111827";

    context.clearRect(0, 0, rect.width, rect.height);
  }

  function getPoint(event: ReactPointerEvent<HTMLCanvasElement>) {
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
    const point = getPoint(event);

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
    const point = getPoint(event);

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
    prepareCanvas();
  }

  async function saveSignature() {
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

      onSaved({
        name: name.trim(),
        filename: result.filename,
        path: result.path,
      });
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
    <div className={styles.panel}>
      <div className={styles.panelHeader}>
        <div>
          <strong>Buat Tanda Tangan Baru</strong>
          <span>Tanda tangan tersimpan otomatis masuk dropdown.</span>
        </div>

        <button type="button" onClick={onClose} title="Tutup canvas">
          <X size={17} />
        </button>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      <label className={styles.nameField}>
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

      <div className={styles.footer}>
        <span>Gunakan mouse atau sentuhan untuk tanda tangan.</span>

        <div>
          <button
            type="button"
            className={styles.clearButton}
            onClick={clearCanvas}
            disabled={saving}
          >
            <Eraser size={16} />
            Bersihkan
          </button>

          <button
            type="button"
            className={styles.saveButton}
            onClick={() => void saveSignature()}
            disabled={saving}
          >
            {saving ? (
              <Loader2 className={styles.spinner} size={16} />
            ) : (
              <Save size={16} />
            )}

            {saving ? "Menyimpan..." : "Simpan Tanda Tangan"}
          </button>
        </div>
      </div>
    </div>
  );
}
