import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ambilRingkasanApproval } from "./approval-summary-api";

const KOSONG = {
 workOrders: 0,
 suratTugasDinas: 0,
 eprom: 0,
 deklarasiPengajuan: 0,
 deklarasiNota: 0,
 deklarasiSaldo: 0,
};

beforeEach(() => {
 localStorage.clear();
 sessionStorage.clear();
});

afterEach(() => {
 vi.restoreAllMocks();
});

describe("ambilRingkasanApproval", () => {
 it("mengembalikan semua nol tanpa memanggil fetch kalau belum login", async () => {
 const fetchMock = vi.fn();
 global.fetch = fetchMock as unknown as typeof fetch;

 expect(await ambilRingkasanApproval()).toEqual(KOSONG);
 expect(fetchMock).not.toHaveBeenCalled();
 });

 it("mengembalikan data asli saat berhasil, dengan header Authorization", async () => {
 localStorage.setItem("hcga_access_token", "token-asli");
 const data = { ...KOSONG, workOrders: 3 };
 const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => data });
 global.fetch = fetchMock as unknown as typeof fetch;

 const hasil = await ambilRingkasanApproval();

 expect(hasil).toEqual(data);
 expect(fetchMock).toHaveBeenCalledWith(
 expect.stringContaining("/approval-summary"),
 expect.objectContaining({ headers: { Authorization: "Bearer token-asli" } }),
 );
 });

 it("gagal diam-diam (kembalikan semua nol) kalau response tidak ok — badge tidak boleh gagalkan dashboard", async () => {
 localStorage.setItem("hcga_access_token", "token-asli");
 global.fetch = vi.fn().mockResolvedValue({ ok: false }) as unknown as typeof fetch;

 expect(await ambilRingkasanApproval()).toEqual(KOSONG);
 });

 it("gagal diam-diam kalau fetch melempar error jaringan", async () => {
 localStorage.setItem("hcga_access_token", "token-asli");
 global.fetch = vi.fn().mockRejectedValue(new Error("network down")) as unknown as typeof fetch;

 expect(await ambilRingkasanApproval()).toEqual(KOSONG);
 });
});
