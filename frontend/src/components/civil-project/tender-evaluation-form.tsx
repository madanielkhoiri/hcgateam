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
] as const;
const weights = [
  ["Harga", 35],
  ["Durasi", 15],
  ["Presentasi", 40],
  ["Ketepatan SPH", 5],
  ["Respons undangan", 3],
  ["Manpower", 2],
] as const;
const empty: TenderEvaluationData = {
  response: "",
  sphRounds: [
    { deadline: "", receivedAt: "", value: undefined, verification: "pending" },
  ],
  presentation: {},
  recommendationStatus: "",
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
    const docs =
      id === "admin"
        ? v.evaluasi?.dokumenAdminFiles
        : v.evaluasi?.dokumenHseFiles;
    return score === null ||
      !Number.isInteger(score) ||
      score < 1 ||
      score > 100 ||
      !docs?.length
      ? "pending"
      : score >= 70
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
    [config, setConfig] = useState<Record<string, any>>({}),
    [admin, setAdmin] = useState<File[]>([]),
    [hse, setHse] = useState<File[]>([]),
    [saving, setSaving] = useState(false),
    [error, setError] = useState("");
  const load = () =>
    epromApi.tender.evaluasiVendor
      .daftar(tenderId)
      .then((r) => {
        setReport(r);
        setConfig(r.config || {});
        const id = selected ?? r.vendors[0]?.vendorId ?? null;
        setSelected(id);
        setData(r.vendors.find((v) => v.vendorId === id)?.data || empty);
      })
      .catch((e) => setError(e.message));
  useEffect(() => {
    void load();
  }, [tenderId]);
  const vendor = report?.vendors.find((v) => v.vendorId === selected);
  const set = (k: keyof TenderEvaluationData, v: any) =>
    setData((d) => ({ ...d, [k]: v }));
  const choose = (id: number) => {
    const v = report?.vendors.find((x) => x.vendorId === id);
    setSelected(id);
    setData(v?.data || empty);
    setAdmin([]);
    setHse([]);
  };
  const results = useMemo(() => {
    if (!report) return [];
    const pool = report.vendors.filter(
      (v) =>
        gate(v) === "pass" &&
        v.data.response === "ikut" &&
        finalPrice(v.data) !== null &&
        Number(v.data.durationDays) > 0,
    );
    const minP = pool.length
        ? Math.min(...pool.map((v) => finalPrice(v.data)!))
        : null,
      minD = pool.length
        ? Math.min(...pool.map((v) => Number(v.data.durationDays)))
        : null;
    return report.vendors
      .map((v) => {
        const d = v.vendorId === selected ? data : v.data,
          price = finalPrice(d),
          rounds = d.sphRounds || [],
          pres = questions.map(([k]) => (d.presentation as any)?.[k]),
          present = pres.every((x) => typeof x === "boolean")
            ? pres.filter(Boolean).length / pres.length
            : null,
          time =
            rounds.length && rounds.every((r) => ontime(r) !== null)
              ? rounds.filter((r) => ontime(r)).length / rounds.length
              : null,
          response =
            d.response === "ikut" &&
            d.responseDate &&
            d.invitationDate &&
            new Date(d.responseDate) >= new Date(`${d.invitationDate}T00:00`)
              ? 1
              : null,
          need = n(config.manpowerRequirement),
          off = n(d.manpowerOffered),
          mp =
            need !== null && off !== null && need >= 0 && off >= 0
              ? need === 0
                ? 1
                : Math.min(1, off / need)
              : null;
        const parts: any = {
          Harga: minP !== null && price !== null ? minP / price : null,
          Durasi:
            minD !== null && Number(d.durationDays) > 0
              ? minD / Number(d.durationDays)
              : null,
          Presentasi: present,
          "Ketepatan SPH": time,
          "Respons undangan": response,
          Manpower: mp,
        };
        const missing = weights.filter(
          ([k]) => parts[k] === null || !Number.isFinite(parts[k]),
        );
        const eligible =
          gate({ ...v, data: d }) === "pass" &&
          d.response === "ikut" &&
          price !== null &&
          Number(d.durationDays) > 0;
        const score =
          eligible && !missing.length
            ? weights.reduce((s, [k, w]) => s + parts[k] * w, 0)
            : null;
        return {
          ...v,
          data: d,
          price,
          status: gate({ ...v, data: d }),
          parts,
          score,
        };
      })
      .sort((a, b) => (b.score ?? -1) - (a.score ?? -1));
  }, [report, selected, data, config]);
  const qualified = results.filter((r) => r.score !== null),
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
      setData(r.vendors.find((v) => v.vendorId === selected)?.data || adjusted);
      setAdmin([]);
      setHse([]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal menyimpan");
    } finally {
      setSaving(false);
    }
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
            <h2>Dashboard Penentuan Pemenang</h2>
            <div
              style={{
                ...grid,
                gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))",
              }}
            >
              {[
                ["Vendor", report.vendors.length],
                [
                  "Lulus Wajib",
                  results.filter((r) => r.status === "pass").length,
                ],
                ["Ranking Valid", qualified.length],
                [
                  "Rekomendasi Pemenang",
                  leader?.namaVendor || "Belum tersedia",
                ],
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
                  minWidth: 760,
                }}
              >
                <thead>
                  <tr>
                    {[
                      "Rank",
                      "Vendor",
                      "SPH Terakhir Sah",
                      "Durasi",
                      "Margin vs Internal",
                      "Nilai / 100",
                      "Status",
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
                        {r.score === null
                          ? "—"
                          : qualified.findIndex(
                              (q) => q.vendorId === r.vendorId,
                            ) + 1}
                      </td>
                      <td style={{ padding: 9 }}>
                        <b>{r.namaVendor}</b>
                      </td>
                      <td>{r.price === null ? "—" : formatRupiah(r.price)}</td>
                      <td>{r.data.durationDays || "—"} hari</td>
                      <td>
                        {r.price && Number(config.internalPrice) > 0
                          ? `${(((Number(config.internalPrice) - r.price) / Number(config.internalPrice)) * 100).toFixed(2)}%`
                          : "—"}
                      </td>
                      <td>{r.score?.toFixed(2) || "—"}</td>
                      <td>
                        {r.status === "fail"
                          ? pill("Gugur", "bad")
                          : r.status === "pending"
                            ? pill("Belum lulus wajib", "warn")
                            : r.data.response !== "ikut"
                              ? pill("Tidak ikut / belum respons", "warn")
                              : r.price === null
                                ? pill("SPH belum sah", "warn")
                                : !r.data.durationDays
                                  ? pill("Durasi belum diisi", "warn")
                                  : r.score === null
                                    ? pill("Data belum lengkap", "warn")
                                    : leader?.vendorId === r.vendorId
                                      ? pill("Rekomendasi pemenang", "good")
                                      : pill("Lulus", "good")}
                      </td>
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
              Vendor dengan persyaratan wajib lulus, SPH terakhir sah, dan data
              evaluasi lengkap masuk ranking otomatis. Nilai tertinggi menjadi
              rekomendasi pemenang dan proses pekerjaan dilanjutkan melalui
              kontrak.
            </div>
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
            <div style={{ ...grid, marginTop: 14 }}>
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
                  value={data.durationDays ?? ""}
                  onChange={(e) => set("durationDays", Number(e.target.value))}
                />
              </label>
              <div style={metric}>
                <small>Margin terhadap Harga Internal</small>
                <strong style={{ display: "block", fontSize: 18 }}>
                  {validPrice !== null && Number(config.internalPrice) > 0
                    ? `${(((Number(config.internalPrice) - validPrice) / Number(config.internalPrice)) * 100).toFixed(2)}%`
                    : "—"}
                </strong>
                <small>
                  (Harga internal − SPH final) / Harga internal × 100%
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
          </section>
          <section id="eval-C" style={box}>
            <h2>C. Penilaian Dokumen Pendukung (1–100)</h2>
            <p style={{ color: "#62748c", fontSize: 12 }}>
              Unggah dokumen pendukung untuk setiap aspek (maks. 2 MB/file),
              lalu berikan nilai 1–100 berdasarkan isi dokumen. Skor tanpa
              dokumen belum dianggap terverifikasi. Ambang lulus: 70 untuk
              setiap aspek.
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
                    <label>
                      Nilai dokumen (1–100)
                      <input
                        style={input}
                        type="number"
                        min="1"
                        max="100"
                        step="1"
                        value={(data as any)[`${id}Score`] ?? ""}
                        onChange={(e) =>
                          set(`${id}Score` as any, Number(e.target.value))
                        }
                      />
                    </label>
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
          </section>
          <section id="eval-D" style={box}>
            <h2>D. Presentasi & Pemahaman Vendor</h2>
            <p style={{ color: "#62748c", fontSize: 12 }}>
              Nilai berdasarkan hasil presentasi yang dapat dibuktikan, bukan
              sekadar cara berbicara. Setiap vendor mendapat pertanyaan dan
              kriteria yang setara.
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
                <b>{name}</b>
                <select
                  style={{ ...input, marginTop: 7 }}
                  value={
                    (data.presentation as any)?.[id] === true
                      ? "yes"
                      : (data.presentation as any)?.[id] === false
                        ? "no"
                        : ""
                  }
                  onChange={(e) =>
                    set("presentation", {
                      ...data.presentation,
                      [id]:
                        e.target.value === ""
                          ? undefined
                          : e.target.value === "yes",
                    })
                  }
                >
                  <option value="">Belum dinilai</option>
                  <option value="yes">Mampu menjelaskan / memenuhi</option>
                  <option value="no">Belum mampu / tidak memenuhi</option>
                </select>
              </div>
            ))}
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
          <section id="eval-F" style={box}>
            <h2>F. Rekomendasi Tender</h2>
            {leader ? (
              <div
                style={{
                  padding: 12,
                  background: "#edf5ff",
                  borderRadius: 10,
                  fontSize: 12,
                }}
              >
                <b>Rekomendasi sementara: {leader.namaVendor}</b>
                <br />
                Nilai {leader.score?.toFixed(2)}/100 • SPH{" "}
                {formatRupiah(leader.price!)} • Durasi{" "}
                {leader.data.durationDays} hari. Berlaku setelah validasi bukti
                dan kewajaran durasi.
              </div>
            ) : (
              <div
                style={{
                  padding: 12,
                  background: "#fff8e9",
                  border: "1px solid #efd9aa",
                  borderRadius: 10,
                  fontSize: 12,
                }}
              >
                Belum ada pemenang yang dapat direkomendasikan. Lengkapi
                verifikasi wajib, SPH final, durasi, presentasi, undangan, dan
                manpower.
              </div>
            )}
            <h3>Rincian nilai vendor terpilih</h3>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: "left" }}>Aspek</th>
                    <th>Bobot</th>
                    <th>Skor indikator</th>
                  </tr>
                </thead>
                <tbody>
                  {weights.map(([k, w]) => (
                    <tr key={k}>
                      <td>{k}</td>
                      <td style={{ textAlign: "center" }}>{w}%</td>
                      <td style={{ textAlign: "center" }}>
                        {current?.parts[k] === null ||
                        current?.parts[k] === undefined
                          ? "Belum lengkap"
                          : `${(current.parts[k] * 100).toFixed(1)}%`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ ...grid, marginTop: 13 }}>
              <label>
                Nama Evaluator
                <input
                  style={input}
                  value={config.evaluatorName ?? ""}
                  onChange={(e) =>
                    setConfig((c) => ({ ...c, evaluatorName: e.target.value }))
                  }
                />
              </label>
              <label>
                Pejabat Penetap
                <input
                  style={input}
                  value={config.approverName ?? ""}
                  onChange={(e) =>
                    setConfig((c) => ({ ...c, approverName: e.target.value }))
                  }
                />
              </label>
              <label>
                Status Rekomendasi
                <select
                  style={input}
                  value={data.recommendationStatus || ""}
                  onChange={(e) => set("recommendationStatus", e.target.value)}
                >
                  <option value="">Pilih status</option>
                  <option value="recommended">Direkomendasikan</option>
                  <option value="not_recommended">
                    Tidak Direkomendasikan
                  </option>
                </select>
              </label>
            </div>
            <label style={{ display: "block", marginTop: 12 }}>
              Catatan Keputusan
              <textarea
                style={{ ...input, minHeight: 65 }}
                value={data.decisionNotes || ""}
                onChange={(e) => set("decisionNotes", e.target.value)}
              />
            </label>
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
              Status rekomendasi dipilih untuk vendor yang sedang ditampilkan.
              Rekomendasi sistem bukan penetapan resmi. Data dan bukti wajib
              diverifikasi oleh tim pengadaan; penetapan pemenang oleh pejabat
              yang berwenang.
            </div>
          </section>
        </main>
      </div>
      <style jsx>{`
        @media (max-width: 900px) {
          .evaluation-layout {
            grid-template-columns: 1fr !important;
          }
          .evaluation-aside {
            position: static !important;
          }
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
