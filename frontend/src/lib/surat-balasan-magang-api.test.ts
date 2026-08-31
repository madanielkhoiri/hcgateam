import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
 formatTanggal,
 suratBalasanMagangApi,
 SuratBalasanMagangApiError,
} from "./surat-balasan-magang-api";

beforeEach(() => {
 localStorage.clear();
 sessionStorage.clear();
});

afterEach(() => {
 vi.restoreAllMocks();
});

describe("suratBalasanMagangApi", () => {
 it("kirim() tanpa body tidak menyertakan properti body", async () => {
 const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({}) });
 global.fetch = fetchMock as unknown as typeof fetch;

 await suratBalasanMagangApi.kirim("/generate/5");

 expect(fetchMock.mock.calls[0][1].body).toBeUndefined();
 });

 it("melempar SuratBalasanMagangApiError saat gagal", async () => {
 global.fetch = vi.fn().mockResolvedValue({
 ok: false,
 status: 400,
 json: async () => ({ message: ["baris wajib diisi minimal 1"] }),
 }) as unknown as typeof fetch;

 await expect(suratBalasanMagangApi.ambil("/")).rejects.toMatchObject({
 name: "SuratBalasanMagangApiError",
 message: "baris wajib diisi minimal 1",
 });
 });

 it("urlPdf menyusun URL uploads dari nama file", () => {
 expect(suratBalasanMagangApi.urlPdf("surat/balasan-1.pdf")).toContain("/uploads/surat/balasan-1.pdf");
 });
});

describe("SuratBalasanMagangApiError", () => {
 it("instance-nya Error dengan status tersimpan", () => {
 expect(new SuratBalasanMagangApiError("x", 404).status).toBe(404);
 });
});

describe("formatTanggal", () => {
 it("mengembalikan '-' untuk nilai kosong", () => {
 expect(formatTanggal(null)).toBe("-");
 });

 it("memformat dalam UTC (tidak bergantung timezone mesin)", () => {
 expect(formatTanggal("2026-03-05T23:00:00.000Z")).toBe("05 Mar 2026");
 });
});
