import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { karyawanApi, KaryawanApiError } from "./karyawan-api";

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

describe("karyawanApi", () => {
 it("ambil() memakai prefix /database-karyawan dan header Authorization", async () => {
 localStorage.setItem("hcga_access_token", "token-asli");
 const fetchMock = mockFetchSekali({ ok: true, json: async () => [] });

 await karyawanApi.ambil("/list");

 expect(fetchMock).toHaveBeenCalledWith(
 expect.stringContaining("/database-karyawan/list"),
 expect.objectContaining({
 headers: expect.objectContaining({ Authorization: "Bearer token-asli" }),
 }),
 );
 });

 it("kirim() dengan body memakai method POST dan body ter-JSON-stringify", async () => {
 const fetchMock = mockFetchSekali({ ok: true, json: async () => ({}) });

 await karyawanApi.kirim("/", { nik: "123", nama: "Budi" });

 const [, init] = fetchMock.mock.calls[0];
 expect(init.method).toBe("POST");
 expect(init.body).toBe(JSON.stringify({ nik: "123", nama: "Budi" }));
 });

 it("hapus() memakai method DELETE dan mengembalikan undefined untuk 204", async () => {
 const fetchMock = mockFetchSekali({ ok: true, status: 204 });

 const hasil = await karyawanApi.hapus("/1");

 expect(fetchMock.mock.calls[0][1].method).toBe("DELETE");
 expect(hasil).toBeUndefined();
 });

 it("melempar KaryawanApiError saat response gagal", async () => {
 mockFetchSekali({ ok: false, status: 404, json: async () => ({ message: "Karyawan tidak ditemukan" }) });

 await expect(karyawanApi.ambil("/999")).rejects.toMatchObject({
 name: "KaryawanApiError",
 status: 404,
 });
 });
});

describe("KaryawanApiError", () => {
 it("instance-nya Error", () => {
 expect(new KaryawanApiError("x", 500)).toBeInstanceOf(Error);
 });
});
