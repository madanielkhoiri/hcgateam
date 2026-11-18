import { bolehAksesRouteEvaluatorTender, isAksesPenuhEprom, isJabatanEvaluatorTender, normalizeJabatan } from './tender-evaluator-access';

describe('akses evaluator tender berdasarkan jabatan', () => {
  it.each([
    'SECTION HEAD FAW-SCM',
    'section head faw-scm',
    ' Section Head FAW - SCM ',
    'GROUP LEADER FAW-SCM',
    'group leader faw \u2014 scm',
  ])('mengenali %s tanpa terpengaruh kapital dan spasi', (jabatan) => {
    expect(isJabatanEvaluatorTender(jabatan)).toBe(true);
  });

  it('tidak memberi akses kepada jabatan lain', () => {
    expect(isJabatanEvaluatorTender('STAFF FAW-SCM')).toBe(false);
    expect(normalizeJabatan(' Group   Leader FAW - SCM ')).toBe('GROUP LEADER FAW-SCM');
  });

  it('hanya mengizinkan baca tender dan pengisian evaluasi', () => {
    expect(bolehAksesRouteEvaluatorTender('GET', '/api/eprom/tender')).toBe(true);
    expect(bolehAksesRouteEvaluatorTender('GET', '/api/eprom/tender/8')).toBe(true);
    expect(bolehAksesRouteEvaluatorTender('PATCH', '/api/eprom/tender/8/evaluasi-vendor/12')).toBe(true);
    expect(bolehAksesRouteEvaluatorTender('PATCH', '/api/eprom/tender/8/evaluasi-vendor/12/finalisasi')).toBe(true);
    expect(bolehAksesRouteEvaluatorTender('POST', '/api/eprom/tender')).toBe(false);
    expect(bolehAksesRouteEvaluatorTender('PATCH', '/api/eprom/tender/8')).toBe(false);
    expect(bolehAksesRouteEvaluatorTender('POST', '/api/eprom/tender/8/tetapkan-pemenang')).toBe(false);
  });
});

describe('isAksesPenuhEprom — SH/GL FAW-SCM setara Owner bila diberi akses', () => {
  it('Group Leader & Section Head FAW-SCM dengan akses CIVIL_PROJECT = akses penuh', () => {
    expect(isAksesPenuhEprom('GROUP LEADER FAW-SCM', ['CIVIL', 'CIVIL_PROJECT'])).toBe(true);
    expect(isAksesPenuhEprom('section head faw - scm', ['CIVIL_PROJECT'])).toBe(true);
  });

  it('tanpa akses CIVIL_PROJECT tetap bukan akses penuh (hanya evaluator)', () => {
    expect(isAksesPenuhEprom('GROUP LEADER FAW-SCM', ['CIVIL'])).toBe(false);
    expect(isAksesPenuhEprom('SECTION HEAD FAW-SCM', null)).toBe(false);
  });

  it('jabatan lain (termasuk Group Leader GA) tidak ikut', () => {
    expect(isAksesPenuhEprom('GROUP LEADER GA', ['CIVIL_PROJECT'])).toBe(false);
    expect(isAksesPenuhEprom('STAFF FAW-SCM', ['CIVIL_PROJECT'])).toBe(false);
  });
});
