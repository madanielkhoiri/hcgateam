import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
 formatTanggal,
 suratPenolakanMagangApi,
 SuratPenolakanMagangApiError,
} from "./surat-penolakan-magang-api";

beforeEach(() => {
 localStorage.clear();
 sessionStorage.clear();
});

afterEach(() => {
 vi.restoreAllMocks();
});

describe("suratPenolakanMagangApi", () => {
 it("kirim() dengan body memakai method POST dan body ter-JSON-stringify", async () => {
 const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({}) });
 global.fetch = fetchMock as unknown as typeof fetch;

 await suratPenolakanMagangApi.kirim("/", { anakMagangId: 1, alasanPenolakan: "Kuota penuh" });

 const [, init] = fetchMock.mock.calls[0];
 expect(init.method).toBe("POST");
 expect(init.body).toBe(JSON.stringify({ anakMagangId: 1, alasanPenolakan: "Kuota penuh" }));
 });

 it("melempar SuratPenolakanMagangApiError saat gagal", async () => {
 global.fetch = vi.fn().mockResolvedValue({
 ok: false,
 status: 400,
 json: async () => ({ message: "alasanPenolakan wajib diisi" }),
 }) as unknown as typeof fetch;

 await expect(suratPenolakanMagangApi.ambil("/1")).rejects.toMatchObject({
 name: "SuratPenolakanMagangApiError",
 message: "alasanPenolakan wajib diisi",
 });
 });

 it("urlPdf menyusun URL uploads dari nama file", () => {
 expect(suratPenolakanMagangApi.urlPdf("surat/penolakan-1.pdf")).toContain("/uploads/surat/penolakan-1.pdf");
 });
});

describe("SuratPenolakanMagangApiError", () => {
 it("instance-nya Error dengan status tersimpan", () => {
 expect(new SuratPenolakanMagangApiError("x", 422).status).toBe(422);
 });
});

describe("formatTanggal", () => {
 it("mengembalikan '-' untuk nilai kosong", () => {
 expect(formatTanggal(undefined)).toBe("-");
 });

 it("memformat dalam UTC (tidak bergantung timezone mesin)", () => {
 expect(formatTanggal("2026-03-05T23:00:00.000Z")).toBe("05 Mar 2026");
 });
});
