import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
 ambilLokasiGps,
 kipApi,
 KipApiError,
 LABEL_LOKASI_KIP,
 LOKASI_KIP,
 urlFotoKip,
} from "./kip-api";
import { LABEL_LOKASI_HOUSEKEEPING_INDOOR, LOKASI_HOUSEKEEPING_INDOOR } from "./housekeeping-indoor-api";

beforeEach(() => {
 localStorage.clear();
 sessionStorage.clear();
});

afterEach(() => {
 vi.restoreAllMocks();
 vi.unstubAllGlobals();
});

function mockFetchSekali(response: Partial<Response> & { json?: () => Promise<unknown>; text?: () => Promise<string> }) {
 const fetchMock = vi.fn().mockResolvedValue(response as Response);
 global.fetch = fetchMock as unknown as typeof fetch;
 return fetchMock;
}

describe("re-export dari housekeeping-indoor-api (KIP pakai 6 lokasi yang sama)", () => {
 it("LOKASI_KIP & LABEL_LOKASI_KIP identik dengan sumber aslinya", () => {
 expect(LOKASI_KIP).toBe(LOKASI_HOUSEKEEPING_INDOOR);
 expect(LABEL_LOKASI_KIP).toBe(LABEL_LOKASI_HOUSEKEEPING_INDOOR);
 });
});

describe("ambilLokasiGps", () => {
 it("reject dengan pesan Indonesia kalau browser tidak mendukung geolocation", async () => {
 vi.stubGlobal("navigator", {});

 await expect(ambilLokasiGps()).rejects.toThrow("Perangkat tidak mendukung akses lokasi GPS");
 });

 it("resolve dengan latitude/longitude saat browser mengizinkan", async () => {
 const getCurrentPosition = vi.fn((sukses) =>
 sukses({ coords: { latitude: -6.2, longitude: 106.8 } }),
 );
 vi.stubGlobal("navigator", { geolocation: { getCurrentPosition } });

 await expect(ambilLokasiGps()).resolves.toEqual({ latitude: -6.2, longitude: 106.8 });
 });

 it("reject dengan pesan Indonesia kalau user menolak izin lokasi", async () => {
 const getCurrentPosition = vi.fn((_sukses, gagal) => gagal(new Error("PERMISSION_DENIED")));
 vi.stubGlobal("navigator", { geolocation: { getCurrentPosition } });

 await expect(ambilLokasiGps()).rejects.toThrow(/izin lokasi/);
 });
});

describe("kipApi.daftarKip", () => {
 it("tanpa filter tidak menambahkan query string", async () => {
 const fetchMock = mockFetchSekali({ ok: true, json: async () => [] });

 await kipApi.daftarKip();

 expect(fetchMock.mock.calls[0][0]).toMatch(/\/kip\/admin\/kip$/);
 });

 it("menyusun query string dari filter lokasi & tahun", async () => {
 const fetchMock = mockFetchSekali({ ok: true, json: async () => [] });

 await kipApi.daftarKip({ lokasi: "PLANT", tahun: 2026 });

 const url = fetchMock.mock.calls[0][0] as string;
 expect(url).toContain("lokasi=PLANT");
 expect(url).toContain("tahun=2026");
 });
});

describe("kipApi.statusByKode (endpoint publik)", () => {
 it("TIDAK menyertakan header Authorization meski ada token tersimpan", async () => {
 localStorage.setItem("hcga_access_token", "token-asli");
 const fetchMock = mockFetchSekali({
 ok: true,
 json: async () => ({ lokasi: "OFFICE", kip: [], gps: null }),
 });

 await kipApi.statusByKode("ABC123");

 const [, init] = fetchMock.mock.calls[0];
 expect(init.headers.Authorization).toBeUndefined();
 });
});

describe("kipApi.qrSvg", () => {
 it("mengembalikan teks mentah (bukan JSON) untuk SVG barcode", async () => {
 mockFetchSekali({ ok: true, text: async () => "<svg>...</svg>" });

 const hasil = await kipApi.qrSvg("OFFICE", "https://contoh.test/kip-scan/ABC");

 expect(hasil).toBe("<svg>...</svg>");
 });

 it("melempar KipApiError kalau gagal", async () => {
 mockFetchSekali({ ok: false, status: 500, json: async () => ({ message: "Gagal generate QR" }) });

 await expect(kipApi.qrSvg("OFFICE", "https://contoh.test")).rejects.toBeInstanceOf(KipApiError);
 });
});

describe("urlFotoKip", () => {
 it("menyusun URL uploads dari path relatif", () => {
 expect(urlFotoKip("kip/bukti.jpg")).toContain("/uploads/kip/bukti.jpg");
 });
});
