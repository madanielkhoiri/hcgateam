import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { transportApi, TransportApiError, urlFileTransport } from "./transport-api";

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

describe("transportApi.tiket.karyawanRingkas", () => {
 it("tanpa search tidak menambahkan query string", async () => {
 const fetchMock = mockFetchSekali({ ok: true, json: async () => [] });

 await transportApi.tiket.karyawanRingkas();

 expect(fetchMock.mock.calls[0][0]).toMatch(/\/tiket\/admin\/karyawan$/);
 });

 it("meng-encode search jadi query string yang aman untuk karakter spesial", async () => {
 const fetchMock = mockFetchSekali({ ok: true, json: async () => [] });

 await transportApi.tiket.karyawanRingkas("Budi & Ani");

 expect(fetchMock.mock.calls[0][0]).toContain(`search=${encodeURIComponent("Budi & Ani")}`);
 });
});

describe("transportApi.tiket.kirim", () => {
 it("menyusun FormData; keterangan hanya disertakan kalau diisi", async () => {
 const fetchMock = mockFetchSekali({ ok: true, json: async () => ({}) });
 const file = new File(["a"], "tiket.pdf");

 await transportApi.tiket.kirim(
 {
 karyawanId: 1,
 jenisTiket: "PULANG_PERGI",
 tanggalMulai: "2026-03-01",
 jamMulai: "08:00",
 tanggalSelesai: "2026-03-05",
 jamSelesai: "17:00",
 },
 [file],
 );

 const [, init] = fetchMock.mock.calls[0];
 const form = init.body as FormData;
 expect(form.get("karyawanId")).toBe("1");
 expect(form.get("jenisTiket")).toBe("PULANG_PERGI");
 expect(form.has("keterangan")).toBe(false);
 expect(form.getAll("file")).toEqual([file]);
 });

 it("menyertakan keterangan kalau diisi", async () => {
 const fetchMock = mockFetchSekali({ ok: true, json: async () => ({}) });

 await transportApi.tiket.kirim(
 {
 karyawanId: 1,
 jenisTiket: "PULANG_PERGI",
 tanggalMulai: "2026-03-01",
 jamMulai: "08:00",
 tanggalSelesai: "2026-03-05",
 jamSelesai: "17:00",
 keterangan: "Dinas Jakarta",
 },
 [],
 );

 const [, init] = fetchMock.mock.calls[0];
 expect((init.body as FormData).get("keterangan")).toBe("Dinas Jakarta");
 });

 it("BERANGKAT_SAJA tidak menyertakan field tanggal/jam kepulangan", async () => {
 const fetchMock = mockFetchSekali({ ok: true, json: async () => ({}) });

 await transportApi.tiket.kirim(
 { karyawanId: 1, jenisTiket: "BERANGKAT_SAJA", tanggalMulai: "2026-03-01", jamMulai: "08:00" },
 [],
 );

 const [, init] = fetchMock.mock.calls[0];
 const form = init.body as FormData;
 expect(form.has("tanggalSelesai")).toBe(false);
 expect(form.has("jamSelesai")).toBe(false);
 });
});

describe("transportApi.travel.ubahJadwal", () => {
 it("memakai method PATCH ke endpoint jadwal admin yang benar", async () => {
 const fetchMock = mockFetchSekali({ ok: true, json: async () => ({}) });

 await transportApi.travel.ubahJadwal(9, { status: "DIBATALKAN" });

 const [url, init] = fetchMock.mock.calls[0];
 expect(url).toContain("/travel/admin/jadwal/9");
 expect(init.method).toBe("PATCH");
 expect(init.body).toBe(JSON.stringify({ status: "DIBATALKAN" }));
 });
});

describe("bacaError (lewat request gagal)", () => {
 it("pesan error array digabung koma", async () => {
 mockFetchSekali({
 ok: false,
 status: 400,
 json: async () => ({ message: ["armada wajib diisi", "driverId wajib diisi"] }),
 });

 await expect(transportApi.travel.daftarJadwalAdmin()).rejects.toMatchObject({
 message: "armada wajib diisi, driverId wajib diisi",
 });
 });
});

describe("TransportApiError", () => {
 it("instance-nya Error dengan status tersimpan", () => {
 expect(new TransportApiError("x", 409).status).toBe(409);
 });
});

describe("urlFileTransport", () => {
 it("menyusun URL uploads dari path relatif", () => {
 expect(urlFileTransport("tiket/1.pdf")).toContain("/uploads/tiket/1.pdf");
 });
});
