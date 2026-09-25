// ==================================================
// FILE: frontend/src/lib/uploads-url.ts
// FUNGSI: Bangun URL file yang disimpan backend (folder uploads/) —
// endpoint ini sekarang wajib login (lihat uploads-auth.middleware.ts di
// backend), jadi token akses WAJIB disertakan lewat query `?token=` supaya
// <img src>/<a href> yang dirender browser langsung (tidak bisa menyisipkan
// header custom) tetap bisa membuka filenya.
// ==================================================

import { getAccessToken } from './access-control';

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

/** `pathRelatif` adalah path relatif terhadap folder uploads/, mis. "drive/abc.pdf" atau "items/xyz.jpg". */
export function urlUploads(pathRelatif: string): string {
  const token = getAccessToken();
  const query = token ? `?token=${encodeURIComponent(token)}` : '';

  return `${API_URL}/uploads/${pathRelatif}${query}`;
}

/**
 * Untuk URL file yang dirangkai dari basis API + path di database (mis.
 * "/uploads/nota/abc.jpg"). Token HANYA ditempel ke URL milik API sendiri;
 * URL eksternal (http...) dikembalikan apa adanya supaya token tidak bocor.
 */
export function urlFileApi(baseApi: string, pathDb: string | null | undefined): string {
  if (!pathDb) return '';

  if (pathDb.startsWith('http')) {
    return pathDb;
  }

  const url = `${baseApi}${pathDb}`;
  const token = getAccessToken();

  if (!token) {
    return url;
  }

  return `${url}${url.includes('?') ? '&' : '?'}token=${encodeURIComponent(token)}`;
}

// ==================================================
// SELESAI: frontend/src/lib/uploads-url.ts
// ==================================================
