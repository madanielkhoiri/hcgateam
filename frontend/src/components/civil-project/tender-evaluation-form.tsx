"use client";
import { useEffect, useMemo, useState } from "react";
import { Plus, Printer, Save, Trash2 } from "lucide-react";
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
  border: "1px solid #d9e3f0",
  borderRadius: 14,
  padding: 19,
  marginBottom: 15,
};
const input: React.CSSProperties = {
  width: "100%",
  padding: "10px",
  border: "1px solid #c6d4e7",
  borderRadius: 8,
  color: "#162b48",
};
const grid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))",
  gap: 13,
};
const metric: React.CSSProperties = {
  background: "#fff8ef",
  padding: 13,
  border: "1px solid #f4dfc5",
  borderRadius: 11,
};
const btn: React.CSSProperties = {
  border: "1px solid #d9e3f0",
  background: "#fff",
  padding: "9px 13px",
  borderRadius: 9,
  cursor: "pointer",
  fontWeight: 700,
  color: "#162b48",
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
};
const primary: React.CSSProperties = {
  ...btn,
  background: "#f36b00",
  borderColor: "#f36b00",
  color: "#fff",
};
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
}: {
  tenderId: number;
  styles?: Record<string, string>;
}) {
  const [report, setReport] = useState<TenderEvaluationReport | null>(null),
    [selected, setSelected] = useState<number | null>(null),
    [data, setData] = useState<TenderEvaluationData>(empty),
    [drafts, setDrafts] = useState<Record<number, TenderEvaluationData>>({}),
    [config, setConfig] = useState<Record<string, any>>({}),
    [adminDrafts, setAdminDrafts] = useState<Record<number, File[]>>({}),
    [hseDrafts, setHseDrafts] = useState<Record<number, File[]>>({}),
    [saving, setSaving] = useState(false),
    [error, setError] = useState("");
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
        setSelected(id);
        setData(
          id !== null && drafts[id]
            ? drafts[id]
            : normalizeEvaluation(r.vendors.find((v) => v.vendorId === id)?.data),
        );
      })
      .catch((e) => setError(e.message));
  useEffect(() => {
    void load();
  }, [tenderId]);
  const vendor = report?.vendors.find((v) => v.vendorId === selected);
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
  const updateData = (updater: (current: TenderEvaluationData) => TenderEvaluationData) =>
    setData((current) => {
      const next = updater(current);
      if (selected !== null) setDrafts((all) => ({ ...all, [selected]: next }));
      return next;
    });
  const set = (k: keyof TenderEvaluationData, v: any) =>
    updateData((d) => ({ ...d, [k]: v }));
  const choose = (id: number) => {
    const v = report?.vendors.find((x) => x.vendorId === id);
    setSelected(id);
    setData(drafts[id] || normalizeEvaluation(v?.data));
  };
  const results = useMemo(() => {
    if (!report) return [];
    const participants = report.vendors.filter((v) => {
      const draft = drafts[v.vendorId] || v.data;
      return draft.response !== "tidak";
    });
    const priceDurationReady = participants.length > 0 && participants.every((v) => {
      const draft = drafts[v.vendorId] || v.data;
      return finalPrice(draft) !== null && Number(draft.durationDays) > 0;
    });
    const pool = participants.filter((v) => {
      const draft = drafts[v.vendorId] || v.data;
      return finalPrice(draft) !== null && Number(draft.durationDays) > 0;
    });
    const minP = priceDurationReady && pool.length
        ? Math.min(...pool.map((v) => finalPrice(drafts[v.vendorId] || v.data)!))
        : null,
      minD = priceDurationReady && pool.length
        ? Math.min(...pool.map((v) => Number((drafts[v.vendorId] || v.data).durationDays)))
        : null;
    return report.vendors
      .map((v) => {
        const d = drafts[v.vendorId] || (v.vendorId === selected ? data : v.data),
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
    leader = qualified[0],
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
      setData(saved);
      setDrafts((all) => ({ ...all, [selected]: saved }));
      setAdminDrafts((all) => ({ ...all, [selected]: [] }));
      setHseDrafts((all) => ({ ...all, [selected]: [] }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal menyimpan");
    } finally {
      setSaving(false);
    }
  };
  const finalizeTender = async () => {
    if (!selected || !report) return;
    const decision = config.decision || { mode: "fair", vendorId: leader?.vendorId ? String(leader.vendorId) : "", approver: "", reference: "", reason: "" };
    const chosen = results.find((r) => String(r.vendorId) === String(decision.vendorId));
    if (!chosen) return setError("Pilih vendor yang ditetapkan.");
    if (chosen.data.response === "tidak") return setError("Vendor yang tidak mengikuti tender tidak dapat ditetapkan sebagai pemenang.");
    if (finalPrice(chosen.data) === null || Number(chosen.data.durationDays) <= 0) return setError("Vendor terpilih wajib memiliki SPH sah dan durasi pekerjaan.");
    if (!String(decision.approver || "").trim()) return setError("Nama penetap / pemberi persetujuan wajib diisi.");
    if (decision.mode === "fair" && chosen.vendorId !== leader?.vendorId) return setError("Jalur mengikuti evaluasi harus memilih vendor ranking 1.");
    if (decision.mode === "management" && !String(decision.reason || "").trim()) return setError("Alasan keputusan khusus manajemen wajib diisi.");
    const nextConfig = { ...config, decision, finalDecision: { ...decision, vendorName: chosen.namaVendor, score: chosen.score, timestamp: new Date().toISOString() } };
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
          background: "linear-gradient(110deg,#102b50,#1e4778)",
          borderLeft: "6px solid #f36b00",
          color: "#fff",
          padding: 22,
          borderRadius: 14,
        }}
      >
        <h1 style={{ fontSize: 23, margin: 0 }}>
          Evaluasi Tender & Rekomendasi Pemenang
        </h1>
        <p style={{ margin: "6px 0 0", color: "#e2eaf8" }}>
          SPH bertahap • Harga internal & margin • Durasi pekerjaan • Presentasi
          vendor • Manpower lokal
        </p>
      </header>
      <div
        style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "14px 0" }}
      >
        <button style={primary} onClick={save} disabled={saving}>
          <Save size={14} /> {saving ? "Menyimpan..." : "Simpan"}
        </button>
        <button style={btn} onClick={pdf}>
          <Printer size={14} /> Cetak / PDF
        </button>
      </div>
      {error && <div style={{ ...box, color: "#a72c3b" }}>{error}</div>}
      <div
        className="evaluation-layout"
        style={{
          display: "grid",
          gridTemplateColumns: "220px minmax(0,1fr)",
          gap: 16,
          alignItems: "start",
        }}
      >
        <aside
          className="evaluation-aside"
          style={{ ...box, position: "sticky", top: 14, padding: 14 }}
        >
          <h2 style={{ marginTop: 2 }}>Vendor Peserta</h2>
          {report.vendors.map((v) => (
            <button
              key={v.vendorId}
              style={{
                ...btn,
                display: "block",
                width: "100%",
                textAlign: "left",
                margin: "6px 0",
                background: v.vendorId === selected ? "#fff1df" : "#fff",
                borderColor: v.vendorId === selected ? "#f36b00" : "#d9e3f0",
                boxShadow:
                  v.vendorId === selected ? "inset 3px 0 #f36b00" : "none",
              }}
              onClick={() => choose(v.vendorId)}
            >
              {v.namaVendor}
              <small
                style={{ display: "block", color: "#62748c", marginTop: 3 }}
              >
                {finalPrice(v.vendorId === selected ? data : v.data) === null
                  ? "SPH belum sah"
                  : formatRupiah(
                      finalPrice(v.vendorId === selected ? data : v.data)!,
                    )}
              </small>
            </button>
          ))}
        </aside>
        <main style={{ minWidth: 0 }}>
          <section id="eval-dashboard" style={box}>
            <h2>Dashboard Perbandingan Vendor • Ranking Otomatis</h2>
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
                        {r.score !== null
                          ? qualified.findIndex(
                              (q) => q.vendorId === r.vendorId,
                            ) + 1
                          : r.provisionalEligible
                            ? `S${provisional.findIndex((q) => q.vendorId === r.vendorId) + 1}`
                            : "—"}
                      </td>
                      <td style={{ padding: 9 }}>
                        <b>{r.namaVendor}</b>
                      </td>
                      <td>{r.price === null ? "—" : formatRupiah(r.price)}</td>
                      <td>
                        {r.price && Number(config.internalPrice) > 0
                          ? <><b>{`${r.price > Number(config.internalPrice) ? "+" : ""}${(((r.price - Number(config.internalPrice)) / Number(config.internalPrice)) * 100).toFixed(2)}%`}</b><small style={{display:"block",color:"#62748c"}}>{`${r.price > Number(config.internalPrice) ? "+" : r.price < Number(config.internalPrice) ? "−" : ""}${formatRupiah(Math.abs(r.price - Number(config.internalPrice)))}`}</small></>
                          : "—"}
                      </td>
                      <td>{r.data.durationDays ? `${r.data.durationDays} hari` : "—"}</td>
                      <td>{r.parts["Bagian C"] === null ? "—" : (r.parts["Bagian C"] * 10).toFixed(2)}</td>
                      <td>{r.parts["Bagian D"] === null ? "—" : (r.parts["Bagian D"] * 10).toFixed(2)}</td>
                      <td>{r.parts.Harga === null ? "Menunggu" : (r.parts.Harga * 100).toFixed(2)}</td>
                      <td>{r.parts.Durasi === null ? "Menunggu" : (r.parts.Durasi * 100).toFixed(2)}</td>
                      <td><b>{r.score !== null ? r.score.toFixed(2) : r.provisionalEligible ? `${r.provisionalScore!.toFixed(2)} *` : "—"}</b></td>
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
              Nilai C (dokumen) dan D (presentasi) menggunakan rata-rata angka 1–10; upload bukti dokumen C opsional untuk perhitungan skor. Harga dan durasi baru dinilai setelah seluruh vendor peserta mengisi SPH final sah dan durasi. Ranking sementara ditampilkan dari nilai yang sudah tersedia; ranking lengkap muncul setelah seluruh aspek C, D, Harga, dan Durasi lengkap. Upload bukti C tidak menghalangi ranking. Ranking tidak menetapkan pemenang secara otomatis.
            </div>
            <h3>Rincian nilai vendor terpilih</h3>
            <div style={{ overflowX: "auto" }}><table style={{width:"100%",borderCollapse:"collapse"}}><thead><tr><th>Aspek</th><th>Bobot</th><th>Skor / 100</th><th>Kontribusi</th></tr></thead><tbody>{weights.map(([key, weight]) => { const value=current?.parts[key]; return <tr key={key}><td>{key}</td><td>{weight}%</td><td>{value == null ? "Menunggu" : (value*100).toFixed(2)}</td><td>{value == null ? "—" : `${(value*weight).toFixed(2)} poin`}</td></tr> })}</tbody></table></div>
            <p style={{color:"#62748c",fontSize:12}}>Bobot: C 20%, D 40%, Harga 30%, Durasi 10%. Harga terendah sah dan durasi tercepat memperoleh skor 100. Nilai sementara dihitung hanya dari aspek yang sudah lengkap.</p>
          </section>
          <section id="eval-A" style={box}>
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
          <section id="eval-B" style={box}>
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
            <div style={{ overflowX: "auto" }}>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  minWidth: 900,
                }}
              >
                <thead>
                  <tr>
                    {[
                      "Putaran",
                      "Deadline",
                      "Diterima",
                      "Nilai SPH (Rp)",
                      "Verifikasi",
                      "Ketepatan",
                      "Aksi",
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
                  {rounds.map((r, i) => (
                    <tr key={i}>
                      <td data-label="Putaran">
                        <b>SPH {i + 1}</b>
                      </td>
                      <td data-label="Deadline">
                        <input
                          style={input}
                          type="datetime-local"
                          value={r.deadline || ""}
                          onChange={(e) =>
                            set(
                              "sphRounds",
                              rounds.map((x, n) =>
                                n === i
                                  ? { ...x, deadline: e.target.value }
                                  : x,
                              ),
                            )
                          }
                        />
                      </td>
                      <td data-label="Diterima">
                        <input
                          style={input}
                          type="datetime-local"
                          value={r.receivedAt || ""}
                          onChange={(e) =>
                            set(
                              "sphRounds",
                              rounds.map((x, n) =>
                                n === i
                                  ? { ...x, receivedAt: e.target.value }
                                  : x,
                              ),
                            )
                          }
                        />
                      </td>
                      <td data-label="Nilai SPH (Rp)">
                        <input
                          style={input}
                          type="number"
                          min="0"
                          value={r.value ?? ""}
                          onChange={(e) =>
                            set(
                              "sphRounds",
                              rounds.map((x, n) =>
                                n === i
                                  ? { ...x, value: Number(e.target.value) }
                                  : x,
                              ),
                            )
                          }
                        />
                      </td>
                      <td data-label="Verifikasi">
                        <select
                          aria-label={`Verifikasi SPH ${i + 1}`}
                          style={{
                            ...input,
                            minWidth: 155,
                            borderColor:
                              r.verification === "yes"
                                ? "#39a56a"
                                : r.verification === "no"
                                  ? "#dc5b66"
                                  : "#f0a64a",
                            background:
                              r.verification === "yes"
                                ? "#effaf3"
                                : r.verification === "no"
                                  ? "#fff2f3"
                                  : "#fff8ef",
                          }}
                          value={r.verification || "pending"}
                          onChange={(e) =>
                            set(
                              "sphRounds",
                              rounds.map((x, n) =>
                                n === i
                                  ? {
                                      ...x,
                                      verification: e.target.value as any,
                                    }
                                  : x,
                              ),
                            )
                          }
                        >
                          <option value="pending">Belum diperiksa</option>
                          <option value="yes">SPH sah</option>
                          <option value="no">SPH tidak sah</option>
                        </select>
                      </td>
                      <td data-label="Ketepatan">
                        {ontime(r) === null
                          ? pill("Belum lengkap", "warn")
                          : ontime(r)
                            ? pill("Tepat waktu", "good")
                            : pill("Terlambat", "bad")}
                      </td>
                      <td data-label="Aksi">
                        <button
                          style={{ ...btn, color: "#b22e37" }}
                          disabled={rounds.length === 1}
                          onClick={() =>
                            set(
                              "sphRounds",
                              rounds.filter((_, n) => n !== i),
                            )
                          }
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
          <section id="eval-C" style={box}>
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
                    <div><label>Nilai dokumen (1–10)</label><div className="rating-buttons">{Array.from({length:10},(_,i)=>i+1).map((score)=><button key={score} type="button" className={`rating-btn ${(data as any)[`${id}Score`] === score ? "rating-active" : ""}`} onClick={()=>set(`${id}Score` as any,score)}>{score}</button>)}</div></div>
                    <label>
                      Upload dokumen pendukung
                      <input
                        style={input}
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
            <div style={metric}><small>Rata-rata Bagian C</small><strong style={{display:"block",fontSize:18}}>{gateNames.every(([id]) => Number((data as any)[`${id}Score`]) >= 1 && Number((data as any)[`${id}Score`]) <= 10) ? (gateNames.reduce((sum,[id])=>sum+Number((data as any)[`${id}Score`]),0)/gateNames.length).toFixed(2) : "Belum lengkap"}</strong></div>
          </section>
          <section id="eval-D" style={box}>
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
                <div className="rating-buttons">{Array.from({length:10},(_,i)=>i+1).map((score)=><button key={score} type="button" className={`rating-btn ${Number((data.presentation as any)?.[id]) === score ? "rating-active" : ""}`} onClick={()=>set("presentation",{...data.presentation,[id]:score})}>{score}</button>)}</div>
              </div>
            ))}
            <div style={metric}><small>Rata-rata Bagian D</small><strong style={{display:"block",fontSize:18}}>{questions.every(([id]) => Number((data.presentation as any)?.[id]) >= 1 && Number((data.presentation as any)?.[id]) <= 10) ? (questions.reduce((sum,[id])=>sum+Number((data.presentation as any)?.[id]),0)/questions.length).toFixed(2) : "Belum lengkap"}</strong></div>
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
          <section id="eval-E" style={box}>
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
          </section>
          <section id="eval-finalisasi" style={box}>
            <h2>Finalisasi Tender & Keputusan Manajemen</h2>
            <p style={{color:"#62748c",fontSize:12}}>Ranking objektif tidak diubah. Vendor berstatus hijau maupun kuning dapat ditetapkan. Gunakan keputusan khusus manajemen jika memilih selain ranking 1.</p>
            <div style={grid}>
              <label>Jalur keputusan<select style={input} value={config.decision?.mode || "fair"} onChange={(e)=>setConfig((c)=>({...c,decision:{...(c.decision||{}),mode:e.target.value,vendorId:e.target.value === "fair" && leader ? String(leader.vendorId) : c.decision?.vendorId || ""}}))}><option value="fair">Mengikuti hasil evaluasi (ranking 1)</option><option value="management">Keputusan khusus manajemen</option></select></label>
              <label>Vendor yang ditetapkan<select style={input} value={config.decision?.vendorId || (config.decision?.mode !== "management" && leader ? String(leader.vendorId) : "")} onChange={(e)=>setConfig((c)=>({...c,decision:{...(c.decision||{}),mode:c.decision?.mode||"fair",vendorId:e.target.value}}))}><option value="">Pilih vendor</option>{results.map((r)=><option key={r.vendorId} value={r.vendorId}>{r.namaVendor}{r.score !== null ? ` — ${r.score.toFixed(2)}/100` : " — belum lengkap"}</option>)}</select></label>
              <label>Nama penetap / pemberi persetujuan<input style={input} value={config.decision?.approver || ""} onChange={(e)=>setConfig((c)=>({...c,decision:{...(c.decision||{}),mode:c.decision?.mode||"fair",approver:e.target.value}}))} placeholder="Nama dan jabatan pejabat berwenang" /></label>
              <label>Referensi keputusan (opsional)<input style={input} value={config.decision?.reference || ""} onChange={(e)=>setConfig((c)=>({...c,decision:{...(c.decision||{}),mode:c.decision?.mode||"fair",reference:e.target.value}}))} placeholder="Nomor notulen / memo / persetujuan" /></label>
            </div>
            <label style={{display:"block",marginTop:12}}>Alasan dan dasar keputusan {config.decision?.mode === "management" ? "(wajib)" : ""}<textarea style={{...input,minHeight:65}} value={config.decision?.reason || ""} onChange={(e)=>setConfig((c)=>({...c,decision:{...(c.decision||{}),mode:c.decision?.mode||"fair",reason:e.target.value}}))} placeholder="Wajib diisi jika memilih vendor di luar hasil ranking objektif" /></label>
            <div style={{padding:12,background:"#edf5ff",borderRadius:10,fontSize:12,margin:"12px 0"}}><b>Ranking objektif:</b> {leader ? `${leader.namaVendor} — ${leader.score?.toFixed(2)}/100` : "Belum lengkap"}<br/><b>Kelengkapan:</b> {results.filter((r)=>r.data.response!=="tidak").every((r)=>r.score!==null) ? "Seluruh peserta telah dinilai lengkap." : "Belum semua peserta memiliki nilai final."}</div>
            <button style={primary} onClick={finalizeTender} disabled={saving}>{saving ? "Memfinalkan..." : "Finalkan & Tetapkan Pemenang"}</button>
            {config.finalDecision && <div style={{padding:12,background:"#edf5ff",borderRadius:10,fontSize:12,marginTop:14}}><b>Keputusan telah difinalkan dan pemenang telah ditetapkan pada tender</b><br/>Status: {config.finalDecision.mode === "fair" ? "Final – Sesuai Evaluasi" : "Final – Keputusan Manajemen"}<br/>Vendor: <b>{config.finalDecision.vendorName}</b><br/>Skor objektif: {config.finalDecision.score?.toFixed?.(2) ?? config.finalDecision.score ?? "Belum lengkap"}/100<br/>Disetujui oleh: {config.finalDecision.approver}<br/>Waktu: {new Date(config.finalDecision.timestamp).toLocaleString("id-ID")}<br/>Alasan: {config.finalDecision.reason || "Mengikuti hasil evaluasi objektif"}<br/>Referensi: {config.finalDecision.reference || "—"}</div>}
          </section>
        </main>
      </div>
      <style jsx>{`
        .presentation-head { display:flex; justify-content:space-between; align-items:center; gap:12px; margin-bottom:10px; }
        .presentation-value { font-weight:800; color:#f36b00; white-space:nowrap; }
        .rating-buttons { display:grid; grid-template-columns:repeat(10,minmax(0,1fr)); gap:7px; }
        .rating-btn { padding:10px 0; border:1px solid #cbd8eb; border-radius:8px; background:#fff; color:#193455; font-weight:700; cursor:pointer; }
        .rating-btn:hover { background:#fff1df; border-color:#f36b00; }
        .rating-btn.rating-active { background:#f36b00; border-color:#f36b00; color:#fff; }
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
