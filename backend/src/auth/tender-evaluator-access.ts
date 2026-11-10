const JABATAN_EVALUATOR_TENDER = new Set([
  'SECTION HEAD FAW-SCM',
  'GROUP LEADER FAW-SCM',
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
