"use client";
import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Plus, Printer, Save, Trash2, Upload } from "lucide-react";
import {
  epromApi,
  formatRupiah,
  urlFileEprom,
  type TenderEvaluationData,
  type TenderEvaluationReport,
} from "@/lib/eprom-api";

const gateNames = [
  ["admin", "Company Profile"],
  ["hse", "Surat Pernyataan Komitmen K3 / SHE"],
] as const;
const questions = [
  ["method", "Dapat mempresentasikan metode kerja"],
  ["hsePresentation", "Bisa menjelaskan rencana pengendalian K3"],
  ["finance", "Dapat mempresentasikan kapasitas finansialnya"],
  ["warranty", "Dapat memberikan garansi"],
  ["experience", "Dapat mempresentasikan pengalaman project"],
  ["boq", "Dapat menguasai item-item pekerjaan yang sedang ditenderkan"],
  [
    "organization",
    "Dapat menjelaskan rencana struktur organisasi project nanti",
  ],
  ["equipmentReadiness", "Dapat menjelaskan kesiapan peralatan kerja dan sumber daya"],
  ["workSchedule", "Dapat mempresentasikan jadwal dan tahapan pelaksanaan pekerjaan"],
  ["mobilization", "Dapat menjelaskan rencana mobilisasi manpower, material, dan peralatan"],
  ["riskMitigation", "Dapat mengidentifikasi risiko dan kendala pekerjaan beserta solusi penanganannya"],
  ["progressReporting", "Dapat menjelaskan sistem koordinasi, komunikasi, dan pelaporan progres pekerjaan"],
] as const;
const weights = [
  ["Bagian C", 20],
  ["Bagian D", 40],
  ["Harga", 30],
  ["Durasi", 10],
] as const;
const empty: TenderEvaluationData = {
  response: "",
  sphRounds: [
    { deadline: "", receivedAt: "", value: undefined, verification: "pending" },
  ],
  presentation: {},
  recommendationStatus: "",
};
const normalizeEvaluation = (
  value?: TenderEvaluationData | null,
): TenderEvaluationData => {
  const normalized = { ...empty, ...(value || {}) };
  for (const key of ["adminScore", "hseScore"] as const) {
    if (Number(normalized[key]) > 10) normalized[key] = Number(normalized[key]) / 10;
  }
  return ({
  ...normalized,
  sphRounds:
    Array.isArray(value?.sphRounds) && value.sphRounds.length > 0
      ? value.sphRounds
      : [{ deadline: "", receivedAt: "", value: undefined, verification: "pending" }],
  presentation: value?.presentation || {},
  });
};
const box: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #efd9c4",
  borderRadius: 20,
  padding: 24,
  marginBottom: 16,
  boxShadow: "0 1px 2px rgba(60,30,10,.04),0 10px 28px rgba(90,45,10,.07)",
};
const input: React.CSSProperties = {
  width: "100%",
  height: 48,
  padding: "0 14px",
  border: "1.5px solid #f0cfae",
  borderRadius: 14,
  background: "#fffaf5",
  color: "#2a1a0e",
  fontWeight: 600,
  fontSize: 14,
};
const grid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))",
  gap: 13,
};
const metric: React.CSSProperties = {
  background: "linear-gradient(135deg,#ffedd5,#fff7ed)",
  padding: 16,
  border: "1px solid #fed7aa",
  borderRadius: 16,
};
const btn: React.CSSProperties = {
  border: "1.5px solid #efd9c4",
  background: "#fff",
  padding: "10px 16px",
  borderRadius: 12,
  cursor: "pointer",
  fontWeight: 700,
  color: "#2a1a0e",
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
};
const primary: React.CSSProperties = {
  ...btn,
  background: "linear-gradient(135deg,#ea580c,#c2410c)",
  borderColor: "#c2410c",
  color: "#fff",
  boxShadow: "0 8px 18px rgba(194,65,12,.28)",
};
const scaleColor = (v: number) => (v <= 3 ? "#dc2626" : v <= 6 ? "#ca8a04" : v <= 8 ? "#65a30d" : "#16a34a");
const levelWord = (v: number) => (v <= 3 ? "Kurang" : v <= 6 ? "Cukup" : v <= 8 ? "Baik" : "Sangat baik");
const scaleStyle = (value: number | null, n: number): React.CSSProperties => {
  const base: React.CSSProperties = { height: 42, borderRadius: 12, cursor: "pointer", fontSize: 14, fontWeight: 800, transition: "all .12s" };
  if (value === n) {
    const c = scaleColor(n);
    return { ...base, border: 0, background: `linear-gradient(160deg,${c},${c}cc)`, color: "#fff", boxShadow: `0 8px 16px ${c}55`, transform: "translateY(-2px) scale(1.06)" };
  }
  if (value !== null && n < value) {
    const c = scaleColor(n);
    return { ...base, border: `1.5px solid ${c}55`, background: `${c}1f`, color: c };
  }
  const c = scaleColor(n);
  return { ...base, border: `1.5px solid ${c}55`, background: "#fff", color: c };
};
const scoreColor100 = (v: number) => (v <= 30 ? "#dc2626" : v <= 60 ? "#ca8a04" : v <= 80 ? "#65a30d" : "#16a34a");
const n = (x: any) =>
  x === "" || x === null || x === undefined ? null : Number(x);
const ontime = (r: any) =>
  !r.deadline || !r.receivedAt
    ? null
    : new Date(r.receivedAt) <= new Date(r.deadline);
const finalPrice = (d: TenderEvaluationData) => {
  const last = (d.sphRounds || []).at(-1);
  return last?.verification === "yes" &&
    n(last.value) !== null &&
    Number(last.value) > 0
    ? Number(last.value)
    : null;
};
const gate = (v: any) => {
  const states = gateNames.map(([id]) => {
    const score = n((v.data as any)[`${id}Score`]);
    return score === null ||
      !Number.isInteger(score) ||
      score < 1 ||
      score > 10
      ? "pending"
      : score >= 7
        ? "pass"
        : "fail";
  });
  return states.includes("fail")
    ? "fail"
    : states.every((x) => x === "pass")
      ? "pass"
      : "pending";
};
const pill = (label: string, color: string) => (
  <span
    style={{
      display: "inline-block",
      padding: "3px 9px",
      borderRadius: 15,
      fontSize: 11,
      fontWeight: 800,
      background:
        color === "good" ? "#e0f5e9" : color === "bad" ? "#ffebed" : "#fff1d6",
      color:
        color === "good" ? "#166e43" : color === "bad" ? "#a72c3b" : "#8b5b07",
    }}
  >
    {label}
  </span>
);
export function TenderEvaluationForm({
  tenderId,
  canSetWinner = false,
}: {
  tenderId: number;
  styles?: Record<string, string>;
  canSetWinner?: boolean;
}) {
  const [report, setReport] = useState<TenderEvaluationReport | null>(null),
    [selected, setSelected] = useState<number | null>(null),
    [drafts, setDrafts] = useState<Record<number, TenderEvaluationData>>({}),
    [config, setConfig] = useState<Record<string, any>>({}),
    [adminDrafts, setAdminDrafts] = useState<Record<number, File[]>>({}),
    [hseDrafts, setHseDrafts] = useState<Record<number, File[]>>({}),
    [saving, setSaving] = useState(false),
    [error, setError] = useState(""),
    [tab, setTab] = useState<string>(canSetWinner ? "ranking" : "C");
  const load = () =>
    epromApi.tender.evaluasiVendor
      .daftar(tenderId)
      .then((r) => {
        setReport(r);
        setConfig(r.config || {});
        const id = selected ?? r.vendors[0]?.vendorId ?? null;
        setDrafts((current) => {
          const next = { ...current };
          r.vendors.forEach((vendor) => {
            if (!next[vendor.vendorId])
              next[vendor.vendorId] = normalizeEvaluation(vendor.data);
          });
          return next;
        });
        setSelected((current) => current ?? id);
      })
      .catch((e) => setError(e.message));
  useEffect(() => {
    void load();
  }, [tenderId]);
  const vendor = report?.vendors.find((v) => v.vendorId === selected);
  const myFinal = vendor?.myEvaluation?.status === "FINAL";
  const admin = selected === null ? [] : adminDrafts[selected] || [];
  const hse = selected === null ? [] : hseDrafts[selected] || [];
  const setAdmin = (updater: File[] | ((current: File[]) => File[])) => {
    if (selected === null) return;
    setAdminDrafts((all) => ({ ...all, [selected]: typeof updater === "function" ? updater(all[selected] || []) : updater }));
  };
  const setHse = (updater: File[] | ((current: File[]) => File[])) => {
    if (selected === null) return;
    setHseDrafts((all) => ({ ...all, [selected]: typeof updater === "function" ? updater(all[selected] || []) : updater }));
  };
  // Sumber tunggal isian = drafts per vendor. Berpindah vendor tidak menyentuh
  // isian vendor lain, sehingga ketikan/pilihan tidak hilang.
  const data: TenderEvaluationData =
    selected === null
      ? empty
      : drafts[selected] ?? normalizeEvaluation(vendor?.data);
  const updateData = (updater: (current: TenderEvaluationData) => TenderEvaluationData) => {
    if (selected === null) return;
    const id = selected;
    const dasar = normalizeEvaluation(report?.vendors.find((x) => x.vendorId === id)?.data);
    setDrafts((all) => ({ ...all, [id]: updater(all[id] ?? dasar) }));
  };
  const set = (k: keyof TenderEvaluationData, v: any) =>
    updateData((d) => ({ ...d, [k]: v }));
  const choose = (id: number) => setSelected(id);
  // Data objektif (SPH, durasi, respons, manpower) memakai isian terbaru di
  // draf, sehingga ranking/sidebar tidak "kosong" sebelum disimpan.
  const mergeDraft = (v: { aggregateData?: any; data: any; vendorId: number }) => {
    const base = v.aggregateData || v.data;
    const draf = drafts[v.vendorId] as any;
    if (!draf || !canSetWinner) return base;
    const over: Record<string, unknown> = {};
    for (const k of ["invitationDate", "responseDate", "response", "sphRounds", "finalSph", "durationDays", "manpowerOffered", "localWorkers", "nonLocalWorkers"])
      if (draf[k] !== undefined) over[k] = draf[k];
    return { ...base, ...over };
  };
  const results = useMemo(() => {
    if (!report) return [];
    const participants = report.vendors.filter((v) => {
      const draft = mergeDraft(v);
      return draft.response !== "tidak";
    });
    const priceDurationReady = participants.length > 0 && participants.every((v) => {
      const draft = mergeDraft(v);
      return finalPrice(draft) !== null && Number(draft.durationDays) > 0;
    });
    const pool = participants.filter((v) => {
      const draft = mergeDraft(v);
      return finalPrice(draft) !== null && Number(draft.durationDays) > 0;
    });
    const minP = priceDurationReady && pool.length
        ? Math.min(...pool.map((v) => finalPrice(mergeDraft(v))!))
        : null,
      minD = priceDurationReady && pool.length
        ? Math.min(...pool.map((v) => Number((mergeDraft(v)).durationDays)))
        : null;
    return report.vendors
      .map((v) => {
        const d = mergeDraft(v),
          price = finalPrice(d),
          rounds = d.sphRounds || [],
          pres = questions.map(([k]) => {
            const raw = (d.presentation as any)?.[k];
            return raw === true ? 10 : raw === false ? 1 : Number(raw);
          }),
          present = pres.every((x) => Number.isInteger(x) && x >= 1 && x <= 10)
            ? pres.reduce((sum, value) => sum + value, 0) / (questions.length * 10)
            : null,
          cScores = gateNames.map(([id]) => n((d as any)[`${id}Score`])),
          cScore = cScores.every((x) => x !== null && Number.isInteger(x) && x! >= 1 && x! <= 10)
            ? cScores.reduce<number>((sum, value) => sum + Number(value), 0) / (gateNames.length * 10)
            : null;
        const parts: any = {
          "Bagian C": cScore,
          "Bagian D": present,
          Harga: minP !== null && price !== null ? minP / price : null,
          Durasi:
            minD !== null && Number(d.durationDays) > 0
              ? minD / Number(d.durationDays)
              : null,
        };
        const missing = weights.filter(
          ([k]) => parts[k] === null || !Number.isFinite(parts[k]),
        );
        const eligible = priceDurationReady && d.response === "ikut" &&
          price !== null &&
          Number(d.durationDays) > 0;
        const score =
          eligible && !missing.length
            ? weights.reduce((s, [k, w]) => s + parts[k] * w, 0)
            : null;
        const available = weights.filter(([k]) => parts[k] !== null && Number.isFinite(parts[k]));
        const availableWeight = available.reduce((sum, [, weight]) => sum + weight, 0);
        const provisionalScore = availableWeight
          ? available.reduce((sum, [k, weight]) => sum + parts[k] * weight, 0) / availableWeight * 100
          : null;
        return {
          ...v,
          data: d,
          price,
          status: gate({ ...v, data: d }),
          parts,
          score,
          provisionalScore,
          provisionalEligible: d.response !== "tidak" && provisionalScore !== null,
        };
      })
      .sort((a, b) => (b.score ?? (b.provisionalEligible ? b.provisionalScore! : -1)) - (a.score ?? (a.provisionalEligible ? a.provisionalScore! : -1)));
  }, [report, selected, data, config, drafts]);
  const qualified = results.filter((r) => r.score !== null),
    provisional = results.filter((r) => r.score === null && r.provisionalEligible),
    // Peringkat 1..N untuk semua vendor yang ikut dan sudah punya nilai
    // (lengkap maupun sementara), urut dari nilai tertinggi.
    ranked = results.filter((r) => r.score !== null || r.provisionalEligible),
    leader = ranked[0],
    current = results.find((r) => r.vendorId === selected);
  const save = async () => {
    if (!selected) return;
    setSaving(true);
    setError("");
    try {
      const adjusted = { ...data, finalSph: finalPrice(data) ?? undefined };
      const r = await epromApi.tender.evaluasiVendor.ubah(
        tenderId,
        selected,
        adjusted,
        config,
        admin,
        hse,
      );
      setReport(r);
      const saved = normalizeEvaluation(
        r.vendors.find((v) => v.vendorId === selected)?.data || adjusted,
      );
      setDrafts((all) => ({ ...all, [selected]: saved }));
      setAdminDrafts((all) => ({ ...all, [selected]: [] }));
      setHseDrafts((all) => ({ ...all, [selected]: [] }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal menyimpan");
    } finally {
      setSaving(false);
    }
  };
  const finalizeMyEvaluation = async () => {
    if (!selected || myFinal) return;
    setSaving(true);
    setError("");
    try {
      const adjusted = { ...data, finalSph: finalPrice(data) ?? undefined };
      await epromApi.tender.evaluasiVendor.ubah(tenderId, selected, adjusted, config, admin, hse);
      const refreshed = await epromApi.tender.evaluasiVendor.finalisasi(tenderId, selected);
      setReport(refreshed);
      const mine = normalizeEvaluation(refreshed.vendors.find((v) => v.vendorId === selected)?.data);
      setDrafts((all) => ({ ...all, [selected]: mine }));
      setAdminDrafts((all) => ({ ...all, [selected]: [] }));
      setHseDrafts((all) => ({ ...all, [selected]: [] }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal memfinalisasi penilaian");
    } finally {
      setSaving(false);
    }
  };
  const finalizeTender = async () => {
    if (!selected || !report) return;
    const dasar = config.decision || { vendorId: leader?.vendorId ? String(leader.vendorId) : "", approver: "", reference: "", reason: "" };
    const chosen = results.find((r) => String(r.vendorId) === String(dasar.vendorId || leader?.vendorId));
    // Pemenang bebas dipilih; jalur dicatat otomatis (sesuai ranking 1 atau keputusan khusus).
    const decision = { ...dasar, vendorId: chosen ? String(chosen.vendorId) : "", mode: chosen && chosen.vendorId === leader?.vendorId ? "fair" : "management" };
    if (!chosen) return setError("Pilih vendor yang ditetapkan.");
    if (chosen.data.response === "tidak") return setError("Vendor yang tidak mengikuti tender tidak dapat ditetapkan sebagai pemenang.");
    if (finalPrice(chosen.data) === null || Number(chosen.data.durationDays) <= 0) return setError("Vendor terpilih wajib memiliki SPH sah dan durasi pekerjaan.");
    if (!String(decision.approver || "").trim()) return setError("Nama penetap / pemberi persetujuan wajib diisi.");
    const peserta = results.filter((r) => r.data.response !== "tidak");
    if (!peserta.length || !peserta.every((r) => r.score !== null))
      return setError("Finalisasi menunggu seluruh peserta yang ikut tender memiliki nilai lengkap C, D, Harga, dan Durasi. Dokumen upload tidak wajib.");
    const top = results.find((r) => r.score !== null);
    if (!confirm(`Finalkan ${chosen.namaVendor} melalui jalur ${decision.mode === "fair" ? "hasil evaluasi objektif" : "keputusan khusus manajemen"}?\nRanking objektif akan tetap disimpan.`)) return;
    const nextConfig = { ...config, decision, finalDecision: { ...decision, vendorName: chosen.namaVendor, score: chosen.score, objectiveWinner: top?.namaVendor ?? null, objectiveScore: top?.score ?? null, timestamp: new Date().toISOString() } };
    setSaving(true); setError("");
    try {
      for (const row of report.vendors) {
        const vendorData = drafts[row.vendorId] || row.data;
        await epromApi.tender.evaluasiVendor.ubah(
          tenderId,
          row.vendorId,
          { ...vendorData, finalSph: finalPrice(vendorData) ?? undefined },
          nextConfig,
          adminDrafts[row.vendorId] || [],
          hseDrafts[row.vendorId] || [],
        );
      }
      await epromApi.tender.tetapkanPemenang(tenderId, chosen.vendorId);
      const refreshed = await epromApi.tender.evaluasiVendor.daftar(tenderId);
      setConfig(refreshed.config || nextConfig);
      setReport(refreshed);
      setDrafts(Object.fromEntries(refreshed.vendors.map((row) => [row.vendorId, normalizeEvaluation(row.data)])));
      setAdminDrafts({});
      setHseDrafts({});
    } catch (e) { setError(e instanceof Error ? e.message : "Gagal memfinalkan keputusan"); }
    finally { setSaving(false); }
  };
  const pdf = async () => {
    const { blob } = await epromApi.tender.evaluasiVendor.pdf(tenderId);
    window.open(URL.createObjectURL(blob), "_blank");
  };
  const removeEvidence = async (jenis: "admin" | "hse", index: number) => {
    if (!selected || !confirm("Hapus dokumen ini?")) return;
    try {
      const r = await epromApi.tender.evaluasiVendor.hapusDokumen(
        tenderId,
        selected,
        jenis,
        index,
      );
      setReport(r);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal menghapus dokumen");
    }
  };
  if (!report) return <p>{error || "Memuat evaluasi..."}</p>;
  const locked = report.locked;
  const rounds = data.sphRounds || [];
  const validPrice = finalPrice(data),
    known = rounds.filter((r) => ontime(r) !== null),
    local = n(data.localWorkers),
    non = n(data.nonLocalWorkers),
    off = n(data.manpowerOffered),
    total =
      local !== null && non !== null && local >= 0 && non >= 0
        ? local + non
        : null;
  return (
    <div style={{ color: "#162b48" }}>
      <header
        style={{
          position: "relative",
          overflow: "hidden",
          background: "linear-gradient(120deg,#9a3412 0%,#c2410c 45%,#f97316 100%)",
          color: "#fff",
          padding: "24px 28px",
          borderRadius: 24,
          boxShadow: "0 16px 36px rgba(194,65,12,.28)",
          display: "flex",
          flexWrap: "wrap",
          gap: 18,
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 16,
        }}
      >
        <div style={{ position: "absolute", right: -60, top: -90, width: 260, height: 260, borderRadius: "50%", background: "rgba(255,255,255,.08)" }} />
        <div style={{ position: "relative", flex: "1 1 380px", minWidth: 260 }}>
          <h1 style={{ fontSize: 28, margin: 0, fontWeight: 800, letterSpacing: "-0.02em", color: "#fff" }}>
            {config.packageName || report.namaTender}
          </h1>
          <p style={{ margin: "6px 0 10px", opacity: 0.92, fontWeight: 500 }}>
            Evaluasi Tender & Rekomendasi Pemenang
          </p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontSize: 12, fontWeight: 700, padding: "6px 12px", borderRadius: 999, background: "rgba(60,20,4,.38)" }}>
              ✓ {report.evaluators?.length || 0} penilai sudah final
            </span>
            <span style={{ fontSize: 12, fontWeight: 700, padding: "6px 12px", borderRadius: 999, background: "rgba(60,20,4,.38)" }}>
              Bobot C 20% · D 40% · Harga 30% · Durasi 10%
            </span>
          </div>
        </div>
        <div style={{ position: "relative", display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button style={{ ...btn, background: "rgba(255,255,255,.14)", borderColor: "rgba(255,255,255,.55)", color: "#fff" }} onClick={pdf}>
            <Printer size={14} /> Cetak / PDF
          </button>
          <button style={{ ...btn, background: "#fff", borderColor: "#fff", color: "#9a3412", fontWeight: 800 }} onClick={save} disabled={saving || locked || myFinal}>
            <Save size={14} /> {saving ? "Menyimpan..." : "Simpan"}
          </button>
          <button style={{ ...btn, background: "#2a1a0e", borderColor: "#2a1a0e", color: "#fff", fontWeight: 800 }} onClick={finalizeMyEvaluation} disabled={saving || locked || myFinal}>
            <CheckCircle2 size={14} /> {myFinal ? "Penilaian Sudah Final" : "Finalkan Penilaian Saya"}
          </button>
        </div>
      </header>
      {locked && (
        <div style={{ ...box, color: "#08783f", background: "#e9f8ef", borderColor: "#a8dfbd" }}>
          <b>Evaluasi telah dikunci.</b> Pemenang tender sudah ditetapkan kepada <b>{report.pemenang?.namaVendor || config.finalDecision?.vendorName || "vendor terpilih"}</b>. Seluruh nilai, SPH, dan dokumen evaluasi hanya dapat dilihat dan tidak dapat diubah lagi.
        </div>
      )}
      {!locked && (
        <div style={{ ...box, background: "#ffedd5", borderColor: "#fed7aa", fontSize: 13, padding: 16 }}>
          <b>{report.evaluators?.length || 0} penilai sudah final.</b> Ranking memakai rata-rata nilai dari akun yang telah memfinalkan penilaian. Tender tetap dapat diputuskan tanpa menunggu lima penilai.
          {!canSetWinner && <><br />Anda mengisi Bagian C dan D. Data tender bersama pada Bagian A, B, dan E hanya dapat dilihat.</>}
        </div>
      )}
      {error && <div style={{ ...box, color: "#a72c3b" }}>{error}</div>}
      <div
        className="evaluation-layout"
        style={{
          display: "grid",
          gridTemplateColumns: "260px minmax(0,1fr) 300px",
          gap: 16,
          alignItems: "start",
        }}
      >
        <aside
          className="evaluation-aside"
          style={{ position: "sticky", top: 14, display: "flex", flexDirection: "column", gap: 10 }}
        >
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: ".1em", color: "#7a6450", textTransform: "uppercase", padding: "0 4px" }}>
            Vendor peserta · urut ranking
          </div>
          {[...report.vendors].sort((x, y) => {
            const ix = ranked.findIndex((q) => q.vendorId === x.vendorId), iy = ranked.findIndex((q) => q.vendorId === y.vendorId);
            return (ix < 0 ? 999 : ix) - (iy < 0 ? 999 : iy);
          }).map((v) => {
            const pos = ranked.findIndex((q) => q.vendorId === v.vendorId);
            const res = results.find((q) => q.vendorId === v.vendorId);
            const skor = res ? (res.score ?? res.provisionalScore) : null;
            const aktif = v.vendorId === selected;
            const belumSimpan = drafts[v.vendorId] && JSON.stringify(drafts[v.vendorId]) !== JSON.stringify(normalizeEvaluation(v.data));
            const harga = finalPrice(drafts[v.vendorId] ?? v.data);
            return (
              <button
                key={v.vendorId}
                onClick={() => choose(v.vendorId)}
                style={{
                  display: "flex", alignItems: "center", gap: 12, width: "100%", boxSizing: "border-box", padding: "13px 14px", borderRadius: 18, cursor: "pointer", textAlign: "left", fontFamily: "inherit",
                  border: `1.5px solid ${aktif ? "#ea580c" : "#efd9c4"}`,
                  background: aktif ? "linear-gradient(135deg,#ffedd5,#fff)" : "#fff",
                  boxShadow: aktif ? "0 10px 22px rgba(234,88,12,.18)" : "0 1px 2px rgba(60,30,10,.04)",
                }}
              >
                <span style={{ flex: "none", width: 32, height: 32, borderRadius: "50%", display: "grid", placeItems: "center", fontWeight: 800, fontSize: 14, color: "#fff", background: pos === 0 ? "linear-gradient(135deg,#fbbf24,#d97706)" : "linear-gradient(135deg,#a08a74,#7d6850)" }}>
                  {pos >= 0 ? pos + 1 : "—"}
                </span>
                <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 4 }}>
                  <b style={{ fontSize: 14, color: "#2a1a0e" }}>{v.namaVendor}</b>
                  <small style={{ color: "#7a6450", fontWeight: 500 }}>{harga === null ? "SPH belum sah" : formatRupiah(harga)}</small>
                  {belumSimpan && <small style={{ color: "#b45309", fontWeight: 800 }}>● Belum disimpan</small>}
                </span>
                {skor !== null && skor !== undefined && (
                  <span style={{ fontSize: 17, fontWeight: 800, color: scoreColor100(skor), fontVariantNumeric: "tabular-nums" }}>{skor.toFixed(1)}</span>
                )}
              </button>
            );
          })}
          <div style={{ padding: "12px 14px", borderRadius: 14, background: "#ffedd5", border: "1px solid #fed7aa", fontSize: 12, lineHeight: 1.55, color: "#7c2d12", fontWeight: 500 }}>
            Pindah vendor kapan saja. Isian yang belum disimpan tetap aman dan ditandai oranye.
          </div>
        </aside>
        <fieldset disabled={locked || myFinal} style={{ minWidth: 0, margin: 0, padding: 0, border: 0 }}>
        <main style={{ minWidth: 0 }}>
          <nav style={{ ...box, padding: 8, display: "flex", gap: 6, overflowX: "auto" }}>
            {([
              ["ranking", "Ranking", "Perbandingan vendor", true],
              ["A", "A. Identitas", "Respons undangan", Boolean(data.response) && Boolean(data.invitationDate)],
              ["B", "B. Penawaran", "SPH & durasi", validPrice !== null && Number(data.durationDays) > 0],
              ["C", "C. Dokumen", "Nilai & bukti", gateNames.every(([gid]) => Number((data as any)[`${gid}Score`]) >= 1)],
              ["D", "D. Presentasi", `${questions.filter(([qid]) => Number((data.presentation as any)?.[qid]) >= 1).length} dari ${questions.length} terisi`, questions.every(([qid]) => Number((data.presentation as any)?.[qid]) >= 1)],
              ["E", "E. Manpower", "Lokal & nonlokal", off !== null && local !== null],
              ...(canSetWinner ? [["keputusan", "Keputusan", "Tetapkan pemenang", Boolean(report.locked)]] : []),
            ] as Array<[string, string, string, boolean]>).map(([id, label, sub, done]) => {
              const aktif = tab === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setTab(id)}
                  style={{
                    flex: "1 0 auto", display: "flex", alignItems: "center", gap: 10, padding: "10px 16px", borderRadius: 14, border: 0, cursor: "pointer", fontFamily: "inherit",
                    color: aktif ? "#fff" : "#2a1a0e",
                    background: aktif ? "linear-gradient(135deg,#ea580c,#c2410c)" : "transparent",
                    boxShadow: aktif ? "0 8px 18px rgba(194,65,12,.3)" : "none",
                  }}
                >
                  <span style={{ flex: "none", width: 26, height: 26, borderRadius: "50%", display: "grid", placeItems: "center", fontSize: 13, fontWeight: 800, background: aktif ? "rgba(255,255,255,.25)" : done ? "#dff3ea" : "#ffedd5", color: aktif ? "#fff" : done ? "#0b8a5b" : "#b45309" }}>
                    {done ? "✓" : "•"}
                  </span>
                  <span style={{ display: "flex", flexDirection: "column", textAlign: "left" }}>
                    <span style={{ fontSize: 13, fontWeight: 800 }}>{label}</span>
                    <span style={{ fontSize: 11, fontWeight: 600, opacity: aktif ? 0.88 : 0.7 }}>{sub}</span>
                  </span>
                </button>
              );
            })}
          </nav>
          <section id="eval-dashboard" hidden={tab !== "ranking"} style={box}>
            <h2>Dashboard Perbandingan Vendor • Ranking Otomatis</h2>
            <div style={{ display: "grid", gap: 8, margin: "4px 0 14px" }}>
              {ranked.length === 0 && <div style={{ ...metric, color: "#62748c" }}>Ranking muncul setelah ada penilai yang mengisi nilai vendor.</div>}
              {ranked.map((r, i) => (
                <div key={r.vendorId} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", border: `1px solid ${i === 0 ? "#f3b27a" : "#d9e3f0"}`, background: i === 0 ? "#fff6ec" : "#fff", borderRadius: 10 }}>
                  <span style={{ width: 34, height: 34, borderRadius: "50%", display: "grid", placeItems: "center", fontWeight: 800, color: "#fff", background: i === 0 ? "#f36b00" : i === 1 ? "#4b6a94" : i === 2 ? "#7a8da8" : "#a9b6c8" }}>{i + 1}</span>
                  <b style={{ flex: 1, minWidth: 0 }}>{r.namaVendor}</b>
                  <span style={{ fontWeight: 800 }}>{(r.score ?? r.provisionalScore ?? 0).toFixed(2)}<small style={{ color: "#62748c", fontWeight: 500 }}> /100{r.score === null ? " (sementara)" : ""}</small></span>
                  {report.pemenang?.id === r.vendorId && pill("Pemenang", "good")}
                </div>
              ))}
              {results.filter((r) => !ranked.includes(r)).map((r) => (
                <div key={r.vendorId} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", border: "1px dashed #d9e3f0", borderRadius: 10, color: "#62748c" }}>
                  <span style={{ width: 34, textAlign: "center" }}>—</span>
                  <b style={{ flex: 1 }}>{r.namaVendor}</b>
                  <span>{r.data.response === "tidak" ? "Tidak ikut" : "Nilai belum lengkap"}</span>
                </div>
              ))}
            </div>
            <div
              style={{
                ...grid,
                gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))",
              }}
            >
              {[
                ["Vendor terdaftar", report.vendors.length],
                [
                  "C & D lengkap",
                  results.filter((r) => r.parts["Bagian C"] !== null && r.parts["Bagian D"] !== null).length,
                ],
                [
                  "Harga & durasi",
                  results.filter((r) => r.data.response !== "tidak").every((r) => r.price !== null && Number(r.data.durationDays) > 0) ? "Sudah dibandingkan" : "Menunggu semua vendor",
                ],
                ["Ranking lengkap", qualified.length],
              ].map(([l, v]) => (
                <div key={l} style={metric}>
                  <small style={{ color: "#62748c" }}>{l}</small>
                  <strong style={{ display: "block", fontSize: 18 }}>
                    {v}
                  </strong>
                </div>
              ))}
            </div>
            <h3>Ranking Otomatis Vendor</h3>
            <p style={{ color: "#62748c", fontSize: 12 }}>
              Deviasi / Margin dibandingkan terhadap Harga Internal: (SPH sah − Harga Internal) / Harga Internal × 100%. Angka positif berarti di atas harga internal, angka negatif berarti di bawah harga internal. Nilai sementara dihitung dari aspek yang sudah lengkap, dengan bobot tersedia dinormalisasi ke 100. Nilai Harga dan Durasi baru masuk ketika seluruh peserta memiliki SPH final sah dan durasi. Ranking sementara dapat berubah.
            </p>
            <div style={{ overflowX: "auto", marginTop: 12 }}>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  minWidth: 1280,
                }}
              >
                <thead>
                  <tr>
                    {[
                      "Peringkat",
                      "Vendor",
                      "Harga SPH Sah",
                      "Deviasi / Margin vs Internal",
                      "Durasi",
                      "C / 10",
                      "D / 10",
                      "Nilai Harga",
                      "Nilai Durasi",
                      "Nilai / 100",
                      "Status",
                      "Bukti C",
                    ].map((x) => (
                      <th
                        key={x}
                        style={{
                          padding: 9,
                          textAlign: "left",
                          background:
                            x === "Verifikasi" ? "#fff1df" : "#f5f8fd",
                          color:
                            x === "Verifikasi" ? "#a64b00" : "#162b48",
                        }}
                      >
                        {x}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {results.map((r) => (
                    <tr key={r.vendorId}>
                      <td style={{ padding: 9 }}>
                        {r.score !== null || r.provisionalEligible
                          ? <b style={{ fontSize: 15 }}>{ranked.findIndex((q) => q.vendorId === r.vendorId) + 1}{r.score === null ? "*" : ""}</b>
                          : "—"}
                      </td>
                      <td style={{ padding: 9 }}>
                        <b>{r.namaVendor}</b>
                      </td>
                      <td>{r.price === null ? "—" : formatRupiah(r.price)}</td>
                      <td>
                        {r.price && Number(config.internalPrice) > 0
                          ? <><b style={{ color: r.price > Number(config.internalPrice) ? "#a72c3b" : r.price < Number(config.internalPrice) ? "#166e43" : "#162b48" }}>{`${r.price > Number(config.internalPrice) ? "+" : ""}${(((r.price - Number(config.internalPrice)) / Number(config.internalPrice)) * 100).toFixed(2)}%`}</b><small style={{display:"block",color:"#62748c"}}>{`${r.price > Number(config.internalPrice) ? "+" : r.price < Number(config.internalPrice) ? "−" : ""}${formatRupiah(Math.abs(r.price - Number(config.internalPrice)))}`}</small></>
                          : "—"}
                      </td>
                      <td>{r.data.durationDays ? `${r.data.durationDays} hari` : "—"}</td>
                      <td style={{ fontWeight: 800, color: r.parts["Bagian C"] === null ? undefined : scoreColor100(r.parts["Bagian C"] * 100) }}>{r.parts["Bagian C"] === null ? "—" : (r.parts["Bagian C"] * 10).toFixed(2)}</td>
                      <td style={{ fontWeight: 800, color: r.parts["Bagian D"] === null ? undefined : scoreColor100(r.parts["Bagian D"] * 100) }}>{r.parts["Bagian D"] === null ? "—" : (r.parts["Bagian D"] * 10).toFixed(2)}</td>
                      <td style={{ fontWeight: 800, color: r.parts.Harga === null ? undefined : scoreColor100(r.parts.Harga * 100) }}>{r.parts.Harga === null ? "Menunggu" : (r.parts.Harga * 100).toFixed(2)}</td>
                      <td style={{ fontWeight: 800, color: r.parts.Durasi === null ? undefined : scoreColor100(r.parts.Durasi * 100) }}>{r.parts.Durasi === null ? "Menunggu" : (r.parts.Durasi * 100).toFixed(2)}</td>
                      <td><b style={{ color: (r.score ?? r.provisionalScore) == null ? undefined : scoreColor100((r.score ?? r.provisionalScore)!) }}>{r.score !== null ? r.score.toFixed(2) : r.provisionalEligible ? `${r.provisionalScore!.toFixed(2)} *` : "—"}</b></td>
                      <td>
                        {r.score !== null
                          ? pill(r.status === "fail" ? "Ranking lengkap • C perlu review" : "Ranking lengkap", r.status === "fail" ? "warn" : "good")
                          : r.data.response === "tidak"
                            ? pill("Tidak ikut", "warn")
                            : r.provisionalEligible
                              ? pill("Ranking sementara", "warn")
                              : pill("Nilai C/D belum lengkap", "warn")}
                      </td>
                      <td>{(r.evaluasi?.dokumenAdminFiles?.length ? 1 : 0) + (r.evaluasi?.dokumenHseFiles?.length ? 1 : 0)}/{gateNames.length} file</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p style={{ color: "#62748c", fontSize: 12 }}>
              Angka dengan tanda * = peringkat sementara (bukan ranking final). Nilai sementara belum mencakup seluruh bobot evaluasi.
            </p>
            <div
              style={{
                padding: 12,
                background: "#fff8e9",
                border: "1px solid #efd9aa",
                borderRadius: 10,
                fontSize: 12,
                marginTop: 12,
              }}
            >
              Nilai C (dokumen) dan D (presentasi) menggunakan rata-rata angka 1–10; upload bukti dokumen C opsional untuk perhitungan skor. Harga dan durasi baru dinilai setelah seluruh vendor peserta mengisi SPH final sah dan durasi. Ranking sementara ditampilkan dari nilai yang sudah tersedia; ranking lengkap muncul setelah seluruh aspek C, D, Harga, dan Durasi lengkap. Upload bukti C tidak menghalangi ranking. Ranking tidak menetapkan pemenang secara otomatis. Bobot usulan harus disetujui sebelum evaluasi.
            </div>
            <h3>Rincian nilai vendor terpilih</h3>
            <div style={{ overflowX: "auto" }}><table style={{width:"100%",borderCollapse:"collapse"}}><thead><tr><th>Aspek</th><th>Bobot</th><th>Skor / 100</th><th>Kontribusi</th></tr></thead><tbody>{weights.map(([key, weight]) => { const value=current?.parts[key]; return <tr key={key}><td>{key}</td><td>{weight}%</td><td style={{ fontWeight: 800, color: value == null ? undefined : scoreColor100(value*100) }}>{value == null ? "Menunggu" : (value*100).toFixed(2)}</td><td>{value == null ? "—" : `${(value*weight).toFixed(2)} poin`}</td></tr> })}</tbody></table></div>
            <p style={{color:"#62748c",fontSize:12}}>Bobot: C 20%, D 40%, Harga 30%, Durasi 10%. Harga terendah sah dan durasi tercepat memperoleh skor 100. Nilai sementara dihitung hanya dari aspek yang sudah lengkap.</p>
          </section>
          <section id="eval-A" hidden={tab !== "A"} style={{ ...box, ...(!canSetWinner ? { pointerEvents: "none", opacity: 0.72 } : {}) }}>
            <h2>A. Identitas Tender & Respons Undangan</h2>
            <div style={grid}>
              <label>
                Nama Paket Tender
                <input
                  style={input}
                  value={config.packageName ?? report.namaTender}
                  onChange={(e) =>
                    setConfig((c) => ({ ...c, packageName: e.target.value }))
                  }
                />
              </label>
              <label>
                Nama Vendor
                <input
                  style={{ ...input, background: "#f4f7fb" }}
                  value={vendor?.namaVendor || ""}
                  readOnly
                />
              </label>
              <label>
                Tanggal Undangan Dikirim
                <input
                  style={input}
                  type="date"
                  value={data.invitationDate || ""}
                  onChange={(e) => set("invitationDate", e.target.value)}
                />
              </label>
              <label>
                Tanggal Respons Diterima
                <input
                  style={input}
                  type="datetime-local"
                  value={data.responseDate || ""}
                  onChange={(e) => set("responseDate", e.target.value)}
                />
              </label>
              <label>
                Respons Vendor
                <select
                  style={input}
                  value={data.response || ""}
                  onChange={(e) => set("response", e.target.value)}
                >
                  <option value="">Belum ada respons</option>
                  <option value="ikut">Bersedia ikut tender</option>
                  <option value="tidak">Tidak mengikuti tender</option>
                </select>
              </label>
            </div>
            <div
              style={{
                padding: 12,
                background: "#edf5ff",
                borderRadius: 10,
                fontSize: 12,
                marginTop: 12,
              }}
            >
              {data.response === "tidak"
                ? "Vendor menyatakan tidak mengikuti tender."
                : data.response === "ikut" && data.responseDate
                  ? `Vendor bersedia mengikuti tender; respons tercatat pada ${new Date(data.responseDate).toLocaleString("id-ID")}.`
                  : "Respons undangan belum lengkap. Tanpa batas respons, ketepatan waktu respons tidak dinilai."}
            </div>
          </section>
          <section id="eval-B" hidden={tab !== "B"} style={{ ...box, ...(!canSetWinner ? { pointerEvents: "none", opacity: 0.72 } : {}) }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 10,
              }}
            >
              <h2>B. Penawaran Harga & Durasi Pekerjaan</h2>
              <button
                style={primary}
                onClick={() =>
                  set("sphRounds", [
                    ...rounds,
                    {
                      deadline: "",
                      receivedAt: "",
                      value: undefined,
                      verification: "pending",
                    },
                  ])
                }
              >
                <Plus size={14} /> Tambah SPH
              </button>
            </div>
            <p style={{ color: "#62748c", fontSize: 12 }}>
              Catat SPH 1 sampai penawaran terakhir. Sistem menghitung ketepatan
              pengiriman setiap putaran dan harga terakhir yang sah.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 14, margin: "6px 0 18px" }}>
              {rounds.map((r, i) => {
                const ubah = (patch: Record<string, unknown>) =>
                  set("sphRounds", rounds.map((x, n) => (n === i ? { ...x, ...patch } : x)));
                const lbl: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 7, fontSize: 12, fontWeight: 700, color: "#5b4636" };
                return (
                  <div key={i} style={{ border: "1.5px solid #efd9c4", borderRadius: 18, padding: 18, background: "#fffdfa", display: "flex", flexDirection: "column", gap: 16 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{ width: 34, height: 34, borderRadius: 10, background: "#ffedd5", color: "#c2410c", display: "grid", placeItems: "center", fontWeight: 800 }}>{i + 1}</span>
                        <b style={{ fontSize: 15 }}>SPH {i + 1}</b>
                        {ontime(r) === null
                          ? pill("Belum lengkap", "warn")
                          : ontime(r)
                            ? pill("Tepat waktu", "good")
                            : pill("Terlambat", "bad")}
                      </div>
                      <button
                        type="button"
                        aria-label={`Hapus SPH ${i + 1}`}
                        style={{ width: 38, height: 38, borderRadius: 10, border: "1.5px solid #f3c4c7", background: "#fff5f5", color: "#c0262d", cursor: "pointer", display: "grid", placeItems: "center", opacity: rounds.length === 1 ? 0.4 : 1 }}
                        disabled={rounds.length === 1}
                        onClick={() => set("sphRounds", rounds.filter((_, n) => n !== i))}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(210px,1fr))", gap: 14 }}>
                      <label style={lbl}>
                        Deadline
                        <input style={input} type="datetime-local" value={r.deadline || ""} onChange={(e) => ubah({ deadline: e.target.value })} />
                      </label>
                      <label style={lbl}>
                        Diterima
                        <input style={input} type="datetime-local" value={r.receivedAt || ""} onChange={(e) => ubah({ receivedAt: e.target.value })} />
                      </label>
                      <label style={lbl}>
                        Nilai SPH
                        <span style={{ display: "flex", alignItems: "center", height: 48, border: "1.5px solid #f0cfae", borderRadius: 14, background: "#fffaf5", overflow: "hidden" }}>
                          <span style={{ flex: "none", height: "100%", display: "grid", placeItems: "center", padding: "0 14px", fontSize: 13, fontWeight: 800, color: "#c2410c", background: "#ffedd5", borderRight: "1.5px solid #f6d7b8" }}>Rp</span>
                          <input
                            style={{ flex: 1, minWidth: 0, height: "100%", border: 0, outline: 0, background: "transparent", padding: "0 14px", fontWeight: 700, fontSize: 14, color: "#2a1a0e" }}
                            type="number"
                            min="0"
                            value={r.value ?? ""}
                            onChange={(e) => ubah({ value: e.target.value === "" ? undefined : Number(e.target.value) })}
                          />
                        </span>
                      </label>
                    </div>
                    <div style={lbl}>
                      Verifikasi
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 8 }}>
                        {([["pending", "Belum diperiksa", "#d97706"], ["yes", "SPH sah", "#16a34a"], ["no", "SPH tidak sah", "#dc2626"]] as const).map(([val, label, c]) => {
                          const aktif = (r.verification || "pending") === val;
                          return (
                            <button
                              key={val}
                              type="button"
                              aria-label={`${label} untuk SPH ${i + 1}`}
                              onClick={() => ubah({ verification: val })}
                              style={{ height: 42, borderRadius: 12, cursor: "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: 700, border: `1.5px solid ${aktif ? c : "#efd9c4"}`, background: aktif ? `${c}1c` : "#fff", color: aktif ? c : "#7a6450" }}
                            >
                              {label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div
              className="evaluation-b-summary"
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                gap: 13,
                marginTop: 14,
              }}
            >
              <div style={metric}>
                <small>Harga SPH Terakhir Sah</small>
                <strong style={{ display: "block", fontSize: 18 }}>
                  {validPrice === null ? "Belum sah" : formatRupiah(validPrice)}
                </strong>
              </div>
              <div style={metric}>
                <small>Ketepatan Pengiriman SPH</small>
                <strong style={{ display: "block", fontSize: 18 }}>
                  {known.length
                    ? `${known.filter(ontime).length} dari ${rounds.length} SPH`
                    : "Belum lengkap"}
                </strong>
              </div>
              <label>
                Harga Internal / HPS Perusahaan (Rp)
                <input
                  style={input}
                  type="number"
                  min="0"
                  placeholder="Harga acuan internal paket tender"
                  value={config.internalPrice ?? ""}
                  onChange={(e) =>
                    setConfig((c) => ({
                      ...c,
                      internalPrice: Number(e.target.value),
                    }))
                  }
                />
              </label>
              <label>
                Durasi Pekerjaan Ditawarkan (hari)
                <input
                  style={input}
                  type="number"
                  min="1"
                  placeholder="Misal: 90"
                  value={data.durationDays ?? ""}
                  onChange={(e) => set("durationDays", Number(e.target.value))}
                />
              </label>
              <div style={metric}>
                <small>Deviasi Penawaran terhadap Harga Internal</small>
                <strong style={{ display: "block", fontSize: 18 }}>
                  {validPrice !== null && Number(config.internalPrice) > 0
                    ? `${(((validPrice - Number(config.internalPrice)) / Number(config.internalPrice)) * 100).toFixed(2)}%`
                    : "—"}
                </strong>
                <small style={{ display: "block" }}>
                  {validPrice !== null && Number(config.internalPrice) > 0
                    ? `Selisih harga: ${validPrice - Number(config.internalPrice) > 0 ? "+" : validPrice - Number(config.internalPrice) < 0 ? "−" : ""}${formatRupiah(Math.abs(validPrice - Number(config.internalPrice)))}`
                    : "Selisih harga: —"}
                </small>
                <small>
                  (SPH final − Harga internal) / Harga internal × 100%
                </small>
              </div>
            </div>
            <div
              style={{
                padding: 12,
                background: "#edf5ff",
                borderRadius: 10,
                fontSize: 12,
                marginTop: 12,
              }}
            >
              {Number(data.durationDays) > 0
                ? `Durasi ditawarkan: ${data.durationDays} hari. Perbandingan durasi dilakukan antarvendor dengan jadwal yang layak diverifikasi.`
                : "Durasi pekerjaan belum diisi."}
            </div>
            <p style={{ color: "#62748c", fontSize: 12, marginBottom: 0 }}>
              Harga internal bersifat rahasia dan hanya boleh diakses tim
              berwenang. Deviasi positif berarti SPH di atas harga internal;
              deviasi negatif berarti SPH di bawah harga internal. Durasi lebih cepat mendapat
              nilai lebih tinggi hanya jika realistis, memenuhi batas minimum
              keselamatan, dan didukung rencana kerja.
            </p>
          </section>
          <section id="eval-C" hidden={tab !== "C"} style={box}>
            <h2>C. Penilaian Dokumen Pendukung (1–10)</h2>
            <p style={{ color: "#62748c", fontSize: 12 }}>
              Klik nilai 1–10 untuk kedua indikator. Nilai Bagian C langsung dihitung dan masuk ranking tanpa harus mengunggah file. Upload bukti dokumen tetap tersedia secara opsional dan statusnya dicatat terpisah. Nilai di bawah 7/10 ditandai untuk ditinjau, tetapi tetap dihitung dalam perbandingan.
            </p>
            {gateNames.map(([id, name]) => {
              const files =
                id === "admin"
                  ? vendor?.evaluasi?.dokumenAdminFiles
                  : vendor?.evaluasi?.dokumenHseFiles;
              return (
                <div
                  key={id}
                  style={{
                    border: "1px solid #d9e3f0",
                    borderRadius: 10,
                    padding: 12,
                    margin: "8px 0",
                  }}
                >
                  <b>{name}</b>
                  <div style={{ ...grid, marginTop: 7 }}>
                    <div><label>Nilai dokumen (1–10)</label><div className="rating-buttons">{Array.from({length:10},(_,i)=>i+1).map((score)=><button key={score} type="button" style={scaleStyle(Number((data as any)[`${id}Score`]) || null, score)} onClick={()=>set(`${id}Score` as any,score)}>{score}</button>)}</div></div>
                    <label>
                      Upload dokumen pendukung
                      <span style={{ display: "flex", alignItems: "center", gap: 12, border: "2px dashed #f5b97f", borderRadius: 14, background: "#fff7ed", padding: 16, cursor: "pointer", margin: "7px 0" }}>
                        <span style={{ flex: "none", width: 40, height: 40, borderRadius: 12, background: "#ffedd5", color: "#c2410c", display: "grid", placeItems: "center" }}><Upload size={20} /></span>
                        <span style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                          <b style={{ fontSize: 13, color: "#2a1a0e" }}>Pilih file</b>
                          <span style={{ fontSize: 12, fontWeight: 500, color: "#7a6450" }}>PDF, DOC, XLS, JPG, atau PNG · bisa lebih dari satu</span>
                        </span>
                      </span>
                      <input
                        style={{ display: "none" }}
                        type="file"
                        multiple
                        accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                        onChange={(e) => {
                          const selectedFiles = Array.from(e.target.files || []);
                          if (id === "admin")
                            setAdmin((current) => [
                              ...current,
                              ...selectedFiles,
                            ]);
                          else
                            setHse((current) => [
                              ...current,
                              ...selectedFiles,
                            ]);
                          e.target.value = "";
                        }}
                      />
                      <small>
                        {files?.length
                          ? `${files.length} dokumen tersimpan`
                          : "Belum ada dokumen"}
                      </small>
                    </label>
                  </div>
                  {(id === "admin" ? admin : hse).map((file, index) => (
                    <div
                      key={`${file.name}-${file.lastModified}-${index}`}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 8,
                        alignItems: "center",
                        marginTop: 7,
                        padding: "7px 9px",
                        borderRadius: 8,
                        background: "#fff8ef",
                        fontSize: 12,
                      }}
                    >
                      <span>{file.name} (belum disimpan)</span>
                      <button
                        type="button"
                        style={{ ...btn, padding: "4px 8px", color: "#b22e37" }}
                        onClick={() =>
                          id === "admin"
                            ? setAdmin((current) =>
                                current.filter((_, i) => i !== index),
                              )
                            : setHse((current) =>
                                current.filter((_, i) => i !== index),
                              )
                        }
                      >
                        Hapus
                      </button>
                    </div>
                  ))}
                  {files?.map((file: string, index: number) => (
                    <div
                      key={file}
                      style={{
                        display: "flex",
                        gap: 8,
                        alignItems: "center",
                        marginTop: 7,
                        fontSize: 12,
                      }}
                    >
                      <a
                        href={urlFileEprom(file)}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Lihat file {index + 1}
                      </a>
                      <button
                        style={{ ...btn, padding: "4px 8px", color: "#b22e37" }}
                        onClick={() => removeEvidence(id, index)}
                      >
                        Hapus
                      </button>
                    </div>
                  ))}
                </div>
              );
            })}
            {(() => {
              const nilai = gateNames.map(([id]) => Number((data as any)[`${id}Score`])).filter((x) => Number.isInteger(x) && x >= 1 && x <= 10);
              const avg = nilai.length ? nilai.reduce((a, b) => a + b, 0) / nilai.length : null;
              const unggah = gateNames.filter(([id]) => (id === "admin" ? vendor?.evaluasi?.dokumenAdminFiles : vendor?.evaluasi?.dokumenHseFiles)?.length).length;
              return (
                <div style={{ ...metric, margin: "12px 0" }}>
                  <small>Rata-rata nilai Bagian C</small>
                  <strong style={{ display: "block", fontSize: 24 }}>{avg === null ? "—" : avg.toFixed(2)} / 10</strong>
                  <div style={{ fontSize: 12, color: "#62748c" }}>
                    {nilai.length} dari {gateNames.length} indikator dinilai • {unggah} dokumen pendukung telah diunggah • {nilai.length === gateNames.length && avg !== null ? `Setara ${(avg * 10).toFixed(1)}/100` : "Nilai sementara; lengkapi kedua indikator."} Upload bukti tidak memengaruhi perhitungan ranking. Nilai di bawah 7/10 ditandai untuk ditinjau.
                  </div>
                </div>
              );
            })()}
          </section>
          <section id="eval-D" hidden={tab !== "D"} style={box}>
            <h2>D. Presentasi & Pemahaman Vendor</h2>
            <p style={{ color: "#62748c", fontSize: 12 }}>
              Klik angka 1–10 untuk setiap indikator. Nilai rata-rata Bagian D dihitung otomatis. Semua vendor dinilai dengan kriteria yang sama.
            </p>
            {questions.map(([id, name]) => (
              <div
                key={id}
                style={{
                  border: "1px solid #d9e3f0",
                  borderRadius: 10,
                  padding: 12,
                  margin: "8px 0",
                }}
              >
                <div className="presentation-head"><b>{name}</b><span className="presentation-value">Nilai: {(data.presentation as any)?.[id] || "—"}</span></div>
                <div className="rating-buttons">{Array.from({length:10},(_,i)=>i+1).map((score)=><button key={score} type="button" style={scaleStyle(Number((data.presentation as any)?.[id]) || null, score)} onClick={()=>set("presentation",{...data.presentation,[id]:score})}>{score}</button>)}</div>
              </div>
            ))}
            {(() => {
              const nilai = questions.map(([id]) => Number((data.presentation as any)?.[id])).filter((x) => Number.isInteger(x) && x >= 1 && x <= 10);
              const avg = nilai.length ? nilai.reduce((a, b) => a + b, 0) / nilai.length : null;
              return (
                <div style={{ ...metric, margin: "12px 0" }}>
                  <small>Rata-rata nilai Bagian D</small>
                  <strong style={{ display: "block", fontSize: 24 }}>{avg === null ? "—" : avg.toFixed(2)} / 10</strong>
                  <div style={{ fontSize: 12, color: "#62748c" }}>
                    {nilai.length} dari {questions.length} indikator dinilai • {nilai.length === questions.length && avg !== null ? `Skor Presentasi: ${(avg * 10).toFixed(1)}/100` : "Nilai rata-rata sementara; skor ranking menunggu semua indikator diisi."}
                  </div>
                </div>
              );
            })()}
            <label>
              Catatan Evaluasi Presentasi
              <textarea
                style={{ ...input, minHeight: 65 }}
                value={data.presentationNotes || ""}
                onChange={(e) => set("presentationNotes", e.target.value)}
                placeholder="Temuan objektif / hal yang perlu diklarifikasi"
              />
            </label>
          </section>
          <section id="eval-E" hidden={tab !== "E"} style={{ ...box, ...(!canSetWinner ? { pointerEvents: "none", opacity: 0.72 } : {}) }}>
            <h2>E. Manpower & Pemberdayaan Lokal</h2>
            <div style={grid}>
              <label>
                Kebutuhan Minimum Manpower (orang)
                <input
                  style={input}
                  type="number"
                  min="0"
                  value={config.manpowerRequirement ?? ""}
                  onChange={(e) =>
                    setConfig((c) => ({
                      ...c,
                      manpowerRequirement: Number(e.target.value),
                    }))
                  }
                />
              </label>
              <label>
                Manpower Ditawarkan (orang)
                <input
                  style={input}
                  type="number"
                  min="0"
                  value={data.manpowerOffered ?? ""}
                  onChange={(e) =>
                    set("manpowerOffered", Number(e.target.value))
                  }
                />
              </label>
              <label>
                Tenaga Kerja Lokal (orang)
                <input
                  style={input}
                  type="number"
                  min="0"
                  value={data.localWorkers ?? ""}
                  onChange={(e) => set("localWorkers", Number(e.target.value))}
                />
              </label>
              <label>
                Tenaga Kerja Nonlokal (orang)
                <input
                  style={input}
                  type="number"
                  min="0"
                  value={data.nonLocalWorkers ?? ""}
                  onChange={(e) =>
                    set("nonLocalWorkers", Number(e.target.value))
                  }
                />
              </label>
            </div>
            <div style={{ ...grid, marginTop: 13 }}>
              <div style={metric}>
                <small>Total Tenaga Kerja Lokal + Nonlokal</small>
                <strong style={{ display: "block", fontSize: 18 }}>
                  {total === null ? "—" : `${total} orang`}
                </strong>
              </div>
              <div style={metric}>
                <small>Persentase Tenaga Lokal</small>
                <strong style={{ display: "block", fontSize: 18 }}>
                  {total && local !== null
                    ? `${Math.round((local / total) * 1000) / 10}%`
                    : "—"}
                </strong>
              </div>
            </div>
            <div
              style={{
                padding: 12,
                background: "#edf5ff",
                borderRadius: 10,
                fontSize: 12,
                marginTop: 12,
              }}
            >
              {total !== null && off !== null && total !== off
                ? `Perhatian: lokal + nonlokal (${total}) tidak sama dengan manpower ditawarkan (${off}). Harap perbaiki.`
                : n(config.manpowerRequirement) !== null && off !== null
                  ? off >= Number(config.manpowerRequirement)
                    ? `Manpower ditawarkan ${off} orang memenuhi kebutuhan minimum ${config.manpowerRequirement} orang.`
                    : `Manpower ditawarkan ${off} orang, kurang dari kebutuhan ${config.manpowerRequirement} orang.`
                  : "Lengkapi kebutuhan dan penawaran manpower."}
            </div>
            <p style={{ color: "#62748c", fontSize: 12 }}>
              Persentase lokal ditampilkan sebagai informasi terukur. Jika ingin diberi bobot dalam ranking, kebijakan definisi dan target lokal harus ditetapkan sejak awal tender dan sesuai ketentuan yang berlaku.
            </p>
          </section>
          {canSetWinner && <section id="eval-finalisasi" hidden={tab !== "keputusan"} style={box}>
            <h2>Finalisasi Tender & Keputusan Manajemen</h2>
            <p style={{color:"#62748c",fontSize:12}}>Ranking objektif tidak diubah. Pemenang bebas dipilih dari vendor peserta mana pun, tidak harus ranking 1. Jika yang dipilih bukan ranking 1, keputusan dicatat sebagai keputusan manajemen.</p>
            <div style={grid}>
              <label>Vendor yang ditetapkan<select style={input} value={config.decision?.vendorId || (leader ? String(leader.vendorId) : "")} onChange={(e)=>setConfig((c)=>({...c,decision:{...(c.decision||{}),vendorId:e.target.value}}))}><option value="">Pilih vendor</option>{results.map((r)=>{ const pos = ranked.findIndex((q)=>q.vendorId===r.vendorId); return <option key={r.vendorId} value={r.vendorId}>{pos >= 0 ? `#${pos + 1} — ` : ""}{r.namaVendor}{r.score !== null ? ` — ${r.score.toFixed(2)}/100` : r.provisionalEligible ? ` — ${r.provisionalScore!.toFixed(2)}/100 (sementara)` : " — belum lengkap"}</option>; })}</select></label>
              <label>Nama penetap / pemberi persetujuan<input style={input} value={config.decision?.approver || ""} onChange={(e)=>setConfig((c)=>({...c,decision:{...(c.decision||{}),mode:c.decision?.mode||"fair",approver:e.target.value}}))} placeholder="Nama dan jabatan pejabat berwenang" /></label>
              <label>Referensi keputusan (opsional)<input style={input} value={config.decision?.reference || ""} onChange={(e)=>setConfig((c)=>({...c,decision:{...(c.decision||{}),mode:c.decision?.mode||"fair",reference:e.target.value}}))} placeholder="Nomor notulen / memo / persetujuan" /></label>
            </div>
            <label style={{display:"block",marginTop:12}}>Alasan dan dasar keputusan (opsional)<textarea style={{...input,minHeight:65}} value={config.decision?.reason || ""} onChange={(e)=>setConfig((c)=>({...c,decision:{...(c.decision||{}),mode:c.decision?.mode||"fair",reason:e.target.value}}))} placeholder="Disarankan diisi jika memilih vendor selain ranking 1" /></label>
            <div style={{padding:12,background:"#edf5ff",borderRadius:10,fontSize:12,margin:"12px 0"}}><b>Ranking objektif:</b> {leader ? `${leader.namaVendor} — ${(leader.score ?? leader.provisionalScore ?? 0).toFixed(2)}/100${leader.score === null ? " (sementara)" : ""}` : "Belum lengkap"}<br/><b>Kelengkapan:</b> {results.filter((r)=>r.data.response!=="tidak").every((r)=>r.score!==null) ? "Seluruh peserta telah dinilai lengkap." : "Belum semua peserta memiliki nilai final."}</div>
            <button style={primary} onClick={finalizeTender} disabled={saving}>{saving ? "Memfinalkan..." : "Finalkan & Tetapkan Pemenang"}</button>
            {config.finalDecision && <div style={{padding:12,background:"#edf5ff",borderRadius:10,fontSize:12,marginTop:14}}><b>Keputusan telah difinalkan dan pemenang telah ditetapkan pada tender</b><br/>Status: {config.finalDecision.mode === "fair" ? "Final – Sesuai Evaluasi" : "Final – Keputusan Manajemen"}<br/>Vendor: <b>{config.finalDecision.vendorName}</b><br/>Skor objektif: {config.finalDecision.score?.toFixed?.(2) ?? config.finalDecision.score ?? "Belum lengkap"}/100<br/>Ranking 1 saat finalisasi: {config.finalDecision.objectiveWinner ? `${config.finalDecision.objectiveWinner} — ${Number(config.finalDecision.objectiveScore).toFixed(2)}/100` : "—"}<br/>Disetujui oleh: {config.finalDecision.approver}<br/>Waktu: {new Date(config.finalDecision.timestamp).toLocaleString("id-ID")}<br/>Alasan: {config.finalDecision.reason || "Mengikuti hasil evaluasi objektif"}<br/>Referensi: {config.finalDecision.reference || "—"}</div>}
          </section>}
        </main>
        </fieldset>
        <aside className="evaluation-summary" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <section style={{ borderRadius: 22, padding: 22, background: "linear-gradient(160deg,#9a3412 0%,#c2410c 65%,#f97316 100%)", color: "#fff", boxShadow: "0 16px 34px rgba(194,65,12,.28)", display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ fontSize: 11, letterSpacing: ".1em", textTransform: "uppercase", fontWeight: 800, opacity: 0.88 }}>Skor {vendor?.namaVendor}</div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
              <span style={{ fontSize: 46, fontWeight: 800, letterSpacing: "-0.03em" }}>
                {current && (current.score ?? current.provisionalScore) != null ? (current.score ?? current.provisionalScore)!.toFixed(2) : "—"}
              </span>
              <span style={{ opacity: 0.88, fontSize: 14, fontWeight: 600 }}>/ 100{current && current.score === null && current.provisionalScore !== null ? " (sementara)" : ""}</span>
            </div>
            {weights.map(([key, weight]) => {
              const value = current?.parts[key];
              return (
                <div key={key}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                    <span>{key} <span style={{ opacity: 0.75 }}>· {weight}%</span></span>
                    <b>{value == null ? "Menunggu" : `${(value * weight).toFixed(1)} poin`}</b>
                  </div>
                  <div style={{ height: 7, borderRadius: 999, background: "rgba(60,20,4,.45)", overflow: "hidden" }}>
                    <div style={{ height: "100%", borderRadius: 999, background: "linear-gradient(90deg,#fbbf24,#f59e0b)", width: `${value == null ? 0 : Math.round(value * 100)}%` }} />
                  </div>
                </div>
              );
            })}
          </section>
          <section style={{ ...box, padding: "18px 20px", marginBottom: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 10 }}>Status penilai</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {(report.evaluators || []).map((ev) => (
                <div key={ev.userId} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, fontSize: 13, fontWeight: 600 }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                    <span style={{ flex: "none", width: 30, height: 30, borderRadius: "50%", display: "grid", placeItems: "center", fontSize: 12, fontWeight: 800, color: "#fff", background: "linear-gradient(135deg,#f97316,#c2410c)" }}>{(ev.nama || "?").charAt(0).toUpperCase()}</span>
                    <span style={{ overflowWrap: "anywhere" }}>{ev.nama}</span>
                  </span>
                  <span style={{ flex: "none", fontSize: 12, fontWeight: 800, padding: "4px 11px", borderRadius: 999, background: "#dff3ea", color: "#0b6b43" }}>Final</span>
                </div>
              ))}
              {!(report.evaluators || []).length && <div style={{ fontSize: 12, color: "#7a6450" }}>Belum ada penilai yang memfinalkan penilaian.</div>}
              {vendor?.myEvaluation && vendor.myEvaluation.status !== "FINAL" && (
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, fontWeight: 600 }}>
                  <span>Anda (vendor ini)</span>
                  <span style={{ fontSize: 12, fontWeight: 800, padding: "4px 11px", borderRadius: 999, background: "#fff0d6", color: "#9a5304" }}>Draf</span>
                </div>
              )}
            </div>
          </section>
        </aside>
      </div>
      <style jsx>{`
        .presentation-head { display:flex; justify-content:space-between; align-items:center; gap:12px; margin-bottom:10px; }
        .presentation-value { font-weight:800; color:#f36b00; white-space:nowrap; }
        .rating-buttons { display:grid; grid-template-columns:repeat(10,minmax(0,1fr)); gap:7px; }
        .rating-btn { padding:10px 0; border:1px solid #cbd8eb; border-radius:8px; background:#fff; color:#193455; font-weight:700; cursor:pointer; }
        .rating-btn:hover { background:#fff1df; border-color:#f36b00; }
        .rating-btn.rating-active { background:#f36b00; border-color:#f36b00; color:#fff; }
        @media (max-width: 1180px) {
          .evaluation-layout { grid-template-columns: 240px minmax(0,1fr) !important; }
          .evaluation-summary { grid-column: 1 / -1; }
        }
        @media (max-width: 900px) {
          .evaluation-layout {
            grid-template-columns: 1fr !important;
          }
          .evaluation-aside {
            position: static !important;
          }
          .evaluation-b-summary {
            grid-template-columns: 1fr !important;
          }
        }
        @media (max-width: 650px) {
          .rating-buttons { grid-template-columns:repeat(5,minmax(0,1fr)); }
          .presentation-head { align-items:flex-start; }
        }
        @media print {
          .evaluation-aside {
            display: none !important;
          }
          .evaluation-layout {
            display: block !important;
          }
        }
      `}</style>
    </div>
  );
}
