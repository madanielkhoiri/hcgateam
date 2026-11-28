// ==================================================
// Konversi otomatis foto HEIC/HEIF (format bawaan iPhone/iPad) menjadi JPG
// untuk SEMUA upload aplikasi.
//
// Server tidak bisa membaca HEIC: foto tampil rusak di Chrome/Windows dan
// kosong ("Gambar gagal dibaca") di PDF. Safari/iOS bisa membuka HEIC, jadi
// sebelum request dikirim, setiap file HEIC di dalam FormData digambar ulang
// ke canvas dan dikirim sebagai JPG. File lain (JPG/PNG/WebP/PDF/dokumen)
// tidak disentuh sama sekali.
//
// Dipasang sekali lewat window.fetch (semua upload aplikasi memakai fetch),
// sehingga setiap card/halaman upload ikut terlindungi tanpa diubah satu-satu.
// ==================================================

const SISI_MAKS = 2560;
const KUALITAS_JPG = 0.85;

export function apakahHeic(file: File): boolean {
  return /\.(heic|heif)$/i.test(file.name) || /^image\/hei[cf]/i.test(file.type);
}

function gantiEkstensiJpg(nama: string): string {
  const dasar = nama.replace(/\.[^/.]+$/, '') || 'foto';
  return `${dasar}.jpg`;
}

function muatGambar(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const gambar = new Image();
    gambar.onload = () => {
      URL.revokeObjectURL(url);
      resolve(gambar);
    };
    gambar.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error(`Foto ${file.name} tidak dapat dibuka browser`));
    };
    gambar.src = url;
  });
}

/** Ubah satu file HEIC menjadi JPG. Bila browser tidak bisa membukanya, file asli dikembalikan. */
export async function heicKeJpg(file: File): Promise<File> {
  if (!apakahHeic(file)) return file;
  try {
    const gambar = await muatGambar(file);
    const skala = Math.min(1, SISI_MAKS / Math.max(gambar.naturalWidth, gambar.naturalHeight));
    const lebar = Math.max(1, Math.round(gambar.naturalWidth * skala));
    const tinggi = Math.max(1, Math.round(gambar.naturalHeight * skala));
    const canvas = document.createElement('canvas');
    canvas.width = lebar;
    canvas.height = tinggi;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, lebar, tinggi);
    ctx.drawImage(gambar, 0, 0, lebar, tinggi);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', KUALITAS_JPG));
    if (!blob || blob.type !== 'image/jpeg') return file;
    return new File([blob], gantiEkstensiJpg(file.name), { type: 'image/jpeg', lastModified: Date.now() });
  } catch {
    return file;
  }
}

/** FormData baru dengan semua file HEIC sudah menjadi JPG (urutan & nama field tetap). */
export async function konversiHeicDiFormData(form: FormData): Promise<FormData> {
  const isi = Array.from(form.entries());
  if (!isi.some(([, nilai]) => nilai instanceof File && apakahHeic(nilai))) return form;
  const baru = new FormData();
  for (const [kunci, nilai] of isi) {
    if (nilai instanceof File) {
      const hasil = await heicKeJpg(nilai);
      baru.append(kunci, hasil, hasil.name);
    } else {
      baru.append(kunci, nilai);
    }
  }
  return baru;
}

const PENANDA = '__hcgaKonversiHeic';

/** Pasang konversi HEIC di window.fetch (aman dipanggil berkali-kali). */
export function pasangKonversiHeicGlobal(): void {
  if (typeof window === 'undefined') return;
  const w = window as unknown as Record<string, unknown>;
  if (w[PENANDA]) return;
  w[PENANDA] = true;
  const fetchAsli = window.fetch.bind(window);
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    if (init?.body instanceof FormData) {
      const body = await konversiHeicDiFormData(init.body);
      if (body !== init.body) return fetchAsli(input, { ...init, body });
    }
    return fetchAsli(input, init);
  };
}
