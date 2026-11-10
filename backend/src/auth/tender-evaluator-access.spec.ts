import { bolehAksesRouteEvaluatorTender, isJabatanEvaluatorTender, normalizeJabatan } from './tender-evaluator-access';

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
