export type PortalUser = {
  id: number;
  name: string;
  username: string;
  role: string;
  accessKeys?: string[];
  isActive?: boolean;
  vendorId?: number | null;
};

export const ACCESS_KEYS = {
  // HC
  HC: 'HC',
  HC_IR: 'HC_IR',
  HC_RND: 'HC_RND',
  HC_DEKLARASI: 'HC_DEKLARASI',
  HC_TUGAS_DINAS: 'HC_TUGAS_DINAS',
  HC_ANAK_MAGANG: 'HC_ANAK_MAGANG',
  HC_SURAT_BALASAN_MAGANG: 'HC_SURAT_BALASAN_MAGANG',
  HC_SURAT_PENOLAKAN_MAGANG: 'HC_SURAT_PENOLAKAN_MAGANG',
  HC_COMBEN: 'HC_COMBEN',
  HC_MCU: 'HC_MCU',
  HC_HELPDESK: 'HC_HELPDESK',
  HC_KARYAWAN: 'HC_KARYAWAN',

  // GA
  GA: 'GA',
  GA_INVENTORY: 'GA_INVENTORY',
  GA_AKTIVITAS_HARIAN: 'GA_AKTIVITAS_HARIAN',
  GA_PROJECT: 'GA_PROJECT',
  GA_TRANSPORT_SECTION: 'GA_TRANSPORT_SECTION',
  GA_TRANSPORT: 'GA_TRANSPORT',
  GA_TRANSPORT_TIKET: 'GA_TRANSPORT_TIKET',
  GA_TRANSPORT_TRAVEL: 'GA_TRANSPORT_TRAVEL',
  GA_GENERAL_SERVICE: 'GA_GENERAL_SERVICE',
  GA_GS_HOUSEKEEPING: 'GA_GS_HOUSEKEEPING',
  GA_GS_HOUSEKEEPING_INDOOR: 'GA_GS_HOUSEKEEPING_INDOOR',
  GA_GS_HOUSEKEEPING_OUTDOOR: 'GA_GS_HOUSEKEEPING_OUTDOOR',
  GA_GS_PACKMEAL: 'GA_GS_PACKMEAL',
  GA_GS_PACKMEAL_CATERING: 'GA_GS_PACKMEAL_CATERING',
  GA_GS_PACKMEAL_AIR_MINUM: 'GA_GS_PACKMEAL_AIR_MINUM',
  GA_ORDER_PACK_MEAL: 'GA_ORDER_PACK_MEAL',

  // CIVIL (sebelumnya SIPIL)
  CIVIL: 'CIVIL',
  CIVIL_GA_MEP: 'CIVIL_GA_MEP',
  CIVIL_ELECTRIC: 'CIVIL_ELECTRIC',
  CIVIL_AIR: 'CIVIL_AIR',
  CIVIL_INVENTORY_ELECTRIC: 'CIVIL_INVENTORY_ELECTRIC',
  CIVIL_INFRAS: 'CIVIL_INFRAS',
  CIVIL_PROJECT: 'CIVIL_PROJECT',
  CIVIL_PROJECT_TENDER: 'CIVIL_PROJECT_TENDER',
  CIVIL_PROJECT_KONTRAK: 'CIVIL_PROJECT_KONTRAK',
  CIVIL_PROJECT_ENGINEER: 'CIVIL_PROJECT_ENGINEER',
  CIVIL_PROJECT_KONSTRUKSI: 'CIVIL_PROJECT_KONSTRUKSI',
  CIVIL_PROJECT_MEETING: 'CIVIL_PROJECT_MEETING',
  CIVIL_PROJECT_DOKUMEN: 'CIVIL_PROJECT_DOKUMEN',
  CIVIL_PROJECT_FINANCIAL: 'CIVIL_PROJECT_FINANCIAL',
  CIVIL_PROJECT_CLOSING: 'CIVIL_PROJECT_CLOSING',
  CIVIL_WO_INFRAS: 'CIVIL_WO_INFRAS',
  CIVIL_TPS3R: 'CIVIL_TPS3R',
  GA_PEKERJAAN: 'GA_PEKERJAAN',

  // ADMINISTRASI
  ADMINISTRASI: 'ADMINISTRASI',
  ADMINISTRASI_POSTINGAN: 'ADMINISTRASI_POSTINGAN',
  ADMINISTRASI_DOKUMENTASI: 'ADMINISTRASI_DOKUMENTASI',
  GA_SAFETY_MEETING: 'GA_SAFETY_MEETING',
  ADMINISTRASI_FORM: 'ADMINISTRASI_FORM',
  ADMINISTRASI_CSR: 'ADMINISTRASI_CSR',
} as const;

export function getAccessToken(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }

  return (
    localStorage.getItem('hcga_access_token') ||
    sessionStorage.getItem('hcga_access_token')
  );
}

export function getStoredUser(): PortalUser | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const raw =
    localStorage.getItem('hcga_user') ||
    sessionStorage.getItem('hcga_user');

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as PortalUser;
  } catch {
    return null;
  }
}

export function saveStoredUser(user: PortalUser): void {
  if (typeof window === 'undefined') {
    return;
  }

  const storage = localStorage.getItem('hcga_access_token')
    ? localStorage
    : sessionStorage;

  storage.setItem('hcga_user', JSON.stringify(user));
}

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

/** Ambil ulang profil terbaru dari server (mis. setelah vendorId berubah) dan simpan ke storage. */
export async function refreshStoredUser(): Promise<PortalUser | null> {
  const token = getAccessToken();

  if (!token) {
    return null;
  }

  try {
    const response = await fetch(`${API_URL}/auth/profile`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });

    if (!response.ok) {
      return null;
    }

    const user = (await response.json()) as PortalUser;
    saveStoredUser(user);
    return user;
  } catch {
    return null;
  }
}

export function clearSession(): void {
  if (typeof window === 'undefined') {
    return;
  }

  localStorage.removeItem('hcga_access_token');
  localStorage.removeItem('hcga_user');
  sessionStorage.removeItem('hcga_access_token');
  sessionStorage.removeItem('hcga_user');
}

export function hasAccess(user: PortalUser | null, accessKey: string): boolean {
  if (!user) {
    return false;
  }

  if (
    user.role === 'ADMIN' ||
    user.role === 'SUPER_ADMIN' ||
    user.role === 'SECTION_HEAD'
  ) {
    return true;
  }

  const keys = user.accessKeys ?? [];
  return keys.includes(accessKey) || keys.includes('ALL');
}

export function formatRole(role?: string): string {
  if (!role) {
    return '';
  }

  if (role === 'GRUP_LEADER') {
    return 'Group Leader';
  }

  if (role === 'FA') {
    return 'FA';
  }

  if (role === 'HC') {
    return 'HC';
  }

  if (role === 'SUPER_ADMIN') {
    return 'Admin HC';
  }

  if (role === 'SHE') {
    return 'SHE (K3)';
  }

  if (role === 'KLINIK') {
    return 'Klinik Provider';
  }

  if (role === 'PJO') {
    return 'PJO';
  }

  if (role === 'OWNER') {
    return 'Owner';
  }

  if (role === 'VENDOR') {
    return 'Vendor';
  }

  if (role === 'DRIVER') {
    return 'Driver';
  }

  return role
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}
