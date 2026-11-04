'use client';

import { useState } from 'react';
import { PengaduanLayananPage } from '@/components/pengaduan-layanan/pengaduan-layanan-page';
import type { DivisiPengaduan } from '@/lib/pengaduan-layanan-api';

export default function PengaduanTerpusatPage() {
  const [divisi, setDivisi] = useState<DivisiPengaduan>('GA');

  return (
    <PengaduanLayananPage
      key={divisi}
      divisi={divisi}
      terpusat
      onPilihDivisi={setDivisi}
    />
  );
}
