import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { tps3rApi, Tps3rApiError } from "./tps3r-api";

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

describe("tps3rApi.daftar", () => {
 it("tanpa filter tidak menambahkan query string", async () => {
 const fetchMock = mockFetchSekali({ ok: true, json: async () => [] });

 await tps3rApi.daftar();

 expect(fetchMock.mock.calls[0][0]).toMatch(/\/civil-tps3r$/);
 });

 it("dengan bulan & tahun menyusun query string keduanya", async () => {
 const fetchMock = mockFetchSekali({ ok: true, json: async () => [] });

 await tps3rApi.daftar(3, 2026);

 const url = fetchMock.mock.calls[0][0] as string;
 expect(url).toContain("bulan=3");
 expect(url).toContain("tahun=2026");
 });
});

describe("tps3rApi.ringkasan", () => {
 it("path-nya /ringkasan dengan query opsional", async () => {
 const fetchMock = mockFetchSekali({ ok: true, json: async () => ({}) });

 await tps3rApi.ringkasan(undefined, 2026);

 const url = fetchMock.mock.calls[0][0] as string;
 expect(url).toContain("/ringkasan");
 expect(url).toContain("tahun=2026");
 expect(url).not.toContain("bulan=");
 });
});

describe("tps3rApi.tren", () => {
 it("selalu menyertakan tahun (parameter wajib)", async () => {
 const fetchMock = mockFetchSekali({ ok: true, json: async () => [] });

 await tps3rApi.tren(2026);

 expect(fetchMock.mock.calls[0][0]).toContain("/tren?tahun=2026");
 });
});

describe("tps3rApi.buat", () => {
 it("mengirim body ter-JSON-stringify lewat POST", async () => {
 const fetchMock = mockFetchSekali({ ok: true, json: async () => ({}) });
 const data = {
 tanggal: "2026-03-05",
 beratOrganik: 10,
 beratNonOrganik: 5,
 beratReuse: 2,
 beratRecycle: 3,
 beratResidu: 1,
 };

 await tps3rApi.buat(data);

 const [, init] = fetchMock.mock.calls[0];
 expect(init.method).toBe("POST");
 expect(init.body).toBe(JSON.stringify(data));
 });
});

describe("bacaError (lewat request gagal)", () => {
 it("mengambil elemen pertama dari pesan error array", async () => {
 mockFetchSekali({
 ok: false,
 status: 400,
 json: async () => ({ message: ["beratOrganik harus angka positif", "tanggal wajib diisi"] }),
 });

 await expect(tps3rApi.daftar()).rejects.toMatchObject({
 message: "beratOrganik harus angka positif",
 });
 });
});

describe("Tps3rApiError", () => {
 it("menyimpan status", () => {
 expect(new Tps3rApiError("x", 400).status).toBe(400);
 });
});
