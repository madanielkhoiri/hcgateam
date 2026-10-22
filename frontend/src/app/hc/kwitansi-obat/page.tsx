"use client";

import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import {
  BellRing,
  CheckCircle2,
  CircleX,
  FileSpreadsheet,
  Plus,
  Send,
  Trash2,
  WalletCards,
} from "lucide-react";
import { getAccessToken } from "@/lib/access-control";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";
type Employee = {
  id: number;
  nik: string;
  nama: string;
  gender?: string | null;
  noTelepon?: string | null;
};
type Log = {
  id: number;
  status: string;
  nominal?: string | number | null;
  createdAt: string;
  karyawan?: { nama: string; nik: string } | null;
};
type BarisBlast = {
  key: number;
  nrp: string;
  nama: string;
  cocok: boolean;
  status: "DISETUJUI" | "DITRANSFER";
  nominal: string;
};
type PreviewImport = {
  totalBaris: number;
  totalKaryawan: number;
  totalKaryawanUnik?: number;
  totalCocok: number;
  totalTidakCocok: number;
  totalNominal: number;
  data: Array<{
    nrp: string;
    namaExcel: string;
    namaDatabase: string | null;
    karyawanId: number | null;
    jumlah: number;
    jumlahKwitansi: number;
    cocok: boolean;
  }>;
};

const barisKosong = (key: number): BarisBlast => ({
  key,
  nrp: "",
  nama: "",
  cocok: false,
  status: "DISETUJUI",
  nominal: "",
});

export default function KwitansiObatPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [karyawanId, setKaryawanId] = useState("");
  const [cariKaryawan, setCariKaryawan] = useState("");
  const [status, setStatus] = useState("DISETUJUI");
  const [nominal, setNominal] = useState("");
  const [alasan, setAlasan] = useState("");
  const [pesan, setPesan] = useState("");
  const [logs, setLogs] = useState<Log[]>([]);
  const [tab, setTab] = useState<"input" | "rekap">("input");
  const [barisBlast, setBarisBlast] = useState<BarisBlast[]>([
    barisKosong(Date.now()),
  ]);
  const [prosesBlast, setProsesBlast] = useState(false);
  const [pesanBlast, setPesanBlast] = useState("");
  const token = getAccessToken();
  const muatData = () => {
    const headers = { Authorization: `Bearer ${token}` };
    fetch(`${API}/kwitansi-obat/karyawan`, { headers })
      .then((r) => r.json())
      .then(setEmployees)
      .catch(() => setEmployees([]));
    fetch(`${API}/kwitansi-obat`, { headers })
      .then((r) => r.json())
      .then(setLogs)
      .catch(() => setLogs([]));
  };
  useEffect(() => {
    muatData();
  }, [token]);

  useEffect(() => {
    const sinkronkanTab = () =>
      setTab(window.location.hash === "#rekap" ? "rekap" : "input");
    sinkronkanTab();
    window.addEventListener("hashchange", sinkronkanTab);
    return () => window.removeEventListener("hashchange", sinkronkanTab);
  }, []);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setPesan("Menyimpan...");
    const r = await fetch(`${API}/kwitansi-obat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        karyawanId: Number(karyawanId),
        status,
        nominal: nominal ? Number(nominal) : undefined,
        alasan: alasan || undefined,
      }),
    });
    const data = await r.json();
    setPesan(
      r.ok
        ? `Tersimpan. Notifikasi WA ${data.terkirim ? "terkirim" : "belum terkirim (nomor/token belum aktif)"}.`
        : data.message || "Gagal menyimpan.",
    );
    if (r.ok) muatData();
  }
  async function ubahStatus(id: number, next: string) {
    let nominalValue: number | undefined;
    if (next === "DITRANSFER") {
      const raw = window.prompt("Masukkan nominal transfer (Rupiah):");
      if (!raw || Number(raw) <= 0) return;
      nominalValue = Number(raw);
    }
    const alasanValue =
      next === "DITOLAK"
        ? window.prompt("Masukkan alasan penolakan:") || ""
        : undefined;
    const r = await fetch(`${API}/kwitansi-obat/${id}/status`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        status: next,
        nominal: nominalValue,
        alasan: alasanValue,
      }),
    });
    setPesan(
      r.ok
        ? "Status diperbarui dan notifikasi dikirim."
        : "Status gagal diperbarui.",
    );
    muatData();
  }

  function ubahBaris(key: number, perubahan: Partial<BarisBlast>) {
    setBarisBlast((lama) =>
      lama.map((item) =>
        item.key === key
          ? {
              ...item,
              ...perubahan,
              ...(perubahan.status === "DISETUJUI" ? { nominal: "" } : {}),
            }
          : item,
      ),
    );
  }

  function pilihKaryawan(key: number, value: string) {
    const cocok = employees.find(
      (item) =>
        `${item.nama} — ${item.nik}`.toLowerCase() === value.toLowerCase() ||
        item.nik === value.trim(),
    );
    ubahBaris(
      key,
      cocok
        ? { nrp: cocok.nik, nama: cocok.nama, cocok: true }
        : { nrp: "", nama: value, cocok: false },
    );
  }

  async function previewExcel(file?: File) {
    if (!file) return;
    setProsesBlast(true);
    setPesanBlast("Membaca sheet Template HO...");
    const form = new FormData();
    form.append("file", file);
    try {
      const response = await fetch(`${API}/kwitansi-obat/preview-import`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      const hasil = (await response.json()) as PreviewImport & {
        message?: string | string[];
      };
      if (!response.ok) {
        throw new Error(
          Array.isArray(hasil.message)
            ? hasil.message.join(", ")
            : hasil.message || "Gagal membaca Excel",
        );
      }
      setBarisBlast(
        hasil.data.map((item, index) => ({
          key: Date.now() + index,
          nrp: item.nrp,
          nama: item.namaDatabase || item.namaExcel,
          cocok: item.cocok,
          status: "DITRANSFER",
          nominal: String(item.jumlah),
        })),
      );
      setPesanBlast(
        `${hasil.totalCocok} baris cocok dari ${hasil.totalKaryawan} baris Excel (${hasil.totalKaryawanUnik ?? "-"} NRP unik); ${hasil.totalTidakCocok} baris tidak cocok. Total Rp ${hasil.totalNominal.toLocaleString("id-ID")}.`,
      );
    } catch (error) {
      setPesanBlast((error as Error).message);
    } finally {
      setProsesBlast(false);
    }
  }

  async function kirimBlast() {
    const belumCocok = barisBlast.filter((item) => item.nrp && !item.cocok);
    if (belumCocok.length) {
      setPesanBlast(
        `${belumCocok.length} NRP belum cocok dengan Database Karyawan. Perbaiki pilihan karyawan atau hapus baris tersebut.`,
      );
      return;
    }
    const data = barisBlast
      .filter((item) => item.nrp)
      .map((item) => ({
        nrp: item.nrp,
        status: item.status,
        ...(item.status === "DITRANSFER"
          ? { nominal: Number(item.nominal) }
          : {}),
      }));
    if (!data.length) {
      setPesanBlast("Tambahkan minimal satu karyawan.");
      return;
    }
    if (
      data.some(
        (item) =>
          item.status === "DITRANSFER" && (!item.nominal || item.nominal <= 0),
      )
    ) {
      setPesanBlast("Nominal wajib diisi untuk semua status Ditransfer.");
      return;
    }
    setProsesBlast(true);
    setPesanBlast("Menyimpan dan mengirim notifikasi...");
    try {
      const response = await fetch(`${API}/kwitansi-obat/massal`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ data, kirimNotifikasi: true }),
      });
      const hasil = await response.json();
      if (!response.ok) throw new Error(hasil.message || "Blast gagal");
      setPesanBlast(
        `${hasil.tersimpan} data tersimpan. WA terkirim ${hasil.notifikasi?.terkirim ?? 0}, gagal ${hasil.notifikasi?.gagal ?? 0}, tanpa nomor ${hasil.notifikasi?.tanpaNomor ?? 0}.`,
      );
      muatData();
    } catch (error) {
      setPesanBlast((error as Error).message);
    } finally {
      setProsesBlast(false);
    }
  }
  const bulan = new Intl.DateTimeFormat("id-ID", {
    month: "long",
    year: "numeric",
  }).format(new Date());
  const bulanLogs = logs.filter(
    (l) =>
      new Date(l.createdAt).getMonth() === new Date().getMonth() &&
      new Date(l.createdAt).getFullYear() === new Date().getFullYear(),
  );
  const total = bulanLogs.reduce(
    (sum, l) => sum + (l.status === "DITRANSFER" ? Number(l.nominal || 0) : 0),
    0,
  );
  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#f3f7fd",
        padding: "34px 24px",
        color: "#102d59",
      }}
    >
      <div style={{ maxWidth: 1060, margin: "0 auto" }}>
        <section
          style={{
            background: "linear-gradient(135deg,#075dcc,#0879e8)",
            borderRadius: 18,
            padding: "28px 32px",
            color: "#fff",
            display: "flex",
            alignItems: "center",
            gap: 18,
            boxShadow: "0 12px 30px rgba(21,91,180,.18)",
          }}
        >
          <span
            style={{
              width: 58,
              height: 58,
              borderRadius: 16,
              background: "rgba(255,255,255,.18)",
              display: "grid",
              placeItems: "center",
            }}
          >
            <WalletCards size={30} />
          </span>
          <div>
            <div
              style={{
                fontSize: 13,
                fontWeight: 700,
                letterSpacing: 1,
                opacity: 0.8,
              }}
            >
              COMBEN & BENEFIT
            </div>
            <h1 style={{ margin: "5px 0 3px", fontSize: 28 }}>Kwitansi Obat</h1>
            <p style={{ margin: 0, opacity: 0.88 }}>
              Kelola status dan kirim notifikasi WhatsApp kepada karyawan.
            </p>
          </div>
        </section>
        <section
          style={{
            display: tab === "input" ? "block" : "none",
            marginTop: 22,
            background: "#fff",
            border: "1px solid #dce7f5",
            borderRadius: 16,
            padding: 24,
            boxShadow: "0 6px 18px rgba(20,63,120,.06)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              gap: 16,
              flexWrap: "wrap",
            }}
          >
            <div>
              <h2 style={{ margin: 0, fontSize: 19 }}>Blast Kwitansi Obat</h2>
              <p style={{ color: "#7185a3", margin: "7px 0 0" }}>
                Tambahkan beberapa karyawan atau isi otomatis dari sheet
                Template HO.
              </p>
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <label
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "10px 14px",
                  border: "1px solid #b9d3f4",
                  borderRadius: 9,
                  color: "#1769e0",
                  fontWeight: 700,
                  cursor: prosesBlast ? "wait" : "pointer",
                }}
              >
                <FileSpreadsheet size={17} /> Import Template HO
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  disabled={prosesBlast}
                  onChange={(event) => {
                    void previewExcel(event.target.files?.[0]);
                    event.target.value = "";
                  }}
                  style={{ display: "none" }}
                />
              </label>
              <button
                type="button"
                onClick={() =>
                  setBarisBlast((lama) => [...lama, barisKosong(Date.now())])
                }
                style={{
                  border: 0,
                  borderRadius: 9,
                  background: "#eaf3ff",
                  color: "#1769e0",
                  padding: "10px 14px",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                <Plus size={17} style={{ verticalAlign: "middle" }} /> Tambah
                Karyawan
              </button>
            </div>
          </div>

          <datalist id="daftar-karyawan-blast">
            {employees.map((item) => (
              <option key={item.id} value={`${item.nama} — ${item.nik}`} />
            ))}
          </datalist>

          <div style={{ overflowX: "auto", marginTop: 20 }}>
            <table
              style={{
                width: "100%",
                minWidth: 820,
                borderCollapse: "collapse",
                fontSize: 14,
              }}
            >
              <thead>
                <tr style={{ background: "#f3f7fd" }}>
                  {[
                    "No",
                    "NRP / Nama Karyawan",
                    "Status",
                    "Nominal Transfer",
                    "Aksi",
                  ].map((judul) => (
                    <th
                      key={judul}
                      style={{
                        padding: 11,
                        textAlign: "left",
                        color: "#56708f",
                      }}
                    >
                      {judul}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {barisBlast.map((item, index) => (
                  <tr
                    key={item.key}
                    style={{ borderBottom: "1px solid #edf2f8" }}
                  >
                    <td style={{ padding: 9 }}>{index + 1}</td>
                    <td style={{ padding: 9, minWidth: 310 }}>
                      <input
                        value={
                          item.nrp ? `${item.nama} — ${item.nrp}` : item.nama
                        }
                        onChange={(event) =>
                          pilihKaryawan(item.key, event.target.value)
                        }
                        list="daftar-karyawan-blast"
                        placeholder="Ketik nama atau NRP"
                        style={{
                          ...inputStyle,
                          borderColor:
                            item.nrp && !item.cocok ? "#ef5b70" : "#cddcf0",
                          background:
                            item.nrp && !item.cocok ? "#fff4f5" : "#fbfdff",
                        }}
                      />
                      {item.nrp && !item.cocok && (
                        <small
                          style={{
                            display: "block",
                            color: "#d9485f",
                            marginTop: 5,
                            fontWeight: 700,
                          }}
                        >
                          NRP {item.nrp} tidak ditemukan — pilih karyawan yang
                          benar atau hapus baris.
                        </small>
                      )}
                    </td>
                    <td style={{ padding: 9 }}>
                      <select
                        value={item.status}
                        onChange={(event) =>
                          ubahBaris(item.key, {
                            status: event.target.value as BarisBlast["status"],
                          })
                        }
                        style={{ ...inputStyle, minWidth: 145 }}
                      >
                        <option value="DISETUJUI">Disetujui</option>
                        <option value="DITRANSFER">Ditransfer</option>
                      </select>
                    </td>
                    <td style={{ padding: 9 }}>
                      {item.status === "DITRANSFER" ? (
                        <input
                          type="number"
                          min="1"
                          value={item.nominal}
                          onChange={(event) =>
                            ubahBaris(item.key, { nominal: event.target.value })
                          }
                          placeholder="Rp"
                          style={{ ...inputStyle, minWidth: 155 }}
                        />
                      ) : (
                        <span style={{ color: "#91a3bd" }}>
                          Belum ditransfer
                        </span>
                      )}
                    </td>
                    <td style={{ padding: 9 }}>
                      <button
                        type="button"
                        aria-label="Hapus karyawan"
                        onClick={() =>
                          setBarisBlast((lama) => {
                            const hasil = lama.filter(
                              (baris) => baris.key !== item.key,
                            );
                            return hasil.length
                              ? hasil
                              : [barisKosong(Date.now())];
                          })
                        }
                        style={{
                          border: 0,
                          borderRadius: 8,
                          padding: 9,
                          color: "#d9485f",
                          background: "#fff0f2",
                          cursor: "pointer",
                        }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 14,
              marginTop: 18,
              flexWrap: "wrap",
            }}
          >
            <div style={{ color: "#56708f", fontSize: 13 }}>{pesanBlast}</div>
            <button
              type="button"
              disabled={prosesBlast}
              onClick={() => void kirimBlast()}
              style={{
                border: 0,
                borderRadius: 10,
                background: prosesBlast ? "#91a3bd" : "#0879e8",
                color: "#fff",
                padding: "12px 18px",
                fontWeight: 700,
                cursor: prosesBlast ? "wait" : "pointer",
              }}
            >
              <Send
                size={17}
                style={{ verticalAlign: "middle", marginRight: 7 }}
              />
              Simpan & Kirim Semua Notifikasi
            </button>
          </div>
        </section>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0,1fr) 320px",
            gap: 22,
            marginTop: 22,
          }}
        >
          <section
            id="input"
            style={{
              display: tab === "input" ? "block" : "none",
              background: "#fff",
              border: "1px solid #dce7f5",
              borderRadius: 16,
              padding: 26,
              boxShadow: "0 6px 18px rgba(20,63,120,.06)",
            }}
          >
            <h2 style={{ margin: 0, fontSize: 19 }}>Kirim Notifikasi</h2>
            <p style={{ color: "#7185a3", marginTop: 7 }}>
              Pilih karyawan lalu tentukan status kwitansi obat.
            </p>
            <form
              onSubmit={submit}
              style={{ display: "grid", gap: 17, marginTop: 22 }}
            >
              <label style={{ display: "grid", gap: 7, fontWeight: 600 }}>
                Cari Karyawan (Nama / NRP)
                <input
                  required
                  value={cariKaryawan}
                  onChange={(e) => {
                    const value = e.target.value;
                    setCariKaryawan(value);
                    const cocok = employees.find(
                      (k) =>
                        `${k.nama} — ${k.nik}`.toLowerCase() ===
                          value.toLowerCase() || k.nik === value,
                    );
                    if (cocok) setKaryawanId(String(cocok.id));
                  }}
                  placeholder="Ketik nama atau NRP..."
                  list="daftar-karyawan"
                  style={inputStyle}
                />
                <datalist id="daftar-karyawan">
                  {employees
                    .filter(
                      (e) =>
                        !cariKaryawan ||
                        `${e.nama} ${e.nik}`
                          .toLowerCase()
                          .includes(cariKaryawan.toLowerCase()),
                    )
                    .map((e) => (
                      <option key={e.id} value={`${e.nama} — ${e.nik}`} />
                    ))}
                </datalist>
                {karyawanId && (
                  <small style={{ color: "#0a9b61" }}>
                    Karyawan terpilih:{" "}
                    {employees.find((e) => String(e.id) === karyawanId)?.nama}
                  </small>
                )}
              </label>
              <div>
                <div style={{ fontWeight: 600, marginBottom: 9 }}>
                  Status Kwitansi
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(3,1fr)",
                    gap: 10,
                  }}
                >
                  {[
                    ["DISETUJUI", "Disetujui", "#0a9b61", CheckCircle2],
                    ["DITRANSFER", "Ditransfer", "#1769e0", BellRing],
                    ["DITOLAK", "Ditolak", "#d9485f", CircleX],
                  ].map(([value, label, color, Icon]: any) => (
                    <button
                      type="button"
                      key={value}
                      onClick={() => setStatus(value)}
                      style={{
                        border: `1px solid ${status === value ? color : "#dce7f5"}`,
                        background: status === value ? `${color}12` : "#fff",
                        color: status === value ? color : "#56708f",
                        borderRadius: 11,
                        padding: "13px 8px",
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      <Icon
                        size={18}
                        style={{ verticalAlign: "middle", marginRight: 5 }}
                      />
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              {status === "DITRANSFER" && (
                <label style={{ display: "grid", gap: 7, fontWeight: 600 }}>
                  Nominal (Rupiah)
                  <input
                    type="number"
                    min="1"
                    value={nominal}
                    onChange={(e) => setNominal(e.target.value)}
                    required
                    placeholder="Contoh: 250000"
                    style={inputStyle}
                  />
                </label>
              )}
              {status === "DITOLAK" && (
                <label style={{ display: "grid", gap: 7, fontWeight: 600 }}>
                  Alasan penolakan
                  <textarea
                    value={alasan}
                    onChange={(e) => setAlasan(e.target.value)}
                    required
                    placeholder="Tuliskan alasan..."
                    style={{ ...inputStyle, minHeight: 92, resize: "vertical" }}
                  />
                </label>
              )}
              <button
                type="submit"
                style={{
                  border: 0,
                  borderRadius: 10,
                  background: "#0879e8",
                  color: "#fff",
                  padding: "13px 18px",
                  fontWeight: 700,
                  fontSize: 15,
                  cursor: "pointer",
                }}
              >
                Simpan & Kirim Notifikasi
              </button>
              {pesan && (
                <div
                  style={{
                    padding: 12,
                    borderRadius: 9,
                    background: "#eef6ff",
                    color: "#1769e0",
                  }}
                >
                  {pesan}
                </div>
              )}
            </form>
          </section>
          <aside
            style={{
              background: "#fff",
              border: "1px solid #dce7f5",
              borderRadius: 16,
              padding: 24,
              boxShadow: "0 6px 18px rgba(20,63,120,.06)",
              alignSelf: "start",
            }}
          >
            <h2 style={{ margin: 0, fontSize: 18 }}>Rekap {bulan}</h2>
            <div
              style={{
                marginTop: 16,
                padding: 15,
                background: "#eef6ff",
                borderRadius: 10,
              }}
            >
              <div style={{ color: "#7185a3", fontSize: 13 }}>
                Total ditransfer bulan ini
              </div>
              <strong
                style={{
                  display: "block",
                  color: "#1769e0",
                  fontSize: 22,
                  marginTop: 4,
                }}
              >
                Rp {total.toLocaleString("id-ID")}
              </strong>
            </div>
          </aside>
        </div>
        <section
          id="rekap"
          style={{
            display: tab === "rekap" ? "block" : "none",
            background: "#fff",
            border: "1px solid #dce7f5",
            borderRadius: 16,
            padding: 24,
            marginTop: 22,
            overflowX: "auto",
          }}
        >
          <h2 style={{ margin: 0, fontSize: 19 }}>Rekapan Notifikasi</h2>
          <p style={{ color: "#7185a3", marginTop: 6 }}>
            Riwayat status dan nominal kwitansi obat.
          </p>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              marginTop: 15,
              fontSize: 14,
            }}
          >
            <thead>
              <tr style={{ background: "#f3f7fd", textAlign: "left" }}>
                {["Tanggal", "Karyawan", "Status", "Nominal", "Aksi"].map(
                  (h) => (
                    <th key={h} style={{ padding: 12, color: "#56708f" }}>
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {logs.length ? (
                logs.map((l) => (
                  <tr key={l.id} style={{ borderBottom: "1px solid #edf2f8" }}>
                    <td style={{ padding: 12 }}>
                      {new Date(l.createdAt).toLocaleDateString("id-ID")}
                    </td>
                    <td style={{ padding: 12, fontWeight: 600 }}>
                      {l.karyawan?.nama || "-"}
                    </td>
                    <td style={{ padding: 12 }}>
                      <select
                        value={l.status}
                        onChange={(e) => void ubahStatus(l.id, e.target.value)}
                        style={{
                          ...inputStyle,
                          padding: "7px 9px",
                          width: 140,
                        }}
                      >
                        <option value="DISETUJUI">Disetujui</option>
                        <option value="DITRANSFER">Ditransfer</option>
                        <option value="DITOLAK">Ditolak</option>
                      </select>
                    </td>
                    <td style={{ padding: 12 }}>
                      {l.nominal
                        ? `Rp ${Number(l.nominal).toLocaleString("id-ID")}`
                        : "-"}
                    </td>
                    <td style={{ padding: 12 }}>
                      <button
                        type="button"
                        onClick={() => {
                          const next = window.prompt(
                            "Ubah status (DISETUJUI / DITRANSFER / DITOLAK):",
                            l.status,
                          );
                          if (
                            next &&
                            ["DISETUJUI", "DITRANSFER", "DITOLAK"].includes(
                              next.toUpperCase(),
                            )
                          )
                            void ubahStatus(l.id, next.toUpperCase());
                        }}
                        style={{
                          color: "#1769e0",
                          border: 0,
                          background: "transparent",
                          cursor: "pointer",
                          fontWeight: 700,
                          marginRight: 10,
                        }}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm("Hapus rekapan ini?"))
                            fetch(`${API}/kwitansi-obat/${l.id}`, {
                              method: "DELETE",
                              headers: { Authorization: `Bearer ${token}` },
                            }).then(() => muatData());
                        }}
                        style={{
                          color: "#d9485f",
                          border: 0,
                          background: "transparent",
                          cursor: "pointer",
                          fontWeight: 700,
                        }}
                      >
                        Hapus
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={5}
                    style={{
                      padding: 24,
                      textAlign: "center",
                      color: "#7185a3",
                    }}
                  >
                    Belum ada rekapan.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </section>
      </div>
    </main>
  );
}

const navStyle: CSSProperties = {
  padding: "10px 16px",
  borderRadius: 9,
  background: "#fff",
  border: "1px solid #dce7f5",
  color: "#1769e0",
  textDecoration: "none",
  fontWeight: 700,
};
const inputStyle: CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  border: "1px solid #cddcf0",
  borderRadius: 9,
  padding: "12px 13px",
  color: "#18385f",
  background: "#fbfdff",
  fontSize: 14,
};
