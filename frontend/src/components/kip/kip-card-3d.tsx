'use client';

import { useEffect, useMemo, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { Float, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import type { Kip } from '@/lib/kip-api';

const BULAN_LABEL = ['JAN', 'FEB', 'MAR', 'APR', 'MEI', 'JUN', 'JUL', 'AGS', 'SEP', 'OKT', 'NOV', 'DES'];

// Aset statis frontend (frontend/public/logos/) — ikut ter-commit ke repo,
// beda dari backend/uploads/ yang isinya upload runtime (tidak di-commit).
const LOGO_PPA_URL = '/logos/ppa.png';
const LOGO_K3_URL = '/logos/k3.png';

/** Preload satu gambar sekali saja, dipakai ulang tiap render kartu. */
function useGambarLogo(url: string): HTMLImageElement | null {
  const [img, setImg] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    const gambar = new window.Image();
    gambar.onload = () => setImg(gambar);
    gambar.src = url;
  }, [url]);

  return img;
}

type StatusTampil = 'SUDAH' | 'KUNING' | 'MERAH' | 'NETRAL';

export function statusTampilBulan(kip: Kip, bulan: number): StatusTampil {
  const baris = kip.checklist.find((c) => c.bulan === bulan);

  if (baris?.status === 'SUDAH') {
    return 'SUDAH';
  }

  const now = new Date();
  const skorSekarang = now.getFullYear() * 12 + (now.getMonth() + 1);
  const skorBulan = kip.tahun * 12 + bulan;

  if (skorBulan > skorSekarang) return 'NETRAL';
  if (skorBulan === skorSekarang) return 'KUNING';
  return 'MERAH';
}

/** Warna latar per kuartal — meniru kartu KIP fisik (Jan-Mar biru, Apr-Jun kuning, Jul-Sep putih, Okt-Des merah). */
function warnaKuartal(bulan: number): string {
  if (bulan <= 3) return '#bfdbfe';
  if (bulan <= 6) return '#fef08a';
  if (bulan <= 9) return '#f8fafc';
  return '#fecaca';
}

function gambarLogoBulat(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, warna: string) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = warna;
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#ffffff';
  ctx.stroke();
}

/** Logo dari gambar asli (logo PPA), dipotong bundar + garis tepi putih. */
function gambarLogoGambar(ctx: CanvasRenderingContext2D, img: HTMLImageElement, cx: number, cy: number, r: number) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();
  ctx.drawImage(img, cx - r, cy - r, r * 2, r * 2);
  ctx.restore();

  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#ffffff';
  ctx.stroke();
}

/** Logo dari gambar asli berlatar transparan (mis. gir K3) — pas ke kotak, tanpa dipotong bundar. */
function gambarLogoTransparan(ctx: CanvasRenderingContext2D, img: HTMLImageElement, cx: number, cy: number, r: number) {
  const skala = 0.92; // sedikit lebih kecil dari diameter penuh biar tidak mepet
  const ukuran = r * 2 * skala;
  ctx.drawImage(img, cx - ukuran / 2, cy - ukuran / 2, ukuran, ukuran);
}

/** Logo kiri (cadangan bila logo PPA belum termuat): lingkaran merah + siluet orang. */
function gambarIkonPetugas(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  gambarLogoBulat(ctx, cx, cy, r, '#c0263a');

  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(r / 34, r / 34);
  ctx.fillStyle = '#ffffff';

  // Kepala
  ctx.beginPath();
  ctx.arc(1, -17, 5.5, 0, Math.PI * 2);
  ctx.fill();

  // Badan + kaki + tangan bergaya berjalan/siaga (siluet sederhana).
  ctx.beginPath();
  ctx.moveTo(-3, -9);
  ctx.lineTo(7, -7);
  ctx.lineTo(13, -12);
  ctx.lineTo(16, -8);
  ctx.lineTo(8, -1);
  ctx.lineTo(10, 8);
  ctx.lineTo(17, 16);
  ctx.lineTo(13, 20);
  ctx.lineTo(5, 10);
  ctx.lineTo(1, 3);
  ctx.lineTo(-6, 9);
  ctx.lineTo(-13, 20);
  ctx.lineTo(-17, 16);
  ctx.lineTo(-7, 2);
  ctx.lineTo(-4, -5);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

/** Logo kanan: lingkaran hijau + roda gir (mewakili peralatan/maintenance). */
function gambarIkonGir(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  gambarLogoBulat(ctx, cx, cy, r, '#0b9d4d');

  ctx.save();
  ctx.translate(cx, cy);
  ctx.fillStyle = '#ffffff';

  const gigi = 8;
  const rOuter = r * 0.68;
  const rInner = r * 0.5;
  const rHole = r * 0.24;

  ctx.beginPath();
  for (let i = 0; i < gigi * 2; i++) {
    const sudut = (Math.PI * 2 * i) / (gigi * 2);
    const radius = i % 2 === 0 ? rOuter : rInner;
    const x = Math.cos(sudut) * radius;
    const y = Math.sin(sudut) * radius;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();

  // Lubang tengah gir (potong pakai warna dasar lingkaran).
  ctx.fillStyle = '#0b9d4d';
  ctx.beginPath();
  ctx.arc(0, 0, rHole, 0, Math.PI * 2);
  ctx.fill();

  // Tanda plus kecil di tengah lubang.
  ctx.fillStyle = '#ffffff';
  const tebal = rHole * 0.4;
  ctx.fillRect(-tebal / 2, -rHole * 0.65, tebal, rHole * 1.3);
  ctx.fillRect(-rHole * 0.65, -tebal / 2, rHole * 1.3, tebal);

  ctx.restore();
}

function buatCanvasKip(kip: Kip, logoPpa: HTMLImageElement | null, logoK3: HTMLImageElement | null): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = 900;
  canvas.height = 670;
  const ctx = canvas.getContext('2d');

  if (!ctx) return canvas;

  // Kartu putih + bingkai tipis, meniru kartu KIP fisik.
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = '#1f2937';
  ctx.lineWidth = 4;
  ctx.strokeRect(4, 4, canvas.width - 8, canvas.height - 8);

  // Logo kiri (siluet petugas, merah) & kanan (gir, hijau) mengapit judul, seperti kop kartu fisik.
  if (logoPpa) {
    gambarLogoGambar(ctx, logoPpa, 65, 60, 30);
  } else {
    gambarIkonPetugas(ctx, 65, 60, 30);
  }
  if (logoK3) {
    gambarLogoTransparan(ctx, logoK3, canvas.width - 65, 60, 30);
  } else {
    gambarIkonGir(ctx, canvas.width - 65, 60, 30);
  }

  ctx.fillStyle = '#c0263a';
  ctx.textAlign = 'center';
  ctx.font = 'bold 24px Arial';
  ctx.fillText('KARTU INSPEKSI PERALATAN', canvas.width / 2, 50);
  ctx.font = 'bold 22px Arial';
  ctx.fillText('HCGA TEAM', canvas.width / 2, 80);

  ctx.strokeStyle = '#d1d5db';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(30, 108);
  ctx.lineTo(canvas.width - 30, 108);
  ctx.stroke();

  // Field: label kiri (tanpa kotak) + satu kotak nilai gabungan 3 baris, persis kartu fisik.
  const labelX = 30;
  const boxX = 250;
  const tahunBoxW = 190;
  const tahunBoxX = canvas.width - 30 - tahunBoxW;
  const boxW = tahunBoxX - 20 - boxX;
  const boxTop = 130;
  const rowH = 42;
  const rows: [string, string][] = [
    ['NO. KIP', kip.noKip],
    ['JENIS PERALATAN', kip.jenisPeralatan],
    ['DEPARTEMEN', kip.departemen],
  ];

  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(boxX, boxTop, boxW, rowH * 3);
  ctx.strokeStyle = '#1f2937';
  ctx.lineWidth = 2;
  ctx.strokeRect(boxX, boxTop, boxW, rowH * 3);

  ctx.textAlign = 'left';
  rows.forEach(([label, value], i) => {
    const yBaseline = boxTop + rowH * i + rowH / 2 + 6;

    ctx.fillStyle = '#111827';
    ctx.font = 'bold 15px Arial';
    ctx.fillText(label, labelX, yBaseline);

    ctx.fillStyle = '#0f1e32';
    ctx.font = '16px Arial';
    ctx.fillText(value, boxX + 14, yBaseline);
  });

  // Kotak TAHUN sejajar kotak nilai, di kanan.
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(tahunBoxX, boxTop, tahunBoxW, 60);
  ctx.strokeStyle = '#1f2937';
  ctx.lineWidth = 2;
  ctx.strokeRect(tahunBoxX, boxTop, tahunBoxW, 60);
  ctx.fillStyle = '#111827';
  ctx.font = 'bold 13px Arial';
  ctx.fillText('TAHUN', tahunBoxX + 14, boxTop + 22);
  ctx.font = 'bold 26px Arial';
  ctx.fillText(String(kip.tahun), tahunBoxX + 14, boxTop + 50);

  // Grid 12 bulan, 2 baris x 6 kolom, warna latar per kuartal seperti kartu fisik.
  const gridTop = 320;
  const gridLeft = 30;
  const gridWidth = canvas.width - 60;
  const cellW = gridWidth / 6;
  const cellH = 155;
  const rowGap = 10;

  for (let bulan = 1; bulan <= 12; bulan++) {
    const idx = bulan - 1;
    const col = idx % 6;
    const row = Math.floor(idx / 6);
    const x = gridLeft + col * cellW;
    const yCell = gridTop + row * (cellH + rowGap);
    const status = statusTampilBulan(kip, bulan);

    ctx.fillStyle = warnaKuartal(bulan);
    ctx.fillRect(x + 3, yCell, cellW - 6, cellH);
    ctx.strokeStyle = '#1f2937';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x + 3, yCell, cellW - 6, cellH);

    ctx.fillStyle = '#111827';
    ctx.textAlign = 'center';
    ctx.font = 'bold 19px Arial';
    ctx.fillText(BULAN_LABEL[idx], x + cellW / 2, yCell + 32);

    if (status === 'SUDAH') {
      ctx.fillStyle = '#0b9d4d';
      ctx.font = 'bold 58px Arial';
      ctx.fillText('✓', x + cellW / 2, yCell + 112);
    } else if (status === 'KUNING') {
      ctx.fillStyle = 'rgba(180,131,0,0.9)';
      ctx.font = 'bold 13px Arial';
      ctx.fillText('BULAN INI', x + cellW / 2, yCell + 100);
    } else if (status === 'MERAH') {
      ctx.fillStyle = 'rgba(153,27,27,0.85)';
      ctx.font = 'bold 13px Arial';
      ctx.fillText('TERLEWAT', x + cellW / 2, yCell + 100);
    }
  }

  return canvas;
}

function KartuMesh({ kip }: { kip: Kip }) {
  const logoPpa = useGambarLogo(LOGO_PPA_URL);
  const logoK3 = useGambarLogo(LOGO_K3_URL);

  const texture = useMemo(() => {
    const canvas = buatCanvasKip(kip, logoPpa, logoK3);
    const tex = new THREE.CanvasTexture(canvas);
    tex.needsUpdate = true;
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, [kip, logoPpa, logoK3]);

  return (
    <Float speed={1.4} rotationIntensity={0.08} floatIntensity={0.6}>
      <mesh>
        <boxGeometry args={[4, 2.98, 0.06]} />
        <meshStandardMaterial map={texture} roughness={0.5} metalness={0.05} />
      </mesh>
    </Float>
  );
}

export function KipCard3D({
  kip,
  tinggi = 360,
  transparan = false,
}: {
  kip: Kip;
  tinggi?: number | string;
  /** Mode AR — canvas tembus pandang supaya kamera di belakangnya kelihatan, tanpa OrbitControls (drag dipakai geser kamera/scan). */
  transparan?: boolean;
}) {
  return (
    <div
      style={{
        width: '100%',
        height: tinggi,
        borderRadius: transparan ? 0 : 18,
        overflow: 'hidden',
        background: transparan ? 'transparent' : 'linear-gradient(135deg, #0f172a, #1e293b)',
      }}
    >
      <Canvas
        camera={{ position: [0, 0, 6], fov: 45 }}
        gl={{ alpha: transparan }}
        style={{ background: 'transparent' }}
      >
        <ambientLight intensity={0.9} />
        <directionalLight position={[5, 5, 5]} intensity={1.1} />
        <KartuMesh kip={kip} />
        {!transparan && <OrbitControls enablePan={false} enableZoom={false} />}
      </Canvas>
    </div>
  );
}
