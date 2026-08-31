'use client';

import { Camera } from 'lucide-react';
import { useState } from 'react';
import { compressImage } from '@/lib/compress-image';

export function KipCeklisForm({
  parameterChecklist,
  submitting,
  error,
  onSubmit,
  gelap = false,
}: {
  /** Daftar parameter checklist khusus KIP ini (ditentukan admin saat membuat KIP). */
  parameterChecklist: string[];
  submitting: boolean;
  error?: string | null;
  onSubmit: (data: { foto: File; parameterChecked: boolean[] }) => void;
  /** true untuk latar gelap (dipakai di halaman scan AR) */
  gelap?: boolean;
}) {
  const [checked, setChecked] = useState<boolean[]>(parameterChecklist.map(() => true));
  const [foto, setFoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [localError, setLocalError] = useState('');

  const warnaTeks = gelap ? '#ffffff' : '#12355f';
  const warnaSub = gelap ? 'rgba(255,255,255,.65)' : '#71839d';

  async function handleFotoChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    event.target.value = '';

    let fotoTerkompres: File;
    try {
      fotoTerkompres = await compressImage(file);
    } catch {
      setLocalError('Foto gagal dikompres, coba ambil ulang');
      return;
    }

    setFoto(fotoTerkompres);
    setPreview((lama) => {
      if (lama) URL.revokeObjectURL(lama);
      return URL.createObjectURL(fotoTerkompres);
    });
  }

  function submit() {
    if (!foto) {
      setLocalError('Foto dokumentasi bukti inspeksi wajib diambil');
      return;
    }
    setLocalError('');
    onSubmit({ foto, parameterChecked: checked });
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <strong style={{ color: warnaTeks, fontSize: 13 }}>Checklist Parameter Inspeksi</strong>

      {parameterChecklist.map((label, index) => (
        <label
          key={label}
          style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 12.5, color: warnaTeks }}
        >
          <input
            type="checkbox"
            checked={checked[index]}
            onChange={(event) =>
              setChecked((current) =>
                current.map((c, i) => (i === index ? event.target.checked : c)),
              )
            }
            style={{ marginTop: 2 }}
          />
          <span>{label}</span>
        </label>
      ))}

      <label
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          marginTop: 6,
          padding: '9px 14px',
          borderRadius: 10,
          border: `1px solid ${gelap ? 'rgba(255,255,255,.3)' : '#d8e4f2'}`,
          color: warnaTeks,
          fontSize: 12.5,
          fontWeight: 700,
          cursor: 'pointer',
          width: 'fit-content',
        }}
      >
        <Camera size={15} />
        {foto ? 'Ganti Foto' : 'Ambil Foto Dokumentasi'}
        <input type="file" accept="image/*" capture="environment" hidden onChange={handleFotoChange} />
      </label>

      {preview && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={preview}
          alt="Preview dokumentasi"
          style={{ width: '100%', maxHeight: 180, objectFit: 'cover', borderRadius: 10 }}
        />
      )}

      <small style={{ color: warnaSub }}>
        Foto ini jadi bukti bahwa inspeksi benar-benar dilakukan di lokasi.
      </small>

      {(localError || error) && (
        <p style={{ color: '#ff8686', fontSize: 12, margin: 0 }}>{localError || error}</p>
      )}

      <button
        type="button"
        onClick={submit}
        disabled={submitting}
        style={{
          marginTop: 4,
          padding: '10px 16px',
          background: '#0b9d4d',
          color: '#fff',
          border: 0,
          borderRadius: 10,
          fontWeight: 700,
          fontSize: 13,
          cursor: submitting ? 'default' : 'pointer',
          opacity: submitting ? 0.7 : 1,
        }}
      >
        {submitting ? 'Menyimpan...' : 'Simpan Ceklis'}
      </button>
    </div>
  );
}
