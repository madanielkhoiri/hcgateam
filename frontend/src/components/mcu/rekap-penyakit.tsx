'use client';

// ==================================================
// FILE: frontend/src/components/mcu/rekap-penyakit.tsx
// FUNGSI: Kartu dashboard MCU "Penyakit Terbanyak" - rekap penyakit
// penyebab Follow Up (diisi Dokter di rekomendasi), dipilih per tahun
// atau per bulan. Data medis: hanya dirender untuk HC & Dokter.
// ==================================================

import { useEffect, useState } from 'react';
import { mcuApi, type PeriodePenyakitMcu, type RekapPenyakitMcu } from '@/lib/mcu-api';

const NAMA_BULAN = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

const kartu = {
  border: '1px solid #d8e4f2',
  background: '#ffffff',
  borderRadius: 16,
  padding: 20,
} as const;

const pilihan = {
  height: 34,
  padding: '0 10px',
  border: '1px solid #cbd9e9',
  borderRadius: 9,
  background: '#ffffff',
  color: '#183e69',
  fontSize: 13,
  fontWeight: 700,
} as const;

function TombolPeriode({
  aktif,
  onClick,
  children,
}: {
  aktif: boolean;
  onClick: () => void;
  children: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        height: 34,
        padding: '0 14px',
        border: 0,
        borderRadius: 9,
        cursor: 'pointer',
        fontSize: 13,
        fontWeight: 800,
        color: aktif ? '#ffffff' : '#48647f',
        background: aktif ? '#f17c16' : '#eef3f9',
      }}
    >
      {children}
    </button>
  );
}

export default function RekapPenyakit() {
  const sekarang = new Date();
  const [periode, setPeriode] = useState<PeriodePenyakitMcu>('TAHUN');
  const [tahun, setTahun] = useState(sekarang.getFullYear());
  const [bulan, setBulan] = useState(sekarang.getMonth() + 1);
  const [data, setData] = useState<RekapPenyakitMcu | null>(null);
  const [galat, setGalat] = useState<string | null>(null);
  const [memuat, setMemuat] = useState(true);

  useEffect(() => {
    let aktif = true;
    setMemuat(true);
    setGalat(null);

    const parameter = new URLSearchParams({ periode, tahun: String(tahun) });
    if (periode === 'BULAN') parameter.set('bulan', String(bulan));

    mcuApi
      .ambil<RekapPenyakitMcu>(`/dashboard/penyakit?${parameter.toString()}`)
      .then((hasil) => {
        if (aktif) setData(hasil);
      })
      .catch((error: Error) => {
        if (aktif) setGalat(error.message);
      })
      .finally(() => {
        if (aktif) setMemuat(false);
      });

    return () => {
      aktif = false;
    };
  }, [periode, tahun, bulan]);

  const daftarTahun = data?.tahunTersedia ?? [tahun];
  const terbanyak = data?.penyakit[0];
  const maksimum = terbanyak?.jumlah ?? 1;
  const labelPeriode =
    periode === 'TAHUN' ? `Tahun ${tahun}` : `${NAMA_BULAN[bulan - 1]} ${tahun}`;

  const rincian = (data?.rincian ?? []).filter(
    // Mode bulan: hanya tanggal yang ada kasusnya supaya tabel tidak panjang.
    (baris) => periode === 'TAHUN' || baris.totalKasus > 0,
  );

  return (
    <section style={{ ...kartu, margin: '0 0 20px' }} aria-label="Penyakit terbanyak">
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        <div>
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 900, color: '#0d315c' }}>
            Penyakit Terbanyak (Follow Up)
          </h2>
          <p style={{ margin: '4px 0 0', fontSize: 12, fontWeight: 600, color: '#6f819d' }}>
            Nama penyakit diisi Dokter saat menetapkan Follow Up. Satu karyawan dihitung sekali
            per penyakit.
          </p>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
          <TombolPeriode aktif={periode === 'TAHUN'} onClick={() => setPeriode('TAHUN')}>
            Per Tahun
          </TombolPeriode>
          <TombolPeriode aktif={periode === 'BULAN'} onClick={() => setPeriode('BULAN')}>
            Per Bulan
          </TombolPeriode>

          {periode === 'BULAN' ? (
            <select
              aria-label="Bulan"
              value={bulan}
              onChange={(event) => setBulan(Number(event.target.value))}
              style={pilihan}
            >
              {NAMA_BULAN.map((nama, index) => (
                <option key={nama} value={index + 1}>
                  {nama}
                </option>
              ))}
            </select>
          ) : null}

          <select
            aria-label="Tahun"
            value={tahun}
            onChange={(event) => setTahun(Number(event.target.value))}
            style={pilihan}
          >
            {daftarTahun.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>
      </div>

      {galat ? (
        <p style={{ margin: '16px 0 0', color: '#b02031', fontWeight: 700 }}>{galat}</p>
      ) : memuat && !data ? (
        <p style={{ margin: '24px 0', color: '#6f819d' }}>Memuat rekap penyakit...</p>
      ) : !data || data.totalKasus === 0 ? (
        <p style={{ margin: '24px 0 8px', color: '#6f819d', fontWeight: 600 }}>
          Belum ada penyakit tercatat pada {labelPeriode}. Isi nama penyakit di menu Rekomendasi
          saat Dokter menetapkan Follow Up.
        </p>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: 24,
            marginTop: 18,
            opacity: memuat ? 0.6 : 1,
          }}
        >
          <div>
            <div style={{ marginBottom: 14 }}>
              <span style={{ fontSize: 12, fontWeight: 800, color: '#6f819d' }}>
                TERBANYAK, {labelPeriode.toUpperCase()}
              </span>
              <div style={{ fontSize: 24, fontWeight: 900, color: '#0d315c' }}>
                {terbanyak?.nama}
              </div>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#f17c16' }}>
                {terbanyak?.jumlah} karyawan ({terbanyak?.persen}%) dari {data.totalKasus} karyawan
                Follow Up
              </span>
            </div>

            <ol style={{ margin: 0, padding: 0, listStyle: 'none', display: 'grid', gap: 10 }}>
              {data.penyakit.slice(0, 10).map((item, index) => (
                <li key={item.nama}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      gap: 10,
                      fontSize: 13,
                      fontWeight: 700,
                      color: '#21456b',
                    }}
                  >
                    <span>
                      {index + 1}. {item.nama}
                    </span>
                    <span style={{ whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
                      {item.jumlah} orang &middot; {item.persen}%
                    </span>
                  </div>
                  <div style={{ height: 8, marginTop: 4, borderRadius: 99, background: '#eef3f9' }}>
                    <div
                      style={{
                        width: `${Math.max(4, (item.jumlah / maksimum) * 100)}%`,
                        height: '100%',
                        borderRadius: 99,
                        background: index === 0 ? '#f17c16' : '#f7b77a',
                      }}
                    />
                  </div>
                </li>
              ))}
            </ol>
            {data.penyakit.length > 10 ? (
              <p style={{ margin: '10px 0 0', fontSize: 12, color: '#6f819d' }}>
                +{data.penyakit.length - 10} penyakit lainnya
              </p>
            ) : null}
          </div>

          <div style={{ overflowX: 'auto' }}>
            <span style={{ fontSize: 12, fontWeight: 800, color: '#6f819d' }}>
              {periode === 'TAHUN' ? 'PENYAKIT TERBANYAK PER BULAN' : 'PENYAKIT TERBANYAK PER TANGGAL'}
            </span>
            <table style={{ width: '100%', marginTop: 8, borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ textAlign: 'left', color: '#6f819d' }}>
                  <th style={{ padding: '6px 8px' }}>{periode === 'TAHUN' ? 'Bulan' : 'Tanggal'}</th>
                  <th style={{ padding: '6px 8px', textAlign: 'right' }}>Karyawan FU</th>
                  <th style={{ padding: '6px 8px' }}>Penyakit terbanyak</th>
                </tr>
              </thead>
              <tbody>
                {rincian.map((baris) => (
                  <tr key={baris.kunci} style={{ borderTop: '1px solid #eef2f7', color: '#21456b' }}>
                    <td style={{ padding: '7px 8px', fontWeight: 700 }}>
                      {periode === 'TAHUN'
                        ? NAMA_BULAN[baris.kunci - 1]
                        : `${baris.kunci} ${NAMA_BULAN[bulan - 1]}`}
                    </td>
                    <td style={{ padding: '7px 8px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                      {baris.totalKasus}
                    </td>
                    <td style={{ padding: '7px 8px' }}>
                      {baris.teratas ? `${baris.teratas.nama} (${baris.teratas.jumlah})` : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}
