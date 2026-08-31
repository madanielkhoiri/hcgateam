import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { auditLogApi, AuditLogApiError } from "./audit-log-api";

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

describe("auditLogApi.daftar", () => {
 it("tanpa filter tidak menambahkan query string sama sekali", async () => {
 const fetchMock = mockFetchSekali({ ok: true, json: async () => ({ data: [], total: 0, halaman: 1, ukuranHalaman: 20 }) });

 await auditLogApi.daftar({});

 expect(fetchMock.mock.calls[0][0]).toMatch(/\/audit-log\/admin$/);
 });

 it("menyusun query string hanya dari filter yang diisi", async () => {
 const fetchMock = mockFetchSekali({ ok: true, json: async () => ({ data: [], total: 0, halaman: 1, ukuranHalaman: 20 }) });

 await auditLogApi.daftar({ entitas: "Karyawan", halaman: 2 });

 const url = fetchMock.mock.calls[0][0] as string;
 expect(url).toContain("entitas=Karyawan");
 expect(url).toContain("halaman=2");
 expect(url).not.toContain("actorId");
 expect(url).not.toContain("dari=");
 });

 it("menyertakan seluruh filter kalau semuanya diisi", async () => {
 const fetchMock = mockFetchSekali({ ok: true, json: async () => ({ data: [], total: 0, halaman: 1, ukuranHalaman: 20 }) });

 await auditLogApi.daftar({ entitas: "Karyawan", actorId: 7, dari: "2026-01-01", sampai: "2026-01-31", halaman: 3 });

 const url = fetchMock.mock.calls[0][0] as string;
 expect(url).toContain("entitas=Karyawan");
 expect(url).toContain("actorId=7");
 expect(url).toContain("dari=2026-01-01");
 expect(url).toContain("sampai=2026-01-31");
 expect(url).toContain("halaman=3");
 });

 it("melempar AuditLogApiError saat response gagal (mis. bukan admin)", async () => {
 mockFetchSekali({ ok: false, status: 403, json: async () => ({ message: "Hanya admin" }) });

 await expect(auditLogApi.daftar({})).rejects.toMatchObject({
 name: "AuditLogApiError",
 status: 403,
 message: "Hanya admin",
 });
 });
});

describe("auditLogApi.daftarEntitas", () => {
 it("memanggil endpoint daftar entitas", async () => {
 const fetchMock = mockFetchSekali({ ok: true, json: async () => ["Karyawan", "Deklarasi"] });

 const hasil = await auditLogApi.daftarEntitas();

 expect(fetchMock.mock.calls[0][0]).toContain("/audit-log/admin/entitas");
 expect(hasil).toEqual(["Karyawan", "Deklarasi"]);
 });
});

describe("AuditLogApiError", () => {
 it("instance-nya Error dengan status tersimpan", () => {
 const err = new AuditLogApiError("gagal", 500);
 expect(err).toBeInstanceOf(Error);
 expect(err.status).toBe(500);
 });
});
