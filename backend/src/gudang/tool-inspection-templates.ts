// Checklist inspeksi peralatan kerja sesuai form PPA-ADRO-F-HCGA-94 (Rev. 0).
// Setiap alat yang dipinjam wajib diinspeksi memakai checklist sesuai jenisnya.

export type ToolInspectionItem = { item: string; standard: string };
export type ToolInspectionTemplate = {
  key: string;
  title: string;
  /** Form Jack Hammer memakai baris DATE dan LOKASI, bukan TANGGAL INSPEKSI. */
  withLocation?: boolean;
  items: ToolInspectionItem[];
};

const NORMAL = 'Kondisi normal dan berfungsi dengan baik';

export const TOOL_INSPECTION_TEMPLATES: ToolInspectionTemplate[] = [
  {
    key: 'JACK_HAMMER',
    title: 'Jack Hammer',
    withLocation: true,
    items: [
      { item: 'Kondisi Bodi Mesin', standard: 'Kondisi utuh dan bebas dari kontaminasi lumpur dll' },
      { item: 'Mata Drill', standard: 'Dalam kondisi baik' },
      { item: 'Pelumas pada Drill', standard: 'Tercukupi' },
      { item: 'Tombol on/off', standard: 'Dalam kondisi baik' },
      { item: 'Getaran', standard: 'Getaran stabil' },
      { item: 'Kabel Listrik', standard: 'Dalam kondisi baik' },
    ],
  },
  {
    key: 'BOR_CORDLESS',
    title: 'Bor Cordless',
    items: [
      { item: 'Kondisi Bodi Mesin', standard: 'Kondisi mesin kokoh dan bersih' },
      { item: 'Spindel (pencengkram mata bor)', standard: 'Kondisi menahan rapat mata bor' },
      { item: 'Mata Bor', standard: 'Kondisi baik tidak aus' },
      { item: 'Start-Stop Switch', standard: 'Dalam kondisi baik dan normal' },
      { item: 'Baut pengikat', standard: 'Dalam keadaan kencang dan rapat' },
      { item: 'Baterai Bor', standard: 'Baterai terisi penuh' },
    ],
  },
  {
    key: 'GUNTING_TASO',
    title: 'Gunting Taso',
    items: [
      { item: 'Kondisi Handle Gunting', standard: 'Kondisi bersih bebas dari kontaminasi lumpur dll' },
      { item: 'Mata Gunting', standard: 'Kondisi baik dan tajam' },
      { item: 'Gerigi Gunting', standard: 'Kondisi tidak aus' },
      { item: 'Baut pengikat', standard: 'Dalam kondisi terikat kencang' },
    ],
  },
  {
    key: 'VIBRATOR',
    title: 'Vibrator',
    items: [
      { item: 'Kondisi Mesin', standard: 'Kondisi bersih bebas dari sisa semen, lumpur dll' },
      { item: 'Shaft (Selang penghantar)', standard: 'Kondisi baik tidak ada kebocoran' },
      { item: 'Needle (Kepala Vibrator)', standard: 'Kondisi berfungsi baik dan stabil' },
      { item: 'Tombol Power', standard: 'Berfungsi dengan baik' },
      { item: 'Kelistrikan', standard: 'Kabel dalam kondisi baik (tidak terbuka)' },
      { item: 'Handle Mesin', standard: 'Dalam kondisi baik dan kokoh' },
    ],
  },
  {
    key: 'MESIN_TROWEL',
    title: 'Mesin Trowel',
    items: [
      { item: 'Kondisi Mesin', standard: 'Kondisi bersih bebas dari sisa semen, lumpur dll' },
      { item: 'Saklar Power on/off', standard: 'Berfungsi dengan baik' },
      { item: 'Recoil Starter', standard: 'Berfungsi dengan baik' },
      { item: 'Pisau Trowel', standard: 'Kondisi pisau baik (tidak patah)' },
      { item: 'Stang (Handle)', standard: 'Stang dalam kondisi baik' },
      { item: 'Tuas Gas', standard: 'Berfungsi dengan baik' },
      { item: 'Pengatur Kemiringan Pisau Trowel', standard: 'Berfungsi dengan baik' },
      { item: 'Cover Pelindung Pisau Trowel', standard: 'Cover menutup pisau keseluruhan' },
      { item: 'Tabung pengisian Bahan Bakar', standard: 'Dalam kondisi baik (tidak ada kebocoran)' },
    ],
  },
  {
    key: 'GUNTING_BESI',
    title: 'Gunting Besi',
    items: [
      { item: 'Kondisi Handle Gunting', standard: 'Kondisi bersih bebas dari kontaminasi lumpur dll' },
      { item: 'Mata Gunting', standard: 'Kondisi baik dan tajam' },
      { item: 'Gerigi Gunting', standard: 'Kondisi tidak aus' },
      { item: 'Baut pengikat', standard: 'Dalam kondisi terikat kencang' },
    ],
  },
  {
    // Di form asli halaman ini berjudul "Mesin Molen", tetapi isinya checklist
    // mesin las (kabel las, stang ground, stang holder).
    key: 'MESIN_LAS',
    title: 'Mesin Las',
    items: [
      { item: 'Panel Listrik', standard: 'Kondisi bersih bebas dari kontaminasi lumpur dll' },
      { item: 'Grounding', standard: 'Dalam kondisi baik' },
      { item: 'Kabel Power', standard: 'Kondisi baik (tidak mengelupas)' },
      { item: 'Tombol Power On/Off', standard: 'Berfungsi dengan baik' },
      { item: 'Kabel Las', standard: 'Kondisi baik (tidak mengelupas)' },
      { item: 'Stang Ground', standard: 'Berfungsi dengan baik' },
      { item: 'Stang Holder', standard: 'Berfungsi dengan baik' },
      { item: 'Battery (Sistem Elektrik)', standard: 'Battery terisi penuh' },
    ],
  },
  {
    key: 'MESIN_GERINDA',
    title: 'Mesin Gerinda',
    items: [
      { item: 'Kondisi Kabel', standard: 'Kondisi baik (tidak mengelupas)' },
      { item: 'Mesin Gerinda diisolasi Ganda', standard: 'Mesin diisolasi ganda' },
      { item: 'Memiliki 3 phase dan Grounding', standard: 'Berfungsi dengan baik' },
      { item: 'Tombol Power On/Off', standard: 'Berfungsi dengan baik' },
      { item: 'Kondisi mesin Gerinda', standard: 'Kondisi baik' },
      { item: 'Leher penjepit cakra potong (mata gerinda)', standard: 'Kondisi berfungsi dengan baik' },
      { item: 'Leher-leher gerinda sudah sesuai untuk pemasangan cakra potong (mata gerinda)', standard: 'Kondisi berfungsi dengan baik' },
      { item: 'Pemilihan cakra gerinda (disk gerinda) RPM > RPM spesifikasi mesin gerinda', standard: 'Pemilihan yang sesuai' },
      { item: 'Pemasangan pelindung cakram potong (mata gerinda)', standard: 'Kondisi baik tidak retak' },
    ],
  },
  {
    key: 'MESIN_GERGAJI',
    title: 'Mesin Gergaji',
    items: [
      { item: 'Handle Gergaji', standard: 'Kondisi baik dan kokoh' },
      { item: 'Mata Gergaji', standard: 'Mata gergaji tajam' },
      { item: 'Gerigi Gergaji', standard: 'Kondisi baik (tidak ada yang patah)' },
      { item: 'Baut Pengikat', standard: 'Baut terikat dengan kencang' },
    ],
  },
  {
    key: 'MESIN_STAMPER',
    title: 'Mesin Stamper',
    items: [
      { item: 'Pegangan Pengarah', standard: 'Kondisi normal dan berfungsi dengan baik' },
      { item: 'Mesin Stamper', standard: 'Kondisi mesin dalam keadaan baik' },
      { item: 'Plat Tumbuk', standard: 'Kondisi baik (berfungsi normal)' },
      { item: 'Baut Pengikat', standard: 'Baut terikat dengan kencang' },
      { item: 'Penampung Bahan bakar', standard: 'Tidak ada kebocoran' },
      { item: 'Roda Kaki', standard: 'Kondisi berputar dengan baik' },
    ],
  },
  {
    key: 'SCAFFOLDING',
    title: 'Scaffolding',
    items: ['Cat Walk', 'Arm Lock', 'Cross Brace', 'Joint Pin', 'Jack Base', 'Roda Perancah', 'Handrail', 'Clamp Hidup']
      .map((item) => ({ item, standard: NORMAL })),
  },
  {
    key: 'BODY_HARNESS',
    title: 'Body Harness',
    items: ['Webbing (Anyaman)', 'Jahitan', 'Buckles', 'D-Rings', 'Back Pad', 'Keepers', 'Snap Hook', 'Shock Abs', 'Rope & Splice', 'Thimbles']
      .map((item) => ({ item, standard: NORMAL })),
  },
  {
    key: 'MESIN_MOLEN',
    title: 'Mesin Molen',
    items: ['Mesin', 'Starter', 'Oli Mesin', 'Aki/air Aki', 'Bahan Bakar Minyak (Fuel)', 'V Belt', 'Tabung Aduk', 'Stir kontrol Tabung', 'Pijakan Stir Kontrol']
      .map((item) => ({ item, standard: NORMAL })),
  },
  {
    key: 'MESIN_POTONG_RUMPUT',
    title: 'Mesin Potong Rumput',
    items: [
      { item: 'Tali Stater', standard: NORMAL },
      { item: 'Kontak On/Off', standard: NORMAL },
      { item: 'Busi', standard: NORMAL },
      { item: 'Knalpot', standard: NORMAL },
      { item: 'Filter Udara', standard: NORMAL },
      { item: 'Stang', standard: NORMAL },
      { item: 'Kabel Busi', standard: NORMAL },
      { item: 'Cap Mesin', standard: 'Kondisi baik tertutup rapat' },
      { item: 'Bracket Mata pisau', standard: 'Kondisi baik tidak pecah' },
      { item: 'Baut pengunci Mata Pisau', standard: 'Kondisi terkunci kuat' },
      { item: 'Tali Senar', standard: 'Kondisi baik tidak putus' },
      { item: 'Bahan bakar', standard: 'Terisi maksimal' },
      { item: 'Tutup Bahan Bakar', standard: 'Kondisi baik dan tertutup rapat' },
    ],
  },
  {
    // Untuk alat yang tidak punya form khusus (mis. alat Electric).
    key: 'UMUM',
    title: 'Umum (alat tanpa form khusus)',
    items: [
      { item: 'Kondisi fisik / bodi alat', standard: 'Utuh, bersih, tidak retak atau pecah' },
      { item: 'Fungsi alat', standard: 'Berfungsi dengan baik' },
      { item: 'Kabel / sumber daya (bila ada)', standard: 'Tidak mengelupas, baterai terisi' },
      { item: 'Kelengkapan & pengaman', standard: 'Lengkap dan terpasang' },
    ],
  },
];

const KATA_KUNCI: Array<[RegExp, string]> = [
  [/JACK\s*HAMMER/, 'JACK_HAMMER'],
  [/\bBOR\b|CORDLESS|DRILL/, 'BOR_CORDLESS'],
  [/TASO/, 'GUNTING_TASO'],
  [/GUNTING/, 'GUNTING_BESI'],
  [/VIBRATOR/, 'VIBRATOR'],
  [/TROWEL/, 'MESIN_TROWEL'],
  [/\bLAS\b|WELDING/, 'MESIN_LAS'],
  [/GERINDA|GRINDA|GRINDER/, 'MESIN_GERINDA'],
  [/GERGAJI|SAW/, 'MESIN_GERGAJI'],
  [/STAMPER/, 'MESIN_STAMPER'],
  [/SCAFFOLD|PERANCAH/, 'SCAFFOLDING'],
  [/HARNESS/, 'BODY_HARNESS'],
  [/MOLEN|MIXER/, 'MESIN_MOLEN'],
  [/RUMPUT|BRUSH\s*CUTTER/, 'MESIN_POTONG_RUMPUT'],
];

export function templateByKey(key?: string | null): ToolInspectionTemplate | undefined {
  return TOOL_INSPECTION_TEMPLATES.find((item) => item.key === key);
}

/** Jenis inspeksi alat: pilihan di Master Alat, atau ditebak dari nama alat. */
export function resolveInspectionKey(inspectionType: string | null | undefined, toolName: string): string {
  if (templateByKey(inspectionType)) return inspectionType as string;
  const nama = String(toolName || '').toUpperCase();
  return KATA_KUNCI.find(([pola]) => pola.test(nama))?.[1] ?? 'UMUM';
}
