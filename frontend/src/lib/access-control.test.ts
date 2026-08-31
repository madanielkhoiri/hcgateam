import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
 ACCESS_KEYS,
 clearSession,
 formatRole,
 getAccessToken,
 getStoredUser,
 hasAccess,
 refreshStoredUser,
 saveStoredUser,
 type PortalUser,
} from "./access-control";

const buatUser = (overrides: Partial<PortalUser> = {}): PortalUser => ({
 id: 1,
 name: "Budi",
 username: "budi",
 role: "KARYAWAN",
 accessKeys: [],
 isActive: true,
 vendorId: null,
 ...overrides,
});

beforeEach(() => {
 localStorage.clear();
 sessionStorage.clear();
});

describe("getAccessToken", () => {
 it("mengambil dari localStorage kalau ada", () => {
 localStorage.setItem("hcga_access_token", "token-local");
 expect(getAccessToken()).toBe("token-local");
 });

 it("fallback ke sessionStorage kalau localStorage kosong", () => {
 sessionStorage.setItem("hcga_access_token", "token-session");
 expect(getAccessToken()).toBe("token-session");
 });

 it("mengembalikan null kalau tidak ada token sama sekali", () => {
 expect(getAccessToken()).toBeNull();
 });

 it("localStorage diprioritaskan di atas sessionStorage", () => {
 localStorage.setItem("hcga_access_token", "token-local");
 sessionStorage.setItem("hcga_access_token", "token-session");
 expect(getAccessToken()).toBe("token-local");
 });
});

describe("getStoredUser", () => {
 it("mengembalikan null kalau tidak ada data user tersimpan", () => {
 expect(getStoredUser()).toBeNull();
 });

 it("mem-parse data user dari localStorage", () => {
 const user = buatUser({ name: "Ani" });
 localStorage.setItem("hcga_user", JSON.stringify(user));
 expect(getStoredUser()).toEqual(user);
 });

 it("mem-parse data user dari sessionStorage kalau localStorage kosong", () => {
 const user = buatUser({ name: "Cici" });
 sessionStorage.setItem("hcga_user", JSON.stringify(user));
 expect(getStoredUser()).toEqual(user);
 });

 it("mengembalikan null kalau JSON tersimpan rusak (bukan melempar error)", () => {
 localStorage.setItem("hcga_user", "{bukan-json-valid");
 expect(getStoredUser()).toBeNull();
 });
});

describe("saveStoredUser", () => {
 it("menyimpan ke localStorage kalau sesi 'ingat saya' aktif (token ada di localStorage)", () => {
 localStorage.setItem("hcga_access_token", "token-local");
 const user = buatUser();

 saveStoredUser(user);

 expect(localStorage.getItem("hcga_user")).toBe(JSON.stringify(user));
 expect(sessionStorage.getItem("hcga_user")).toBeNull();
 });

 it("menyimpan ke sessionStorage kalau token cuma ada di sessionStorage", () => {
 sessionStorage.setItem("hcga_access_token", "token-session");
 const user = buatUser();

 saveStoredUser(user);

 expect(sessionStorage.getItem("hcga_user")).toBe(JSON.stringify(user));
 expect(localStorage.getItem("hcga_user")).toBeNull();
 });
});

describe("clearSession", () => {
 it("menghapus token & user dari localStorage maupun sessionStorage sekaligus", () => {
 localStorage.setItem("hcga_access_token", "a");
 localStorage.setItem("hcga_user", "b");
 sessionStorage.setItem("hcga_access_token", "c");
 sessionStorage.setItem("hcga_user", "d");

 clearSession();

 expect(localStorage.getItem("hcga_access_token")).toBeNull();
 expect(localStorage.getItem("hcga_user")).toBeNull();
 expect(sessionStorage.getItem("hcga_access_token")).toBeNull();
 expect(sessionStorage.getItem("hcga_user")).toBeNull();
 });
});

describe("hasAccess", () => {
 it("menolak kalau user null (belum login)", () => {
 expect(hasAccess(null, ACCESS_KEYS.HC_MCU)).toBe(false);
 });

 it("ADMIN selalu diizinkan tanpa perlu accessKeys", () => {
 const user = buatUser({ role: "ADMIN", accessKeys: [] });
 expect(hasAccess(user, ACCESS_KEYS.CIVIL_PROJECT)).toBe(true);
 });

 it("SUPER_ADMIN selalu diizinkan", () => {
 const user = buatUser({ role: "SUPER_ADMIN", accessKeys: [] });
 expect(hasAccess(user, ACCESS_KEYS.GA_INVENTORY)).toBe(true);
 });

 it("SECTION_HEAD selalu diizinkan", () => {
 const user = buatUser({ role: "SECTION_HEAD", accessKeys: [] });
 expect(hasAccess(user, ACCESS_KEYS.HC_HELPDESK)).toBe(true);
 });

 it("KARYAWAN biasa ditolak kalau accessKeys tidak mengandung key yang diminta", () => {
 const user = buatUser({ role: "KARYAWAN", accessKeys: [ACCESS_KEYS.HC_MCU] });
 expect(hasAccess(user, ACCESS_KEYS.GA_INVENTORY)).toBe(false);
 });

 it("KARYAWAN diizinkan kalau accessKeys mengandung key yang diminta", () => {
 const user = buatUser({ role: "KARYAWAN", accessKeys: [ACCESS_KEYS.HC_MCU] });
 expect(hasAccess(user, ACCESS_KEYS.HC_MCU)).toBe(true);
 });

 it("accessKeys berisi 'ALL' membuka semua access key", () => {
 const user = buatUser({ role: "KARYAWAN", accessKeys: ["ALL"] });
 expect(hasAccess(user, ACCESS_KEYS.CIVIL_TPS3R)).toBe(true);
 });

 it("accessKeys undefined diperlakukan sebagai array kosong, bukan error", () => {
 const user = buatUser({ role: "KARYAWAN", accessKeys: undefined });
 expect(hasAccess(user, ACCESS_KEYS.HC_MCU)).toBe(false);
 });
});

describe("formatRole", () => {
 it("mengembalikan string kosong kalau role tidak diisi", () => {
 expect(formatRole(undefined)).toBe("");
 expect(formatRole("")).toBe("");
 });

 it("memetakan alias khusus yang tidak ikut aturan title-case umum", () => {
 expect(formatRole("SUPER_ADMIN")).toBe("Admin HC");
 expect(formatRole("SHE")).toBe("SHE (K3)");
 expect(formatRole("KLINIK")).toBe("Klinik Provider");
 expect(formatRole("GRUP_LEADER")).toBe("Group Leader");
 });

 it("role tak dikenal di-title-case otomatis dari snake_case", () => {
 expect(formatRole("KEPALA_GUDANG")).toBe("Kepala Gudang");
 });
});

describe("refreshStoredUser", () => {
 const originalFetch = global.fetch;

 afterEach(() => {
 global.fetch = originalFetch;
 vi.unstubAllEnvs();
 });

 it("mengembalikan null tanpa memanggil fetch kalau tidak ada token tersimpan", async () => {
 const fetchMock = vi.fn();
 global.fetch = fetchMock as unknown as typeof fetch;

 const hasil = await refreshStoredUser();

 expect(hasil).toBeNull();
 expect(fetchMock).not.toHaveBeenCalled();
 });

 it("mengirim Authorization header dan menyimpan user baru saat berhasil", async () => {
 localStorage.setItem("hcga_access_token", "token-asli");
 const userBaru = buatUser({ name: "Updated" });
 const fetchMock = vi.fn().mockResolvedValue({
 ok: true,
 json: async () => userBaru,
 });
 global.fetch = fetchMock as unknown as typeof fetch;

 const hasil = await refreshStoredUser();

 expect(fetchMock).toHaveBeenCalledWith(
 expect.stringContaining("/auth/profile"),
 expect.objectContaining({
 headers: { Authorization: "Bearer token-asli" },
 }),
 );
 expect(hasil).toEqual(userBaru);
 expect(localStorage.getItem("hcga_user")).toBe(JSON.stringify(userBaru));
 });

 it("mengembalikan null kalau response tidak ok (mis. 401)", async () => {
 localStorage.setItem("hcga_access_token", "token-kadaluarsa");
 const fetchMock = vi.fn().mockResolvedValue({ ok: false });
 global.fetch = fetchMock as unknown as typeof fetch;

 const hasil = await refreshStoredUser();

 expect(hasil).toBeNull();
 });

 it("mengembalikan null kalau fetch melempar error jaringan", async () => {
 localStorage.setItem("hcga_access_token", "token-asli");
 const fetchMock = vi.fn().mockRejectedValue(new Error("network down"));
 global.fetch = fetchMock as unknown as typeof fetch;

 const hasil = await refreshStoredUser();

 expect(hasil).toBeNull();
 });
});
