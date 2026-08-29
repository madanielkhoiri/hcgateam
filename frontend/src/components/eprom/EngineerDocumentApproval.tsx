"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, RotateCcw, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { PDFDocumentProxy, RenderTask } from "pdfjs-dist";
import {
  epromApi,
  urlFileEprom,
  type EngineerApprovalDetail,
  type EngineerSignature,
  type TipeEngineer,
} from "@/lib/eprom-api";
import styles from "./engineer-document-approval.module.css";

type Placement = {
  id: string;
  signatureFile: string;
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
};

const DEFAULT_PLACEMENT: Pick<Placement, "x" | "y" | "width" | "height"> = {
  x: 0.64,
  y: 0.73,
  width: 0.25,
  height: 0.12,
};

function namaPekerjaan(detail: EngineerApprovalDetail): string {
  return (
    detail.item.namaPekerjaan ??
    detail.item.namaMaterial ??
    detail.item.namaMetode ??
    "-"
  );
}

function idPlacement(): string {
  return globalThis.crypto.randomUUID();
}

export function EngineerDocumentApproval({
  projectId,
  tipe,
  documentId,
}: {
  projectId: number;
  tipe: TipeEngineer;
  documentId: number;
}) {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const surfaceRef = useRef<HTMLDivElement>(null);
  const canvasAreaRef = useRef<HTMLDivElement>(null);
  const pdfRef = useRef<PDFDocumentProxy | null>(null);
  const [detail, setDetail] = useState<EngineerApprovalDetail | null>(null);
  const [signatures, setSignatures] = useState<EngineerSignature[]>([]);
  const [signatureFile, setSignatureFile] = useState("");
  const [placements, setPlacements] = useState<Placement[]>([]);
  const [selectedPlacementId, setSelectedPlacementId] = useState<string | null>(
    null,
  );
  const [page, setPage] = useState(1);
  const [pageCount, setPageCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [rendering, setRendering] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      epromApi.engineer.detailApproval(tipe, documentId),
      epromApi.engineer.daftarTandaTangan(),
    ])
      .then(([detailData, signatureData]) => {
        if (detailData.item.projectId !== projectId) {
          throw new Error("Dokumen tidak termasuk dalam project ini.");
        }
        setDetail(detailData);
        setSignatures(signatureData);
        setSignatureFile(signatureData[0]?.filename ?? "");
      })
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : "Gagal memuat approval"),
      )
      .finally(() => setLoading(false));
  }, [documentId, projectId, tipe]);

  const pdfUrl = detail?.item.effectiveFileUrl ?? detail?.item.fileUrl;

  useEffect(() => {
    if (!detail?.canSign || !pdfUrl) return;
    let active = true;

    async function loadPdf() {
      try {
        setRendering(true);
        const pdfjs = await import("pdfjs-dist");
        pdfjs.GlobalWorkerOptions.workerSrc = new URL(
          "pdfjs-dist/build/pdf.worker.min.mjs",
          import.meta.url,
        ).toString();
        const loaded = await pdfjs.getDocument(urlFileEprom(pdfUrl!)).promise;

        if (!active) {
          await loaded.destroy();
          return;
        }
        pdfRef.current = loaded;
        setPageCount(loaded.numPages);
        setPage(1);
      } catch {
        setError("Preview PDF gagal dimuat.");
      } finally {
        if (active) setRendering(false);
      }
    }

    void loadPdf();
    return () => {
      active = false;
      void pdfRef.current?.destroy?.();
      pdfRef.current = null;
    };
  }, [detail?.canSign, pdfUrl]);

  useEffect(() => {
    const pdf = pdfRef.current;
    const canvas = canvasRef.current;
    if (!pdf || !canvas || page < 1) return;
    const activePdf = pdf;
    const activeCanvas = canvas;
    let active = true;
    let renderTask: RenderTask | undefined;

    async function renderPage() {
      setRendering(true);
      const pdfPage = await activePdf.getPage(page);
      const viewport = pdfPage.getViewport({ scale: 1.5 });
      const context = activeCanvas.getContext("2d");
      if (!context || !active) return;
      activeCanvas.width = viewport.width;
      activeCanvas.height = viewport.height;
      renderTask = pdfPage.render({
        canvas: activeCanvas,
        canvasContext: context,
        viewport,
      });
      await renderTask.promise;
      if (active) setRendering(false);
    }

    void renderPage().catch((err: { name?: string }) => {
      if (active && err?.name !== "RenderingCancelledException") {
        setError("Halaman PDF gagal ditampilkan.");
        setRendering(false);
      }
    });
    return () => {
      active = false;
      renderTask?.cancel?.();
    };
  }, [page, pageCount]);

  function tempatkanTandaTangan() {
    if (!signatureFile) return;
    const placement: Placement = {
      id: idPlacement(),
      signatureFile,
      page,
      ...DEFAULT_PLACEMENT,
    };
    setPlacements((current) => [...current, placement]);
    setSelectedPlacementId(placement.id);
  }

  function tempatkanDiSemuaHalaman() {
    if (!signatureFile || pageCount < 1) return;
    const acuan =
      placements.find((item) => item.id === selectedPlacementId) ??
      DEFAULT_PLACEMENT;
    const tambahan = Array.from({ length: pageCount }, (_, index) => ({
      id: idPlacement(),
      signatureFile,
      page: index + 1,
      x: acuan.x,
      y: acuan.y,
      width: acuan.width,
      height: acuan.height,
    }));
    setPlacements((current) => [...current, ...tambahan]);
    setSelectedPlacementId(tambahan[page - 1]?.id ?? null);
  }

  function bukaHalaman(target: number) {
    const halaman = Math.max(1, Math.min(pageCount || 1, target));
    setPage(halaman);
    const padaHalaman = placements.filter((item) => item.page === halaman);
    setSelectedPlacementId(
      padaHalaman[padaHalaman.length - 1]?.id ?? null,
    );
    if (canvasAreaRef.current) canvasAreaRef.current.scrollTop = 0;
  }

  function hapusPlacementTerpilih() {
    if (!selectedPlacementId) return;
    setPlacements((current) =>
      current.filter((item) => item.id !== selectedPlacementId),
    );
    setSelectedPlacementId(null);
  }

  function hapusSemuaPlacement() {
    setPlacements([]);
    setSelectedPlacementId(null);
  }

  function samakanUkuranSemua() {
    const selected = placements.find(
      (item) => item.id === selectedPlacementId,
    );
    if (!selected) return;

    setPlacements((current) =>
      current.map((item) => ({
        ...item,
        x: Math.min(item.x, 1 - selected.width),
        y: Math.min(item.y, 1 - selected.height),
        width: selected.width,
        height: selected.height,
      })),
    );
  }

  function pindahkanTandaTangan(event: React.PointerEvent<HTMLDivElement>) {
    const placement = placements.find(
      (item) => item.id === selectedPlacementId && item.page === page,
    );
    if (!placement || !surfaceRef.current) return;
    if (event.button !== 0) return;

    const rect = surfaceRef.current.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const pointerX = (event.clientX - rect.left) / rect.width;
    const pointerY = (event.clientY - rect.top) / rect.height;

    setPlacements((current) =>
      current.map((item) =>
        item.id === placement.id
          ? {
              ...item,
              x: Math.max(
                0,
                Math.min(1 - item.width, pointerX - item.width / 2),
              ),
              y: Math.max(
                0,
                Math.min(1 - item.height, pointerY - item.height / 2),
              ),
            }
          : item,
      ),
    );
  }

  function mulaiGeser(
    event: React.PointerEvent,
    placementId: string,
    mode: "drag" | "resize",
  ) {
    const placement = placements.find((item) => item.id === placementId);
    if (!placement || !surfaceRef.current) return;
    event.preventDefault();
    event.stopPropagation();

    const captureTarget = event.currentTarget as HTMLElement;
    const pointerId = event.pointerId;
    const rect = surfaceRef.current.getBoundingClientRect();
    const scrollContainer = canvasAreaRef.current;
    const start = placement;
    const grabOffsetX = (event.clientX - rect.left) / rect.width - start.x;
    const grabOffsetY = (event.clientY - rect.top) / rect.height - start.y;

    captureTarget.setPointerCapture(pointerId);
    setSelectedPlacementId(placementId);

    function move(pointer: PointerEvent) {
      if (pointer.pointerId !== pointerId) return;
      pointer.preventDefault();

      if (scrollContainer) {
        const scrollRect = scrollContainer.getBoundingClientRect();
        const batasScroll = 56;

        if (pointer.clientY > scrollRect.bottom - batasScroll) {
          scrollContainer.scrollTop += 18;
        } else if (pointer.clientY < scrollRect.top + batasScroll) {
          scrollContainer.scrollTop -= 18;
        }
      }

      // Posisi halaman berubah ketika viewer ikut scroll. Baca ulang rect supaya
      // koordinat pointer selalu dihitung terhadap halaman yang sedang terlihat.
      const currentSurface = surfaceRef.current;
      if (!currentSurface) return;
      const currentRect = currentSurface.getBoundingClientRect();
      if (!currentRect.width || !currentRect.height) return;
      const pointerX = (pointer.clientX - currentRect.left) / currentRect.width;
      const pointerY = (pointer.clientY - currentRect.top) / currentRect.height;

      setPlacements((current) =>
        current.map((item) => {
          if (item.id !== placementId) return item;
          if (mode === "drag") {
            return {
              ...start,
              x: Math.max(
                0,
                Math.min(1 - start.width, pointerX - grabOffsetX),
              ),
              y: Math.max(
                0,
                Math.min(1 - start.height, pointerY - grabOffsetY),
              ),
            };
          }

          const scaleX = (pointerX - start.x) / start.width;
          const scaleY = (pointerY - start.y) / start.height;
          const requestedScale =
            scaleX < 1 || scaleY < 1
              ? Math.min(scaleX, scaleY)
              : Math.max(scaleX, scaleY);
          const minimumScale = Math.max(
            0.08 / start.width,
            0.04 / start.height,
          );
          const maximumScale = Math.min(
            (1 - start.x) / start.width,
            (1 - start.y) / start.height,
          );
          const scale = Math.max(
            minimumScale,
            Math.min(maximumScale, requestedScale),
          );

          return {
            ...start,
            width: start.width * scale,
            height: start.height * scale,
          };
        }),
      );
    }

    function selesai(pointer: PointerEvent) {
      if (pointer.pointerId !== pointerId) return;
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", selesai);
      window.removeEventListener("pointercancel", selesai);

      if (captureTarget.hasPointerCapture(pointerId)) {
        captureTarget.releasePointerCapture(pointerId);
      }
    }

    window.addEventListener("pointermove", move, { passive: false });
    window.addEventListener("pointerup", selesai);
    window.addEventListener("pointercancel", selesai);
  }

  async function approve() {
    if (placements.length < 1) return;
    setSubmitting(true);
    setError(null);
    try {
      await epromApi.engineer.approveDenganTandaTangan(tipe, documentId, {
        placements: placements.map((placement) => ({
          signatureFile: placement.signatureFile,
          signaturePage: placement.page,
          signatureXRatio: placement.x,
          signatureYRatio: placement.y,
          signatureWidthRatio: placement.width,
          signatureHeightRatio: placement.height,
        })),
      });
      window.dispatchEvent(new Event("eprom-engineer-updated"));
      router.push(`/civil/project/engineer/${projectId}?tab=${tipe}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Approval gagal diproses");
    } finally {
      setSubmitting(false);
    }
  }

  async function approveTanpaTtd() {
    if (!confirm("Approve dokumen ini tanpa menempel tanda tangan?")) return;
    setSubmitting(true);
    setError(null);
    try {
      await epromApi.engineer.approveTanpaTandaTangan(tipe, documentId);
      window.dispatchEvent(new Event("eprom-engineer-updated"));
      router.push(`/civil/project/engineer/${projectId}?tab=${tipe}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Approval gagal diproses");
    } finally {
      setSubmitting(false);
    }
  }

  const selectedPlacement = placements.find(
    (item) => item.id === selectedPlacementId,
  );
  const backUrl = `/civil/project/engineer/${projectId}?tab=${tipe}`;

  if (loading)
    return <p className={styles.stateText}>Memuat Review & Approval...</p>;
  if (!detail) {
    return (
      <div className={styles.stateText}>
        <p>{error ?? "Dokumen tidak ditemukan."}</p>
        <Link href={backUrl}>Kembali</Link>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <Link href={backUrl} className={styles.backLink}>
        ← Kembali ke {detail.documentLabel}
      </Link>

      <header className={styles.header}>
        <div>
          <span>Review &amp; Approval</span>
          <h1>{detail.project.namaProject}</h1>
          <p>{detail.documentLabel}</p>
        </div>
        <span className={styles.status}>{detail.item.status}</span>
      </header>

      <section className={styles.infoGrid}>
        <div>
          <span>Project</span>
          <strong>{detail.project.namaProject}</strong>
        </div>
        <div>
          <span>Kontrak</span>
          <strong>
            {detail.project.kontrak.nomorKontrak} —{" "}
            {detail.project.kontrak.vendor.namaVendor}
          </strong>
        </div>
        <div>
          <span>Jenis Dokumen</span>
          <strong>{detail.documentLabel}</strong>
        </div>
        <div>
          <span>Nama Pekerjaan</span>
          <strong>{namaPekerjaan(detail)}</strong>
        </div>
        <div>
          <span>File</span>
          <strong>
            {detail.item.originalFileName ?? detail.item.fileUrl ?? "-"}
          </strong>
        </div>
        <div>
          <span>Tanggal Upload</span>
          <strong>
            {new Date(detail.item.createdAt).toLocaleString("id-ID")}
          </strong>
        </div>
      </section>

      {error && <p className={styles.error}>{error}</p>}

      {!detail.canSign ? (
        <section className={styles.unsupported}>
          <h2>Dokumen tidak dapat ditandatangani</h2>
          <p>Tanda tangan hanya dapat ditempatkan pada dokumen PDF. Dokumen ini tetap bisa di-approve tanpa tanda tangan lewat tombol di bawah.</p>
          {pdfUrl && (
            <a href={urlFileEprom(pdfUrl)} target="_blank" rel="noreferrer">
              Lihat / unduh file
            </a>
          )}
        </section>
      ) : (
        <>
          <section className={styles.viewerPanel}>
            <div className={styles.viewerToolbar}>
              <button
                type="button"
                onClick={() => bukaHalaman(page - 1)}
                disabled={page <= 1}
              >
                <ChevronLeft size={16} />
              </button>
              <label className={styles.pageJump}>
                Halaman
                <input
                  type="number"
                  min={1}
                  max={pageCount || 1}
                  value={page}
                  onChange={(event) => bukaHalaman(Number(event.target.value))}
                />
                dari {pageCount || "..."}
              </label>
              <button
                type="button"
                onClick={() => bukaHalaman(page + 1)}
                disabled={!pageCount || page >= pageCount}
              >
                <ChevronRight size={16} />
              </button>
              {rendering && <small>Memuat halaman...</small>}
            </div>

            <div ref={canvasAreaRef} className={styles.canvasArea}>
              <div
                ref={surfaceRef}
                className={styles.pageSurface}
                onPointerDown={pindahkanTandaTangan}
                title={
                  selectedPlacement?.page === page
                    ? "Klik pada PDF untuk memindahkan tanda tangan"
                    : undefined
                }
              >
                <canvas ref={canvasRef} className={styles.canvas} />
                {placements
                  .filter((placement) => placement.page === page)
                  .map((placement) => {
                    const signature = signatures.find(
                      (item) => item.filename === placement.signatureFile,
                    );
                    if (!signature) return null;
                    const active = placement.id === selectedPlacementId;

                    return (
                      <div
                        key={placement.id}
                        className={`${styles.signatureOverlay} ${
                          active ? styles.signatureOverlayActive : ""
                        }`}
                        style={{
                          left: `${placement.x * 100}%`,
                          top: `${placement.y * 100}%`,
                          width: `${placement.width * 100}%`,
                          height: `${placement.height * 100}%`,
                        }}
                        onPointerDown={(event) =>
                          mulaiGeser(event, placement.id, "drag")
                        }
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={urlFileEprom(signature.path)}
                          alt={`Tanda tangan ${signature.name}`}
                          draggable={false}
                        />
                        {active && (
                          <button
                            type="button"
                            aria-label="Ubah ukuran tanda tangan"
                            onPointerDown={(event) => {
                              event.stopPropagation();
                              mulaiGeser(event, placement.id, "resize");
                            }}
                          />
                        )}
                      </div>
                    );
                  })}
              </div>
            </div>
          </section>

          <section className={styles.controls}>
            <label>
              Pilih Tanda Tangan
              <select
                value={signatureFile}
                onChange={(event) => setSignatureFile(event.target.value)}
              >
                {signatures.length === 0 && (
                  <option value="">Tidak ada tanda tangan tersedia</option>
                )}
                {signatures.map((signature) => (
                  <option key={signature.filename} value={signature.filename}>
                    {signature.name}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={tempatkanTandaTangan}
              disabled={!signatureFile}
            >
              Tambah di Halaman Ini
            </button>
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={tempatkanDiSemuaHalaman}
              disabled={!signatureFile || !pageCount}
            >
              Tambah di Semua Halaman
            </button>
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={samakanUkuranSemua}
              disabled={!selectedPlacement || placements.length < 2}
            >
              Samakan Ukuran Semua
            </button>
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={hapusPlacementTerpilih}
              disabled={!selectedPlacementId}
            >
              <Trash2 size={14} /> Hapus Terpilih
            </button>
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={hapusSemuaPlacement}
              disabled={placements.length === 0}
            >
              <RotateCcw size={14} /> Hapus Semua
            </button>
            <p className={styles.placementSummary}>
              {placements.length} tanda tangan pada{" "}
              {new Set(placements.map((item) => item.page)).size} halaman
            </p>
          </section>
        </>
      )}

      <footer className={styles.actions}>
        <Link href={backUrl} className={styles.secondaryButton}>
          Kembali
        </Link>
        <button
          type="button"
          className={styles.secondaryButton}
          onClick={approveTanpaTtd}
          disabled={submitting || detail.item.status !== "PENDING"}
        >
          {submitting ? "Memproses..." : "Approve Tanpa Tanda Tangan"}
        </button>
        <button
          type="button"
          className={styles.approveButton}
          onClick={approve}
          disabled={
            !detail.canSign ||
            placements.length === 0 ||
            submitting ||
            detail.item.status !== "PENDING"
          }
        >
          {submitting ? "Memproses PDF..." : "Approve & Tanda Tangani"}
        </button>
      </footer>
    </div>
  );
}
