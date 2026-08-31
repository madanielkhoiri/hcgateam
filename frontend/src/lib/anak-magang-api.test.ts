import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
 anakMagangApi,
 AnakMagangApiError,
 formatTanggalSingkat,
 LABEL_STATUS_ANAK_MAGANG,
} from "./anak-magang-api";

beforeEach(() => {
 localStorage.clear();
 sessionStorage.clear();
});

afterEach(() => {
 vi.restoreAllMocks();
});

describe("anakMagangApi", () => {
 it("ambil() memanggil endpoint /anak-magang dengan header Authorization", async () => {
 localStorage.setItem("hcga_access_token", "token-asli");
 const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => [] });
 global.fetch = fetchMock as unknown as typeof fetch;

 await anakMagangApi.ambil("/list");

 expect(fetchMock).toHaveBeenCalledWith(
 expect.stringContaining("/anak-magang/list"),
 expect.objectContaining({
 headers: expect.objectContaining({ Authorization: "Bearer token-asli" }),
 }),
 );
 });

 it("melempar AnakMagangApiError dengan pesan array digabung koma", async () => {
 global.fetch = vi.fn().mockResolvedValue({
 ok: false,
 status: 422,
 json: async () => ({ message: ["nama wajib diisi", "nrp wajib diisi"] }),
 }) as unknown as typeof fetch;

 await expect(anakMagangApi.ambil("/1")).rejects.toMatchObject({
 name: "AnakMagangApiError",
 message: "nama wajib diisi, nrp wajib diisi",
 status: 422,
 });
 });
});

describe("AnakMagangApiError", () => {
 it("instance-nya bisa dibedakan lewat instanceof Error", () => {
 expect(new AnakMagangApiError("x", 400)).toBeInstanceOf(Error);
 });
});

describe("LABEL_STATUS_ANAK_MAGANG", () => {
 it("mencakup status AKTIF dan NONAKTIF", () => {
 expect(LABEL_STATUS_ANAK_MAGANG).toEqual({ AKTIF: "Aktif", NONAKTIF: "Non Aktif" });
 });
});

describe("formatTanggalSingkat", () => {
 it("mengembalikan '-' untuk nilai kosong", () => {
 expect(formatTanggalSingkat(null)).toBe("-");
 });

 it("memformat dalam UTC (tidak bergantung timezone mesin)", () => {
 expect(formatTanggalSingkat("2026-03-05T23:00:00.000Z")).toBe("05 Mar 2026");
 });
});
