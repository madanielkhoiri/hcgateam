import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { aktivitasApi, LABEL_JENIS_AKTIVITAS } from "./aktivitas-api";

beforeEach(() => {
 localStorage.clear();
 sessionStorage.clear();
});

afterEach(() => {
 vi.restoreAllMocks();
});

describe("aktivitasApi.terbaru", () => {
 it("mengembalikan data saat response ok", async () => {
 const data = [
 {
 judul: "Poster K3",
 jenis: "POSTINGAN_POSTER" as const,
 uploadedBy: { id: 1, name: "Budi", nrp: "123" },
 createdAt: "2026-03-05T00:00:00.000Z",
 },
 ];
 global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => data }) as unknown as typeof fetch;

 expect(await aktivitasApi.terbaru()).toEqual(data);
 });

 it("gagal diam-diam (kembalikan array kosong) saat response tidak ok, bukan melempar error", async () => {
 global.fetch = vi.fn().mockResolvedValue({ ok: false }) as unknown as typeof fetch;

 expect(await aktivitasApi.terbaru()).toEqual([]);
 });
});

describe("LABEL_JENIS_AKTIVITAS", () => {
 it("mencakup keempat jenis aktivitas rekap lintas modul", () => {
 expect(LABEL_JENIS_AKTIVITAS).toEqual({
 POSTINGAN_POSTER: "Poster baru diunggah",
 POSTINGAN_VIDEO: "Video informasi baru diunggah",
 DOKUMEN_IR: "Dokumen IR baru diunggah",
 IR_COURSE: "Video IR Course baru diunggah",
 });
 });
});
