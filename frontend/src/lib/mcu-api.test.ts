import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
 McuApiError,
 formatTanggal,
 formatWaktu,
 labelStatus,
 mcuApi,
 nadaStatus,
 nilaiInputTanggal,
 unduhBerkas,
} from "./mcu-api";

beforeEach(() => {
 localStorage.clear();
 sessionStorage.clear();
});

afterEach(() => {
 vi.restoreAllMocks();
});

function mockFetchSekali(response: Partial<Response> & { json?: () => Promise<unknown> }) {
 const fetchMock = vi.fn().mockResolvedValue(response as Response);
 global.fetch = fetchMock as unknown as typeof fetch;
 return fetchMock;
}

describe("mcuApi.ambil (GET)", () => {
 it("memanggil endpoint /mcu dengan prefix yang benar dan header Authorization", async () => {
 localStorage.setItem("hcga_access_token", "token-asli");
 const fetchMock = mockFetchSekali({ ok: true, status: 200, json: async () => ({ ok: true }) });

 const hasil = await mcuApi.ambil<{ ok: boolean }>("/karyawan");

 expect(fetchMock).toHaveBeenCalledWith(
 expect.stringContaining("/mcu/karyawan"),
 expect.objectContaining({
 headers: expect.objectContaining({
 Authorization: "Bearer token-asli",
 "Content-Type": "application/json",
 }),
 }),
 );
 expect(hasil).toEqual({ ok: true });
 });

 it("tidak mengirim header Authorization kalau tidak ada token tersimpan", async () => {
 const fetchMock = mockFetchSekali({ ok: true, status: 200, json: async () => ({}) });

 await mcuApi.ambil("/karyawan");

 const [, init] = fetchMock.mock.calls[0];
 expect(init.headers.Authorization).toBeUndefined();
 });

 it("mengembalikan undefined untuk response 204 tanpa mencoba parse body", async () => {
 mockFetchSekali({ ok: true, status: 204 });

 const hasil = await mcuApi.ambil("/apa-saja");

 expect(hasil).toBeUndefined();
 });

 it("melempar McuApiError berisi status & pesan dari body saat response gagal", async () => {
 mockFetchSekali({
 ok: false,
 status: 404,
 json: async () => ({ message: "Karyawan tidak ditemukan" }),
 });

 await expect(mcuApi.ambil("/karyawan/999")).rejects.toMatchObject({
 name: "McuApiError",
 status: 404,
 message: "Karyawan tidak ditemukan",
 });
 });

 it("menggabungkan pesan error array (class-validator) jadi satu string dipisah koma", async () => {
 mockFetchSekali({
 ok: false,
 status: 400,
 json: async () => ({ message: ["nik wajib diisi", "nama wajib diisi"] }),
 });

 await expect(mcuApi.ambil("/karyawan")).rejects.toMatchObject({
 message: "nik wajib diisi, nama wajib diisi",
 });
 });

 it("fallback ke pesan generik kalau body error bukan JSON valid", async () => {
 mockFetchSekali({
 ok: false,
 status: 500,
 json: async () => {
 throw new Error("bukan json");
 },
 });

 await expect(mcuApi.ambil("/karyawan")).rejects.toMatchObject({
 message: "Permintaan gagal (500)",
 status: 500,
 });
 });
});

describe("mcuApi.kirim / ubah / hapus", () => {
 it("kirim() memakai method POST dan menyertakan body ter-JSON-stringify", async () => {
 const fetchMock = mockFetchSekali({ ok: true, status: 200, json: async () => ({ id: 1 }) });

 await mcuApi.kirim("/karyawan", { nik: "123" });

 const [, init] = fetchMock.mock.calls[0];
 expect(init.method).toBe("POST");
 expect(init.body).toBe(JSON.stringify({ nik: "123" }));
 });

 it("kirim() tanpa body tidak menyertakan properti body sama sekali", async () => {
 const fetchMock = mockFetchSekali({ ok: true, status: 200, json: async () => ({}) });

 await mcuApi.kirim("/aksi-tanpa-payload");

 const [, init] = fetchMock.mock.calls[0];
 expect(init.body).toBeUndefined();
 });

 it("ubah() memakai method PATCH", async () => {
 const fetchMock = mockFetchSekali({ ok: true, status: 200, json: async () => ({}) });

 await mcuApi.ubah("/karyawan/1", { nama: "Baru" });

 expect(fetchMock.mock.calls[0][1].method).toBe("PATCH");
 });

 it("hapus() memakai method DELETE", async () => {
 const fetchMock = mockFetchSekali({ ok: true, status: 204 });

 await mcuApi.hapus("/karyawan/1");

 expect(fetchMock.mock.calls[0][1].method).toBe("DELETE");
 });
});

describe("mcuApi.unggah", () => {
 it("mengirim file sebagai FormData tanpa header Content-Type manual", async () => {
 const fetchMock = mockFetchSekali({ ok: true, status: 200, json: async () => ({}) });
 const file = new File(["isi"], "hasil.pdf", { type: "application/pdf" });

 await mcuApi.unggah("/hasil", file);

 const [, init] = fetchMock.mock.calls[0];
 expect(init.body).toBeInstanceOf(FormData);
 expect(init.body.get("file")).toBe(file);
 expect(init.headers["Content-Type"]).toBeUndefined();
 });
});

describe("unduhBerkas", () => {
 it("melempar McuApiError kalau gagal, tanpa sempat memicu unduhan", async () => {
 mockFetchSekali({ ok: false, status: 403, json: async () => ({ message: "Dilarang" }) });

 await expect(unduhBerkas("/hasil/1", "hasil.pdf")).rejects.toMatchObject({
 status: 403,
 });
 });
});

describe("format tampilan MCU", () => {
 it("formatTanggal menampilkan '-' untuk nilai kosong", () => {
 expect(formatTanggal(null)).toBe("-");
 expect(formatTanggal(undefined)).toBe("-");
 });

 it("formatTanggal memformat tanggal ISO ke format Indonesia", () => {
 expect(formatTanggal("2026-03-05T00:00:00.000Z")).toBe("05 Mar 2026");
 });

 it("formatWaktu menampilkan '-' untuk nilai kosong", () => {
 expect(formatWaktu(null)).toBe("-");
 });

 it("nilaiInputTanggal mengubah ISO ke format yyyy-mm-dd untuk <input type=date>", () => {
 expect(nilaiInputTanggal("2026-03-05T08:30:00.000Z")).toBe("2026-03-05");
 });

 it("nilaiInputTanggal mengembalikan string kosong untuk nilai kosong", () => {
 expect(nilaiInputTanggal(null)).toBe("");
 });

 it("labelStatus menerjemahkan kode status ke label Indonesia", () => {
 expect(labelStatus("FOLLOW_UP")).toBe("Follow Up");
 expect(labelStatus("TERLAMBAT_RESCHEDULE")).toBe("Terlambat - Jadwal Ulang");
 });

 it("labelStatus fallback ke nilai asli kalau kode tidak dikenal", () => {
 expect(labelStatus("KODE_BARU_BELUM_DIPETAKAN")).toBe("KODE_BARU_BELUM_DIPETAKAN");
 });

 it("labelStatus mengembalikan '-' untuk nilai kosong", () => {
 expect(labelStatus(null)).toBe("-");
 });

 it("nadaStatus memetakan status ke warna badge yang benar", () => {
 expect(nadaStatus("FIT")).toBe("sukses");
 expect(nadaStatus("FOLLOW_UP")).toBe("bahaya");
 expect(nadaStatus("MENUNGGU")).toBe("peringatan");
 expect(nadaStatus("DIREVIEW")).toBe("info");
 expect(nadaStatus("STATUS_TAK_DIKENAL")).toBe("netral");
 });
});

describe("McuApiError", () => {
 it("menyimpan status dan message, serta name yang benar untuk instanceof/catch checks", () => {
 const err = new McuApiError("Pesan error", 422);
 expect(err.status).toBe(422);
 expect(err.message).toBe("Pesan error");
 expect(err.name).toBe("McuApiError");
 expect(err).toBeInstanceOf(Error);
 });
});
