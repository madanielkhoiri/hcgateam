// ==================================================
// FILE: frontend/src/lib/buat-inisial.ts
// FUNGSI: Bikin inisial 2 huruf dari label menu - dipakai modul lama
// (sidebar custom) yang menu-nya cuma punya {label, href, icon}, biar
// badge di bottom nav mobile-nya konsisten dengan ModuleShell (badge
// inisial, bukan ikon).
// ==================================================

export function buatInisial(label: string): string {
  const kata = label.trim().split(/\s+/).filter(Boolean);

  if (kata.length === 0) {
    return '--';
  }

  if (kata.length === 1) {
    return kata[0].slice(0, 2).toUpperCase();
  }

  return (kata[0][0] + kata[1][0]).toUpperCase();
}
