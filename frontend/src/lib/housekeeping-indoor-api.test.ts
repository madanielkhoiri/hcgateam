import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
 housekeepingIndoorApi,
 HousekeepingIndoorApiError,
 LABEL_LOKASI_HOUSEKEEPING_INDOOR,
 LOKASI_HOUSEKEEPING_INDOOR,
 urlFileHousekeepingIndoor,
} from "./housekeeping-indoor-api";

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

describe("LABEL_LOKASI_HOUSEKEEPING_INDOOR", () => {
 it("setiap lokasi di LOKASI_HOUSEKEEPING_INDOOR punya label — cegah lokasi baru lupa dikasih label", () => {
 for (const lokasi of LOKASI_HOUSEKEEPING_INDOOR) {
 expect(LABEL_LOKASI_HOUSEKEEPING_INDOOR[lokasi]).toBeTruthy();
 }
 });

 it("jumlah lokasi & label sama persis (tidak ada label 'siluman' tak terpakai)", () => {
 expect(Object.keys(LABEL_LOKASI_HOUSEKEEPING_INDOOR)).toHaveLength(LOKASI_HOUSEKEEPING_INDOOR.length);
 });
});

describe("housekeepingIndoorApi.daftar", () => {
 it("tanpa filter lokasi tidak menambahkan query string", async () => {
 const fetchMock = mockFetchSekali({ ok: true, json: async () => [] });

 await housekeepingIndoorApi.daftar();

 expect(fetchMock.mock.calls[0][0]).toMatch(/\/housekeeping-indoor$/);
 });

 it("dengan filter lokasi menambahkan query string", async () => {
 const fetchMock = mockFetchSekali({ ok: true, json: async () => [] });

 await housekeepingIndoorApi.daftar("PLANT");

 expect(fetchMock.mock.calls[0][0]).toContain("?lokasi=PLANT");
 });
});

describe("housekeepingIndoorApi.buat", () => {
 it("menyusun FormData dengan lokasi, namaPetugas, dan semua file", async () => {
 const fetchMock = mockFetchSekali({ ok: true, json: async () => ({}) });
 const foto1 = new File(["a"], "a.jpg");
 const foto2 = new File(["b"], "b.jpg");

 await housekeepingIndoorApi.buat({ lokasi: "OFFICE", namaPetugas: "Budi" }, [foto1, foto2]);

 const [, init] = fetchMock.mock.calls[0];
 const form = init.body as FormData;
 expect(form.get("lokasi")).toBe("OFFICE");
 expect(form.get("namaPetugas")).toBe("Budi");
 expect(form.getAll("file")).toEqual([foto1, foto2]);
 });
});

describe("HousekeepingIndoorApiError", () => {
 it("melempar error dengan pesan digabung koma untuk array message", async () => {
 mockFetchSekali({
 ok: false,
 status: 400,
 json: async () => ({ message: ["namaPetugas wajib diisi", "minimal 1 foto"] }),
 });

 await expect(housekeepingIndoorApi.daftar()).rejects.toMatchObject({
 name: "HousekeepingIndoorApiError",
 message: "namaPetugas wajib diisi, minimal 1 foto",
 });
 });

 it("bisa dibuat manual dengan status tersimpan", () => {
 expect(new HousekeepingIndoorApiError("x", 401).status).toBe(401);
 });
});

describe("urlFileHousekeepingIndoor", () => {
 it("menyusun URL uploads dari path relatif", () => {
 expect(urlFileHousekeepingIndoor("hk/foto.jpg")).toContain("/uploads/hk/foto.jpg");
 });
});
