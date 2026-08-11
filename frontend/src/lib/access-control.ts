export type PortalUser = {
  id: number;
  name: string;
  username: string;
  role: string;
  accessKeys?: string[];
  isActive?: boolean;
};

export const ACCESS_KEYS = {
  HC: 'HC',
  GA: 'GA',
  GA_INVENTORY: 'GA_INVENTORY',
  GA_PEKERJAAN: 'GA_PEKERJAAN',
  GA_AKTIVITAS_HARIAN: 'GA_AKTIVITAS_HARIAN',
  GA_PROJECT: 'GA_PROJECT',
  GA_SAFETY_MEETING: 'GA_SAFETY_MEETING',
  GA_TRANSPORT: 'GA_TRANSPORT',
  GA_ORDER_PACK_MEAL: 'GA_ORDER_PACK_MEAL',
  GA_GENERAL_SERVICE: 'GA_GENERAL_SERVICE',
  SIPIL: 'SIPIL',
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

  if (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') {
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

  return role
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}
