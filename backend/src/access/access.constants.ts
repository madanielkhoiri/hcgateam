export type AccessCatalogItem = {
  key: string;
  title: string;
  description: string;
  parentKey: string | null;
  level: 'department' | 'card';
};

export const ACCESS_CATALOG: AccessCatalogItem[] = [
  {
    key: 'HC',
    title: 'HC',
    description: 'Akses judul utama Human Capital pada dashboard.',
    parentKey: null,
    level: 'department',
  },
  {
    key: 'HC_MCU',
    title: 'MCU Periodik',
    description:
      'Monitoring MCU periodik: jadwal, hasil, rekomendasi, Follow Up, dan induksi ulang.',
    parentKey: 'HC',
    level: 'card',
  },
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
    key: 'GA_PEKERJAAN',
    title: 'Pekerjaan',
    description: 'Work Order dan Serah Terima Pekerjaan.',
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
    key: 'GA_SAFETY_MEETING',
    title: 'Safety Meeting',
    description: 'P5M dan dokumentasi safety meeting.',
    parentKey: 'GA',
    level: 'card',
  },
  {
    key: 'GA_TRANSPORT',
    title: 'Transport',
    description: 'Dashboard dan data operasional transport.',
    parentKey: 'GA',
    level: 'card',
  },
  {
    key: 'GA_ORDER_PACK_MEAL',
    title: 'Order Pack Meal',
    description: 'Form pemesanan konsumsi dan pengelolaan seluruh order.',
    parentKey: 'GA',
    level: 'card',
  },
  {
    key: 'GA_GENERAL_SERVICE',
    title: 'General Service',
    description: 'Akses card General Service untuk pengembangan berikutnya.',
    parentKey: 'GA',
    level: 'card',
  },
  {
    key: 'SIPIL',
    title: 'SIPIL',
    description: 'Akses judul utama SIPIL pada dashboard.',
    parentKey: null,
    level: 'department',
  },
];

export const ALL_ACCESS_KEYS = ACCESS_CATALOG.map((item) => item.key);
export const ALLOWED_ACCESS_KEYS = new Set(ALL_ACCESS_KEYS);
export const DEFAULT_GUEST_ACCESS_KEYS = ['GA', 'GA_ORDER_PACK_MEAL'];

export function sanitizeAccessKeys(values: string[] | undefined): string[] {
  const requested = new Set(
    (values ?? [])
      .map((value) => String(value).trim().toUpperCase())
      .filter((value) => ALLOWED_ACCESS_KEYS.has(value)),
  );

  for (const item of ACCESS_CATALOG) {
    if (item.parentKey && requested.has(item.key)) {
      requested.add(item.parentKey);
    }
  }

  return ALL_ACCESS_KEYS.filter((key) => requested.has(key));
}
