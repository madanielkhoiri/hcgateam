"use client";

import {
  CalendarDays,
  CheckCircle2,
  ExternalLink,
  FileCheck2,
  MapPin,
  WalletCards,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  suratTugasKaryawanApi,
  type SuratTugasKaryawanSaya,
} from "@/lib/surat-tugas-dinas-karyawan-api";

const formatRupiah = (nilai: number) =>
  `Rp ${new Intl.NumberFormat("id-ID").format(nilai)}`;

const formatTanggal = (nilai: string) =>
  new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(nilai));

export default function SuratTugasDinasSayaPage() {
  const [daftar, setDaftar] = useState<SuratTugasKaryawanSaya[]>([]);
  const [memuat, setMemuat] = useState(true);
  const [galat, setGalat] = useState<string | null>(null);
  const [popup, setPopup] = useState<SuratTugasKaryawanSaya | null>(null);
  const [memproses, setMemproses] = useState(false);
  const [detikPemberitahuan, setDetikPemberitahuan] = useState(5);

  useEffect(() => {
    if (!popup) return;
    setDetikPemberitahuan(5);
    const timer = window.setInterval(() => {
      setDetikPemberitahuan((nilai) => {
        if (nilai <= 1) {
          window.clearInterval(timer);
          return 0;
        }
        return nilai - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [popup]);

  useEffect(() => {
    void (async () => {
      try {
        const hasil = await suratTugasKaryawanApi.daftar();
        setDaftar(hasil);
        setPopup(hasil.find((item) => !item.advanceDikonfirmasiPada) ?? null);
      } catch (error) {
        setGalat((error as Error).message);
      } finally {
        setMemuat(false);
      }
    })();
  }, []);

  const jumlahMenunggu = useMemo(
    () => daftar.filter((item) => !item.advanceDikonfirmasiPada).length,
    [daftar],
  );

  async function konfirmasi() {
    if (!popup) return;
    setMemproses(true);
    setGalat(null);
    try {
      const hasil = await suratTugasKaryawanApi.konfirmasi(popup.id);
      const berikutnya = daftar.map((item) =>
        item.id === hasil.id ? hasil : item,
      );
      setDaftar(berikutnya);
      setPopup(
        berikutnya.find((item) => !item.advanceDikonfirmasiPada) ?? null,
      );
    } catch (error) {
      setGalat((error as Error).message);
    } finally {
      setMemproses(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 p-4 sm:p-6 lg:p-8">
      <header className="rounded-3xl bg-gradient-to-br from-[#075fd8] to-[#074bb3] p-6 text-white shadow-xl shadow-blue-200/60 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-5">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-blue-100">
              Deklarasi Dinas Karyawan
            </p>
            <h1 className="mt-2 text-2xl font-black sm:text-3xl">
              Surat Tugas Dinas Saya
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-blue-100">
              Periksa STD yang sudah disetujui lengkap dan konfirmasikan penerimaan advance Anda.
            </p>
          </div>
          <div className="rounded-2xl border border-white/20 bg-white/10 px-5 py-4 text-center backdrop-blur">
            <div className="text-3xl font-black">{jumlahMenunggu}</div>
            <div className="text-xs font-bold text-blue-100">
              Menunggu Konfirmasi
            </div>
          </div>
        </div>
      </header>

      {galat ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {galat}
        </div>
      ) : null}

      {memuat ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center font-semibold text-slate-500">
          Memuat Surat Tugas Dinas...
        </div>
      ) : daftar.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <FileCheck2 className="mx-auto h-12 w-12 text-slate-300" />
          <h2 className="mt-4 text-lg font-black text-slate-800">
            Belum ada Surat Tugas Dinas
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            Surat Tugas Dinas yang sudah disetujui SH dan PJO akan muncul di sini.
          </p>
        </div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          {daftar.map((item) => {
            const sudahKonfirmasi = Boolean(item.advanceDikonfirmasiPada);
            return (
              <article
                key={item.id}
                className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-black uppercase tracking-wider text-blue-600">
                      {item.surat.nomor}
                    </p>
                    <h2 className="mt-1 text-lg font-black text-slate-900">
                      {item.surat.keteranganTugas}
                    </h2>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-black ${
                      sudahKonfirmasi
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {sudahKonfirmasi ? "Sudah Disetujui" : "Perlu Disetujui"}
                  </span>
                </div>

                <div className="mt-5 grid gap-3 text-sm text-slate-600 sm:grid-cols-2">
                  <div className="flex gap-2 rounded-xl bg-slate-50 p-3">
                    <MapPin className="h-5 w-5 shrink-0 text-blue-600" />
                    <span>{item.surat.tujuanLokasi}</span>
                  </div>
                  <div className="flex gap-2 rounded-xl bg-slate-50 p-3">
                    <CalendarDays className="h-5 w-5 shrink-0 text-blue-600" />
                    <span>
                      {formatTanggal(item.surat.tanggalMulai)} -{" "}
                      {formatTanggal(item.surat.tanggalSelesai)}
                    </span>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between rounded-2xl bg-blue-50 p-4">
                  <div className="flex items-center gap-3">
                    <WalletCards className="h-6 w-6 text-blue-600" />
                    <div>
                      <div className="text-xs font-bold text-blue-600">Total Advance Anda</div>
                      <div className="text-xl font-black text-blue-950">{formatRupiah(item.nominalAdvance)}</div>
                    </div>
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap gap-2">
                  {(item.surat.suratTugasAsal?.filePdf || item.surat.filePdf) ? (
                    <a
                      className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
                      href={suratTugasKaryawanApi.urlPdf(
                        item.surat.suratTugasAsal?.filePdf ?? item.surat.filePdf!,
                      )}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <ExternalLink size={15} /> STD
                    </a>
                  ) : null}
                  {item.advanceFilePdf ? (
                    <a className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-3 py-2 text-sm font-bold text-white hover:bg-emerald-700" href={suratTugasKaryawanApi.urlPdf(item.advanceFilePdf)} target="_blank" rel="noreferrer">
                      <ExternalLink size={15} /> Berita Acara Advance
                    </a>
                  ) : (
                    <button type="button" onClick={() => setPopup(item)} className="rounded-xl bg-amber-500 px-4 py-2 text-sm font-black text-white hover:bg-amber-600">
                      Periksa &amp; Setujui
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {popup ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
            <div className="sticky top-0 flex items-start justify-between border-b border-slate-200 bg-white px-6 py-5">
              <div>
                <p className="text-xs font-black uppercase tracking-wider text-blue-600">
                  Konfirmasi Karyawan
                </p>
                <h2 className="mt-1 text-xl font-black text-slate-900">
                  Berita Acara Pengambilan Advance
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setPopup(null)}
                disabled={detikPemberitahuan > 0 || memproses}
                className="rounded-full p-2 text-slate-500 hover:bg-slate-100"
                aria-label="Tutup"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-5 p-6">
              <div className="grid gap-3 rounded-2xl bg-slate-50 p-4 text-sm sm:grid-cols-2">
                <div>
                  <div className="text-xs font-bold text-slate-500">
                    Kegiatan
                  </div>
                  <div className="mt-1 font-black text-slate-900">
                    {popup.surat.keteranganTugas}
                  </div>
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-500">
                    Nomor STD
                  </div>
                  <div className="mt-1 font-black text-slate-900">
                    {popup.surat.nomor}
                  </div>
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-500">
                    Nominal Advance
                  </div>
                  <div className="mt-1 text-lg font-black text-blue-700">
                    {formatRupiah(popup.nominalAdvance)}
                  </div>
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-500">
                    Tanggal Berakhir
                  </div>
                  <div className="mt-1 font-black text-slate-900">
                    {formatTanggal(popup.surat.tanggalSelesai)}
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
                <p className="font-black">Dengan menyetujui, saya menyatakan akan melakukan deklarasi advance (Uang Muka) yang saya terima dengan ketentuan:</p>
                <ol className="mt-2 list-decimal space-y-1 pl-5">
                  <li>Melampirkan bukti transaksi asli atau jika tidak ada wajib membuat nota yang ditandatangani oleh pimpinan departemen.</li>
                  <li>Deklarasi diajukan maksimal 7 hari setelah tanggal berakhir kegiatan.</li>
                  <li>Apabila belum melakukan kewajiban deklarasi sampai batas waktu, saya bersedia dilakukan pemotongan gaji senilai nominal advance.</li>
                </ol>
              </div>

              <button
                type="button"
                disabled={memproses}
                onClick={() => void konfirmasi()}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-3.5 font-black text-white shadow-lg shadow-blue-200 hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <CheckCircle2 size={20} />
                {memproses
                  ? "Membuat Berita Acara..."
                  : detikPemberitahuan > 0
                    ? `Baca pemberitahuan (${detikPemberitahuan})`
                    : "Saya Setujui dan Buat Berita Acara"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
