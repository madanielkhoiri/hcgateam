const JABATAN_EVALUATOR_TENDER = new Set([
  'SECTION HEAD FAW-SCM',
  'GROUP LEADER FAW-SCM',
  'GROUP LEADER GA',
]);

export function normalizeJabatan(jabatan?: string | null): string {
  return (jabatan ?? '')
    .trim()
    .toUpperCase()
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/\s*-\s*/g, '-')
    .replace(/\s+/g, ' ');
}

export function isJabatanEvaluatorTender(jabatan?: string | null): boolean {
  return JABATAN_EVALUATOR_TENDER.has(normalizeJabatan(jabatan));
}

/**
 * Jabatan FAW-SCM yang boleh mendapat akses PENUH e-ProM (setara Owner),
 * tapi hanya bila akunnya diberi akses CIVIL_PROJECT di Manajemen Akun.
 * Tanpa akses itu mereka tetap hanya evaluator tender.
 */
const JABATAN_EPROM_PENUH = new Set([
  'SECTION HEAD FAW-SCM',
  'GROUP LEADER FAW-SCM',
]);

export function isAksesPenuhEprom(
  jabatan?: string | null,
  accessKeys?: string[] | null,
): boolean {
  return (
    JABATAN_EPROM_PENUH.has(normalizeJabatan(jabatan)) &&
    (accessKeys ?? []).includes('CIVIL_PROJECT')
  );
}

export function bolehAksesRouteEvaluatorTender(method: string | undefined, requestUrl: string): boolean {
  const path = requestUrl.split('?')[0];
  if ((method ?? 'GET').toUpperCase() === 'GET') {
    return /^\/api\/eprom\/tender(?:\/|$)/i.test(path);
  }
  return (
    (method ?? '').toUpperCase() === 'PATCH' &&
    /^\/api\/eprom\/tender\/\d+\/evaluasi-vendor\/\d+(?:\/finalisasi)?\/?$/i.test(path)
  );
}
