export type AccessCatalogItem = {
  key: string;
  title: string;
  description: string;
  parentKey: string | null;
  level: 'department' | 'section' | 'card';
};

export const ACCESS_CATALOG: AccessCatalogItem[] = [
  // ==================================================
  // HC (Human Capital)
  // ==================================================
  {
    key: 'HC',
    title: 'HC',
    description: 'Akses judul utama Human Capital pada dashboard.',
    parentKey: null,
    level: 'department',
  },
  {
    key: 'HC_IR',
    title: 'IR',
    description: 'Industrial Relations. Belum tersedia, pembatas untuk pengembangan berikutnya.',
    parentKey: 'HC',
    level: 'section',
  },
  {
    key: 'HC_RND',
    title: 'R & D',
    description: 'Research & Development.',
    parentKey: 'HC',
    level: 'section',
  },
  {
    key: 'HC_DEKLARASI',
    title: 'Deklarasi Dinas',
    description: 'Pengelolaan deklarasi perjalanan dinas dan uang operasional.',
    parentKey: 'HC_RND',
    level: 'card',
  },
  {
    key: 'HC_COMBEN',
    title: 'Comben & Benefit',
    description: 'Compensation & Benefit.',
    parentKey: 'HC',
    level: 'section',
  },
  {
    key: 'HC_MCU',
    title: 'MCU Periodik',
    description:
      'Monitoring MCU periodik: jadwal, hasil, rekomendasi, Follow Up, dan induksi ulang.',
    parentKey: 'HC_COMBEN',
    level: 'card',
  },
  {
    key: 'HC_HELPDESK',
    title: 'Helpdesk Center',
    description: 'Pelaporan kendala, tiket, dan riwayat penyelesaian.',
    parentKey: 'HC_COMBEN',
    level: 'card',
  },

  // ==================================================
  // GA (General Affair)
  // ==================================================
  {
    key: 'GA',
    title: 'GA',
    description: 'Akses judul utama General Affair pada dashboard.',
    parentKey: null,
    level: 'department',
  },
  {
    key: 'GA_INVENTORY',
    title: 'Inventory',
    description: 'Master barang, barang masuk, barang keluar, dan stok.',
    parentKey: 'GA',
    level: 'card',
  },
  {
    key: 'GA_AKTIVITAS_HARIAN',
    title: 'Aktivitas Harian',
    description: 'Daily Activity dan Potong Rumput.',
    parentKey: 'GA',
    level: 'card',
  },
  {
    key: 'GA_PROJECT',
    title: 'Project',
    description: 'Pre-Activity Check dan Post Activity.',
    parentKey: 'GA',
    level: 'card',
  },
  {
    key: 'GA_TRANSPORT_SECTION',
    title: 'Transport',
    description: 'Dashboard dan data operasional transport.',
    parentKey: 'GA',
    level: 'section',
  },
  {
    key: 'GA_TRANSPORT',
    title: 'Transport',
    description: 'Dashboard dan data operasional transport.',
    parentKey: 'GA_TRANSPORT_SECTION',
    level: 'card',
  },
  {
    key: 'GA_GENERAL_SERVICE',
    title: 'GS (General Service)',
    description: 'Housekeeping dan Packmeal.',
    parentKey: 'GA',
    level: 'section',
  },
  {
    key: 'GA_GS_HOUSEKEEPING',
    title: 'Housekeeping',
    description: 'Indoor dan Outdoor.',
    parentKey: 'GA_GENERAL_SERVICE',
    level: 'section',
  },
  {
    key: 'GA_GS_HOUSEKEEPING_INDOOR',
    title: 'Indoor',
    description: 'Belum tersedia, pembatas untuk pengembangan berikutnya.',
    parentKey: 'GA_GS_HOUSEKEEPING',
    level: 'card',
  },
  {
    key: 'GA_GS_HOUSEKEEPING_OUTDOOR',
    title: 'Outdoor',
    description: 'Potong Rumput.',
    parentKey: 'GA_GS_HOUSEKEEPING',
    level: 'section',
  },
  {
    key: 'GA_GS_PACKMEAL',
    title: 'Packmeal',
    description: 'Catering dan Air Minum.',
    parentKey: 'GA_GENERAL_SERVICE',
    level: 'section',
  },
  {
    key: 'GA_GS_PACKMEAL_CATERING',
    title: 'Catering',
    description: 'Order Pack Meal.',
    parentKey: 'GA_GS_PACKMEAL',
    level: 'section',
  },
  {
    key: 'GA_ORDER_PACK_MEAL',
    title: 'Order Pack Meal',
    description: 'Form pemesanan konsumsi dan pengelolaan seluruh order.',
    parentKey: 'GA_GS_PACKMEAL_CATERING',
    level: 'card',
  },
  {
    key: 'GA_GS_PACKMEAL_AIR_MINUM',
    title: 'Air Minum',
    description: 'Belum tersedia, pembatas untuk pengembangan berikutnya.',
    parentKey: 'GA_GS_PACKMEAL',
    level: 'card',
  },

  // ==================================================
  // CIVIL (sebelumnya SIPIL)
  // ==================================================
  {
    key: 'CIVIL',
    title: 'CIVIL',
    description: 'Akses judul utama CIVIL pada dashboard.',
    parentKey: null,
    level: 'department',
  },
  {
    key: 'CIVIL_GA_MEP',
    title: 'GA MEP',
    description: 'Mechanical, Electrical & Plumbing.',
    parentKey: 'CIVIL',
    level: 'section',
  },
  {
    key: 'CIVIL_ELECTRIC',
    title: 'Electric',
    description: 'Inventory Electric.',
    parentKey: 'CIVIL_GA_MEP',
    level: 'section',
  },
  {
    key: 'CIVIL_AIR',
    title: 'Air',
    description: 'Belum tersedia, pembatas untuk pengembangan berikutnya.',
    parentKey: 'CIVIL_GA_MEP',
    level: 'section',
  },
  {
    key: 'CIVIL_INFRAS',
    title: 'CIVIL INFRAS',
    description: 'Project dan Work Order Infrastruktur.',
    parentKey: 'CIVIL',
    level: 'section',
  },
  {
    key: 'CIVIL_PROJECT',
    title: 'PROJECT',
    description: 'Belum tersedia, pembatas untuk pengembangan berikutnya.',
    parentKey: 'CIVIL_INFRAS',
    level: 'section',
  },
  {
    key: 'CIVIL_WO_INFRAS',
    title: 'WO INFRAS',
    description: 'Work Order dan Serah Terima Pekerjaan.',
    parentKey: 'CIVIL_INFRAS',
    level: 'section',
  },
  {
    key: 'GA_PEKERJAAN',
    title: 'Pekerjaan',
    description: 'Work Order dan Serah Terima Pekerjaan.',
    parentKey: 'CIVIL_WO_INFRAS',
    level: 'card',
  },

  // ==================================================
  // ADMINISTRASI
  // ==================================================
  {
    key: 'ADMINISTRASI',
    title: 'ADMINISTRASI',
    description: 'Akses judul utama Administrasi pada dashboard.',
    parentKey: null,
    level: 'department',
  },
  {
    key: 'ADMINISTRASI_DOKUMENTASI',
    title: 'Dokumentasi',
    description: 'Belum tersedia, pembatas untuk pengembangan berikutnya.',
    parentKey: 'ADMINISTRASI',
    level: 'card',
  },
  {
    key: 'GA_SAFETY_MEETING',
    title: 'P5M / Safety Meeting',
    description: 'P5M dan dokumentasi safety meeting.',
    parentKey: 'ADMINISTRASI',
    level: 'card',
  },
  {
    key: 'ADMINISTRASI_FORM',
    title: 'Form Download',
    description: 'Belum tersedia, form-form yang dapat diunduh.',
    parentKey: 'ADMINISTRASI',
    level: 'card',
  },
  {
    key: 'ADMINISTRASI_CSR',
    title: 'CSR',
    description: 'Belum tersedia, pembatas untuk pengembangan berikutnya.',
    parentKey: 'ADMINISTRASI',
    level: 'card',
  },
];

export const ALL_ACCESS_KEYS = ACCESS_CATALOG.map((item) => item.key);
export const ALLOWED_ACCESS_KEYS = new Set(ALL_ACCESS_KEYS);
export const DEFAULT_GUEST_ACCESS_KEYS = [
  'GA',
  'GA_GENERAL_SERVICE',
  'GA_GS_PACKMEAL',
  'GA_GS_PACKMEAL_CATERING',
  'GA_ORDER_PACK_MEAL',
];

const PARENT_BY_KEY = new Map(
  ACCESS_CATALOG.map((item) => [item.key, item.parentKey]),
);

/** Seluruh leluhur (parent, grandparent, dst.) satu key sampai ke akar. */
function ancestorsOf(key: string): string[] {
  const hasil: string[] = [];
  let parent = PARENT_BY_KEY.get(key) ?? null;

  while (parent) {
    hasil.push(parent);
    parent = PARENT_BY_KEY.get(parent) ?? null;
  }

  return hasil;
}

export function sanitizeAccessKeys(values: string[] | undefined): string[] {
  const requested = new Set(
    (values ?? [])
      .map((value) => String(value).trim().toUpperCase())
      .filter((value) => ALLOWED_ACCESS_KEYS.has(value)),
  );

  for (const key of Array.from(requested)) {
    for (const ancestor of ancestorsOf(key)) {
      requested.add(ancestor);
    }
  }

  return ALL_ACCESS_KEYS.filter((key) => requested.has(key));
}
