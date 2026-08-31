'use client';

// ==================================================
// FILE: frontend/src/app/hc/ir/aspirasi/page.tsx
// FUNGSI: Aspirasi Karyawan - Admin/Admin HC/Section Head menyusun
// pertanyaan (pilihan ganda/essay) & lihat rekap; akun lain menjawab
// (jawaban tercatat nama & NRP akun), tiap soal bernomor.
// ==================================================

import Link from 'next/link';
import {
  AlertCircle,
  ArrowLeft,
  BarChart3,
  CheckCircle2,
  ClipboardList,
  Inbox,
  MessageSquareText,
  Plus,
  Power,
  Trash2,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Dialog } from '@/components/mcu/mcu-ui';
import { useStoredUser } from '@/lib/use-stored-user';
import {
  irApi,
  isIrPengelola,
  type AspirasiPertanyaanKelola,
  type AspirasiPertanyaanUntukDiisi,
  type AspirasiRekap,
  type TipeAspirasiPertanyaan,
} from '@/lib/ir-api';
import styles from '../ir.module.css';

export default function AspirasiKaryawanPage() {
  const user = useStoredUser();
  const boleh = isIrPengelola(user);

  const [memuat, setMemuat] = useState(true);
  const [galat, setGalat] = useState<string | null>(null);
  const [sukses, setSukses] = useState<string | null>(null);

  const [daftarKelola, setDaftarKelola] = useState<AspirasiPertanyaanKelola[]>([]);
  const [daftarIsi, setDaftarIsi] = useState<AspirasiPertanyaanUntukDiisi[]>([]);

  const [formTerbuka, setFormTerbuka] = useState(false);
  const [teksBaru, setTeksBaru] = useState('');
  const [tipeBaru, setTipeBaru] = useState<TipeAspirasiPertanyaan>('ESSAY');
  const [opsiBaru, setOpsiBaru] = useState<string[]>(['', '']);
  const [proses, setProses] = useState(false);

  const [rekap, setRekap] = useState<AspirasiRekap | null>(null);
  const [jawabanForm, setJawabanForm] = useState<Record<number, string>>({});
  const [mengirim, setMengirim] = useState<number | null>(null);

  const muat = useCallback(async () => {
    setMemuat(true);
    setGalat(null);

    try {
      const hasil = await irApi.aspirasi.daftar();

      if (boleh) {
        setDaftarKelola(hasil as AspirasiPertanyaanKelola[]);
      } else {
        const hasilIsi = hasil as AspirasiPertanyaanUntukDiisi[];
        setDaftarIsi(hasilIsi);

        const isian: Record<number, string> = {};
        for (const item of hasilIsi) {
          if (item.jawabanSaya) {
            isian[item.id] =
              item.tipe === 'PILIHAN_GANDA'
                ? String(item.jawabanSaya.opsiId ?? '')
                : item.jawabanSaya.jawabanTeks ?? '';
          }
        }
        setJawabanForm(isian);
      }
    } catch (error) {
      setGalat((error as Error).message);
    } finally {
      setMemuat(false);
    }
  }, [boleh]);

  useEffect(() => {
    void muat();
  }, [muat]);

  function tambahOpsi() {
    setOpsiBaru((current) => [...current, '']);
  }

  function hapusOpsi(index: number) {
    setOpsiBaru((current) => current.filter((_, i) => i !== index));
  }

  function ubahOpsi(index: number, nilai: string) {
    setOpsiBaru((current) =>
      current.map((item, i) => (i === index ? nilai : item)),
    );
  }

  function bukaForm() {
    setTeksBaru('');
    setTipeBaru('ESSAY');
    setOpsiBaru(['', '']);
    setGalat(null);
    setFormTerbuka(true);
  }

  async function simpanPertanyaan() {
    if (!teksBaru.trim()) {
      setGalat('Teks pertanyaan wajib diisi');
      return;
    }

    const opsiBersih = opsiBaru.map((item) => item.trim()).filter(Boolean);

    if (tipeBaru === 'PILIHAN_GANDA' && opsiBersih.length < 2) {
      setGalat('Pilihan ganda minimal 2 opsi');
      return;
    }

    setProses(true);
    setGalat(null);

    try {
      await irApi.aspirasi.buat({
        teks: teksBaru.trim(),
        tipe: tipeBaru,
        opsi: tipeBaru === 'PILIHAN_GANDA' ? opsiBersih : undefined,
      });
      setSukses('Pertanyaan berhasil dibuat');
      setFormTerbuka(false);
      await muat();
    } catch (error) {
      setGalat((error as Error).message);
    } finally {
      setProses(false);
    }
  }

  async function ubahStatusAktif(item: AspirasiPertanyaanKelola) {
    try {
      await irApi.aspirasi.ubah(item.id, { aktif: !item.aktif });
      await muat();
    } catch (error) {
      setGalat((error as Error).message);
    }
  }

  async function hapusPertanyaan(item: AspirasiPertanyaanKelola) {
    if (!confirm(`Hapus pertanyaan "${item.teks}"?`)) return;

    try {
      await irApi.aspirasi.hapus(item.id);
      setSukses('Pertanyaan berhasil dihapus');
      await muat();
    } catch (error) {
      setGalat((error as Error).message);
    }
  }

  async function bukaRekap(item: AspirasiPertanyaanKelola) {
    try {
      setRekap(await irApi.aspirasi.rekap(item.id));
    } catch (error) {
      setGalat((error as Error).message);
    }
  }

  async function kirimJawaban(item: AspirasiPertanyaanUntukDiisi) {
    const nilai = jawabanForm[item.id];

    if (!nilai?.trim()) {
      setGalat('Jawaban wajib diisi sebelum dikirim');
      return;
    }

    setGalat(null);
    setMengirim(item.id);

    try {
      await irApi.aspirasi.jawab(item.id, {
        opsiId: item.tipe === 'PILIHAN_GANDA' ? Number(nilai) : undefined,
        jawabanTeks: item.tipe === 'ESSAY' ? nilai : undefined,
      });
      setSukses('Jawaban berhasil dikirim');
      await muat();
    } catch (error) {
      setGalat((error as Error).message);
    } finally {
      setMengirim(null);
    }
  }

  const totalDijawab = daftarIsi.filter((item) => item.jawabanSaya).length;
  const persenDijawab =
    daftarIsi.length > 0 ? Math.round((totalDijawab / daftarIsi.length) * 100) : 0;

  return (
    <div className={styles.page}>
      <div className={styles.breadcrumb}>
        <Link href="/hc">HC</Link>
        <span>/</span>
        <Link href="/hc/ir">PORTAL IR</Link>
        <span>/</span>
        <strong>Aspirasi Karyawan</strong>
      </div>

      <div className={styles.pageHead}>
        <div className={styles.pageTitle}>
          <span className={styles.pageIcon}>
            <MessageSquareText size={26} />
          </span>

          <div>
            <h1>Aspirasi Karyawan</h1>
            <p>
              {boleh
                ? 'Susun pertanyaan pilihan ganda/essay dan lihat rekap jawaban.'
                : 'Jawaban Anda tercatat dengan nama & NRP akun.'}
            </p>
          </div>
        </div>

        <div className={styles.headActions}>
          {boleh && (
            <button type="button" className={styles.btn} onClick={bukaForm}>
              <Plus size={15} />
              Buat Pertanyaan
            </button>
          )}
          <Link href="/hc/ir" className={`${styles.btn} ${styles.btnGhost}`}>
            <ArrowLeft size={15} />
            Kembali
          </Link>
        </div>
      </div>

      {galat && (
        <div className={`${styles.alert} ${styles.alertError}`}>
          <AlertCircle size={16} />
          <span>{galat}</span>
        </div>
      )}
      {sukses && (
        <div className={`${styles.alert} ${styles.alertSuccess}`}>
          <CheckCircle2 size={16} />
          <span>{sukses}</span>
        </div>
      )}

      {memuat ? (
        <div className={styles.loadingState}>Memuat pertanyaan...</div>
      ) : boleh ? (
        daftarKelola.length === 0 ? (
          <div className={styles.emptyState}>
            <Inbox size={30} />
            <strong>Belum ada pertanyaan</strong>
            <p>Klik &quot;Buat Pertanyaan&quot; untuk menyusun kuesioner aspirasi karyawan.</p>
          </div>
        ) : (
          <div className={styles.manageList}>
            {daftarKelola.map((item, index) => (
              <div key={item.id} className={styles.manageCard}>
                <div className={styles.manageInfo}>
                  <p>Soal {index + 1}. {item.teks}</p>
                  <span className={styles.videoMeta}>
                    Dibuat {item.createdBy.name}
                    {item.createdBy.nrp ? ` (${item.createdBy.nrp})` : ''}
                  </span>
                  <div className={styles.manageMeta} style={{ marginTop: 8 }}>
                    <span className={`${styles.pill} ${styles.pillTipe}`}>
                      {item.tipe === 'PILIHAN_GANDA' ? 'Pilihan Ganda' : 'Essay'}
                    </span>
                    <span
                      className={`${styles.pill} ${
                        item.aktif ? styles.pillAktif : styles.pillNonaktif
                      }`}
                    >
                      {item.aktif ? 'Aktif' : 'Nonaktif'}
                    </span>
                    <span className={`${styles.pill} ${styles.pillJawaban}`}>
                      {item._count.jawaban} jawaban
                    </span>
                  </div>
                </div>

                <div className={styles.manageActions}>
                  <button
                    type="button"
                    className={`${styles.btn} ${styles.btnGhost} ${styles.btnSm}`}
                    onClick={() => bukaRekap(item)}
                  >
                    <BarChart3 size={13} />
                    Rekap
                  </button>
                  <button
                    type="button"
                    className={`${styles.btn} ${styles.btnGhost} ${styles.btnSm}`}
                    onClick={() => ubahStatusAktif(item)}
                  >
                    <Power size={13} />
                    {item.aktif ? 'Nonaktifkan' : 'Aktifkan'}
                  </button>
                  <button
                    type="button"
                    className={`${styles.btn} ${styles.btnDanger} ${styles.btnSm}`}
                    onClick={() => hapusPertanyaan(item)}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      ) : daftarIsi.length === 0 ? (
        <div className={styles.emptyState}>
          <Inbox size={30} />
          <strong>Belum ada pertanyaan aktif</strong>
          <p>Admin HC belum menyusun pertanyaan aspirasi karyawan.</p>
        </div>
      ) : (
        <>
          <div className={styles.progressWrap}>
            <ClipboardList size={18} color="#0783a8" />
            <span className={styles.progressLabel}>
              {totalDijawab} dari {daftarIsi.length} soal dijawab
            </span>
            <div className={styles.progressTrack}>
              <div
                className={styles.progressFill}
                style={{ width: `${persenDijawab}%` }}
              />
            </div>
            <span className={styles.progressLabel}>{persenDijawab}%</span>
          </div>

          <div className={styles.questionList}>
            {daftarIsi.map((item, index) => {
              const sudahDijawab = Boolean(item.jawabanSaya);
              const nilaiSaatIni = jawabanForm[item.id] ?? '';

              return (
                <div
                  key={item.id}
                  className={`${styles.questionCard} ${sudahDijawab ? styles.answered : ''}`}
                >
                  <span className={styles.questionNumber}>{index + 1}</span>

                  <div className={styles.questionBody}>
                    <div className={styles.questionHead}>
                      <p className={styles.questionText}>{item.teks}</p>
                      {sudahDijawab && (
                        <span className={styles.answeredTag}>
                          <CheckCircle2 size={12} />
                          Terjawab
                        </span>
                      )}
                    </div>

                    {item.tipe === 'PILIHAN_GANDA' ? (
                      <div className={styles.optionList}>
                        {item.opsi.map((opsi) => (
                          <label
                            key={opsi.id}
                            className={`${styles.optionItem} ${
                              nilaiSaatIni === String(opsi.id)
                                ? styles.optionItemChecked
                                : ''
                            }`}
                          >
                            <input
                              type="radio"
                              name={`pertanyaan-${item.id}`}
                              value={opsi.id}
                              checked={nilaiSaatIni === String(opsi.id)}
                              onChange={(event) =>
                                setJawabanForm((current) => ({
                                  ...current,
                                  [item.id]: event.target.value,
                                }))
                              }
                            />
                            <span>{opsi.teks}</span>
                          </label>
                        ))}
                      </div>
                    ) : (
                      <textarea
                        className={styles.answerTextarea}
                        value={nilaiSaatIni}
                        onChange={(event) =>
                          setJawabanForm((current) => ({
                            ...current,
                            [item.id]: event.target.value,
                          }))
                        }
                        placeholder="Tulis jawaban Anda..."
                        rows={3}
                      />
                    )}

                    <div className={styles.questionFooter}>
                      <button
                        type="button"
                        className={`${styles.btn} ${styles.btnSm}`}
                        onClick={() => kirimJawaban(item)}
                        disabled={mengirim === item.id}
                      >
                        {mengirim === item.id
                          ? 'Mengirim...'
                          : sudahDijawab
                            ? 'Perbarui Jawaban'
                            : 'Kirim Jawaban'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {formTerbuka && (
        <Dialog
          judul="Buat Pertanyaan Aspirasi"
          keterangan="Pilih tipe pertanyaan: pilihan ganda (isi opsi) atau essay (jawaban bebas)."
          onTutup={() => setFormTerbuka(false)}
          aksi={
            <>
              <button
                type="button"
                className={`${styles.btn} ${styles.btnGhost}`}
                onClick={() => setFormTerbuka(false)}
                disabled={proses}
              >
                Batal
              </button>
              <button
                type="button"
                className={styles.btn}
                onClick={simpanPertanyaan}
                disabled={proses}
              >
                {proses ? 'Menyimpan...' : 'Simpan'}
              </button>
            </>
          }
        >
          <div className={styles.formStack}>
            {galat && (
              <div className={`${styles.alert} ${styles.alertError}`}>
                <AlertCircle size={16} />
                <span>{galat}</span>
              </div>
            )}

            <div className={styles.formField}>
              <label>Teks Pertanyaan</label>
              <textarea
                className={styles.formTextarea}
                value={teksBaru}
                onChange={(event) => setTeksBaru(event.target.value)}
                rows={2}
              />
            </div>

            <div className={styles.formField}>
              <label>Tipe Pertanyaan</label>
              <select
                className={styles.formSelect}
                value={tipeBaru}
                onChange={(event) =>
                  setTipeBaru(event.target.value as TipeAspirasiPertanyaan)
                }
              >
                <option value="ESSAY">Essay</option>
                <option value="PILIHAN_GANDA">Pilihan Ganda</option>
              </select>
            </div>

            {tipeBaru === 'PILIHAN_GANDA' && (
              <div className={styles.formField}>
                <label>Opsi Jawaban</label>
                {opsiBaru.map((opsi, index) => (
                  <div key={index} className={styles.opsiRow}>
                    <input
                      className={styles.formInput}
                      value={opsi}
                      onChange={(event) => ubahOpsi(index, event.target.value)}
                      placeholder={`Opsi ${index + 1}`}
                    />
                    {opsiBaru.length > 2 && (
                      <button
                        type="button"
                        className={styles.iconBtn}
                        onClick={() => hapusOpsi(index)}
                      >
                        <X size={13} />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  className={`${styles.btn} ${styles.btnGhost} ${styles.btnSm}`}
                  style={{ alignSelf: 'flex-start' }}
                  onClick={tambahOpsi}
                >
                  <Plus size={13} />
                  Tambah Opsi
                </button>
              </div>
            )}
          </div>
        </Dialog>
      )}

      {rekap && (
        <Dialog
          judul={`Rekap Jawaban: ${rekap.teks}`}
          keterangan={`Total ${rekap.jawaban.length} jawaban masuk.`}
          onTutup={() => setRekap(null)}
        >
          {rekap.jawaban.length === 0 ? (
            <div className={styles.emptyState}>
              <Inbox size={26} />
              <strong>Belum ada jawaban</strong>
              <p>Belum ada akun yang menjawab pertanyaan ini.</p>
            </div>
          ) : (
            <div className={styles.simpleTableWrap}>
              <table className={styles.simpleTable}>
                <thead>
                  <tr>
                    <th>Nama</th>
                    <th>NRP</th>
                    <th>Jawaban</th>
                  </tr>
                </thead>
                <tbody>
                  {rekap.jawaban.map((jawaban) => (
                    <tr key={jawaban.id}>
                      <td>{jawaban.namaPenjawab}</td>
                      <td>{jawaban.nrpPenjawab ?? '-'}</td>
                      <td>{jawaban.opsi?.teks ?? jawaban.jawabanTeks}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Dialog>
      )}
    </div>
  );
}
