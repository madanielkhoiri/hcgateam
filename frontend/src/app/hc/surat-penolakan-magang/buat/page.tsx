'use client';

// ==================================================
// FILE: frontend/src/app/hc/surat-penolakan-magang/buat/page.tsx
// FUNGSI: Form pembuatan Surat Penolakan Magang (1 orang per surat) -
// nama diambil dari Database Anak Magang, sapaan & alasan penolakan
// diisi manual karena beda tiap pelamar.
// ==================================================

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, FileX2, Plus } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { anakMagangApi, type AnakMagang } from '@/lib/anak-magang-api';
import {
  suratPenolakanMagangApi,
  type SuratPenolakanMagang,
} from '@/lib/surat-penolakan-magang-api';
import styles from '../../anak-magang/anak-magang.module.css';

function Field({
  label,
  lebar,
  children,
}: {
  label: string;
  lebar?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={`${styles.field} ${lebar ? styles.lebar : ''}`}>
      <label>{label}</label>
      {children}
    </div>
  );
}

export default function BuatSuratPenolakanMagangPage() {
  const router = useRouter();

  const [dipilih, setDipilih] = useState<AnakMagang | null>(null);
  const [sapaan, setSapaan] = useState<'Saudara' | 'Saudari'>('Saudara');
  const [alasanPenolakan, setAlasanPenolakan] = useState('');

  const [cari, setCari] = useState('');
  const [hasilCari, setHasilCari] = useState<AnakMagang[]>([]);
  const [dropdownTerbuka, setDropdownTerbuka] = useState(false);
  const [mencari, setMencari] = useState(false);

  const [proses, setProses] = useState(false);
  const [galat, setGalat] = useState<string | null>(null);

  useEffect(() => {
    if (!cari.trim() || cari.trim().length < 2) {
      setHasilCari([]);
      return;
    }

    let aktif = true;
    setMencari(true);

    const timer = setTimeout(() => {
      anakMagangApi
        .ambil<AnakMagang[]>(`?cari=${encodeURIComponent(cari.trim())}`)
        .then((hasil) => {
          if (aktif) {
            setHasilCari(hasil.slice(0, 8));
          }
        })
        .catch(() => {
          if (aktif) {
            setHasilCari([]);
          }
        })
        .finally(() => {
          if (aktif) {
            setMencari(false);
          }
        });
    }, 300);

    return () => {
      aktif = false;
      clearTimeout(timer);
    };
  }, [cari]);

  function pilih(item: AnakMagang) {
    setDipilih(item);
    setCari('');
    setHasilCari([]);
    setDropdownTerbuka(false);
  }

  async function submit() {
    if (!dipilih) {
      return;
    }

    setProses(true);
    setGalat(null);

    try {
      const hasil = await suratPenolakanMagangApi.kirim<SuratPenolakanMagang>(
        '',
        {
          anakMagangId: dipilih.id,
          sapaan,
          alasanPenolakan: alasanPenolakan.trim(),
        },
      );

      router.push(`/hc/surat-penolakan-magang?berhasil=${hasil.id}`);
    } catch (error) {
      setGalat((error as Error).message);
    } finally {
      setProses(false);
    }
  }

  const bisaSimpan = Boolean(dipilih) && alasanPenolakan.trim().length > 0;

  return (
    <>
      <Link href="/hc/surat-penolakan-magang" className={styles.backButton}>
        <ArrowLeft size={16} />
        Kembali
      </Link>

      <div className={styles.pageHead}>
        <div className={styles.pageTitle}>
          <span className={styles.pageIcon}>
            <FileX2 size={26} />
          </span>

          <div>
            <h1>Buat Surat Penolakan Magang</h1>
            <p>
              Pilih pelamar dari Database Anak Magang, isi sapaan dan alasan
              penolakan, PDF akan dibuat otomatis.
            </p>
          </div>
        </div>
      </div>

      {galat ? (
        <div className={`${styles.notice} ${styles.noticeError}`}>
          <span>{galat}</span>
        </div>
      ) : null}

      <section className={styles.panel}>
        <div className={styles.panelHead}>
          <div>
            <h2>Pelamar</h2>
          </div>
        </div>

        <div className={styles.pickerWrap}>
          <Field label="Cari pelamar (nama/NRP/NIM) dari Database Anak Magang">
            <input
              className={styles.input}
              value={dipilih ? dipilih.nama : cari}
              onChange={(event) => {
                setDipilih(null);
                setCari(event.target.value);
                setDropdownTerbuka(true);
              }}
              onFocus={() => setDropdownTerbuka(true)}
              onBlur={() => setTimeout(() => setDropdownTerbuka(false), 150)}
              placeholder="Ketik nama, NRP, atau NIM..."
            />
          </Field>

          {dropdownTerbuka && !dipilih && cari.trim().length >= 2 ? (
            <div className={styles.pickerDropdown}>
              {mencari ? (
                <div className={styles.pickerItem}>
                  <span>Mencari...</span>
                </div>
              ) : hasilCari.length === 0 ? (
                <div className={styles.pickerItem}>
                  <span>Tidak ditemukan</span>
                </div>
              ) : (
                hasilCari.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={styles.pickerItem}
                    onClick={() => pilih(item)}
                  >
                    <strong>{item.nama}</strong>
                    <span>
                      {item.nrp || '-'}
                      {item.jurusan ? ` - ${item.jurusan}` : ''}
                    </span>
                  </button>
                ))
              )}
            </div>
          ) : null}
        </div>

        <div className={styles.formGrid} style={{ marginTop: 14 }}>
          <Field label="Sapaan">
            <select
              className={styles.select}
              value={sapaan}
              onChange={(event) =>
                setSapaan(event.target.value as 'Saudara' | 'Saudari')
              }
            >
              <option value="Saudara">Saudara</option>
              <option value="Saudari">Saudari</option>
            </select>
          </Field>

          <Field label="Alasan Penolakan" lebar>
            <textarea
              className={styles.textarea}
              value={alasanPenolakan}
              onChange={(event) => setAlasanPenolakan(event.target.value)}
              placeholder="sudah terpenuhinya kuota peserta magang serta untuk program kerja yang dituju memerlukan Sertifikasi BMC"
            />
          </Field>
        </div>
      </section>

      <div className={styles.headActions} style={{ marginTop: 18 }}>
        <Link
          href="/hc/surat-penolakan-magang"
          className={`${styles.tombol} ${styles.tombolNetral}`}
        >
          Batal
        </Link>

        <button
          type="button"
          className={styles.tombol}
          onClick={() => void submit()}
          disabled={proses || !bisaSimpan}
        >
          <Plus size={15} />
          {proses ? 'Menyimpan...' : 'Buat Surat Penolakan'}
        </button>
      </div>
    </>
  );
}
