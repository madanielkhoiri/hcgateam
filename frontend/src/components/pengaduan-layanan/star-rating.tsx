'use client';

import { useState } from 'react';
import { Star } from 'lucide-react';
import styles from './pengaduan-layanan.module.css';

type StarRatingProps = {
  value: number;
  onChange: (value: number) => void;
  size?: number;
  disabled?: boolean;
};

/** Rating bintang 1-5 yang bisa diklik, mirip rating driver di Grab/Gojek. */
export function StarRating({ value, onChange, size = 40, disabled = false }: StarRatingProps) {
  const [hover, setHover] = useState<number | null>(null);
  const tampilkan = hover ?? value;

  return (
    <div className={styles.starRow} role="radiogroup" aria-label="Beri rating 1 sampai 5 bintang">
      {[1, 2, 3, 4, 5].map((bintang) => (
        <button
          key={bintang}
          type="button"
          role="radio"
          aria-checked={value === bintang}
          aria-label={`${bintang} bintang`}
          className={styles.starButton}
          disabled={disabled}
          onMouseEnter={() => setHover(bintang)}
          onMouseLeave={() => setHover(null)}
          onClick={() => onChange(bintang)}
        >
          <Star
            size={size}
            fill={bintang <= tampilkan ? '#f5b400' : 'none'}
            color={bintang <= tampilkan ? '#f5b400' : '#c7ccd3'}
            strokeWidth={1.5}
          />
        </button>
      ))}
    </div>
  );
}
