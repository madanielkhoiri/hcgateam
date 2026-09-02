'use client';

// Pengganti <input type="time"> — beberapa browser/OS menampilkan pemilih AM/PM (12 jam)
// mengikuti bahasa sistemnya sendiri, padahal format yang dipakai di sini wajib 24 jam.
// Dua <select> terpisah (jam 00-23, menit 00-59) menjamin tampilannya selalu 24 jam
// apapun locale browsernya.

const JAM = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const MENIT = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));

type Props = {
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
};

export function TimeInput24({ value, onChange, required }: Props) {
  const [jam, menit] = value ? value.split(':') : ['', ''];

  function ubah(jamBaru: string, menitBaru: string) {
    onChange(jamBaru && menitBaru ? `${jamBaru}:${menitBaru}` : '');
  }

  return (
    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
      <select
        aria-label="Jam"
        required={required}
        value={jam}
        onChange={(e) => ubah(e.target.value, menit || '00')}
        style={{ flex: 1 }}
      >
        <option value="" disabled>
          Jam
        </option>
        {JAM.map((j) => (
          <option key={j} value={j}>
            {j}
          </option>
        ))}
      </select>
      <span style={{ fontWeight: 800, color: '#12355f' }}>:</span>
      <select
        aria-label="Menit"
        required={required}
        value={menit}
        onChange={(e) => ubah(jam || '00', e.target.value)}
        style={{ flex: 1 }}
      >
        <option value="" disabled>
          Menit
        </option>
        {MENIT.map((m) => (
          <option key={m} value={m}>
            {m}
          </option>
        ))}
      </select>
    </div>
  );
}
