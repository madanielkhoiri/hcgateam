import { describe, expect, it } from "vitest";
import { isIrPengelola, urlFileIr } from "./ir-api";
import type { PortalUser } from "./access-control";

const buatUser = (role: string): PortalUser => ({
 id: 1,
 name: "Budi",
 username: "budi",
 role,
});

describe("isIrPengelola", () => {
 it("mengizinkan ADMIN, SUPER_ADMIN, dan SECTION_HEAD", () => {
 expect(isIrPengelola(buatUser("ADMIN"))).toBe(true);
 expect(isIrPengelola(buatUser("SUPER_ADMIN"))).toBe(true);
 expect(isIrPengelola(buatUser("SECTION_HEAD"))).toBe(true);
 });

 it("menolak role lain", () => {
 expect(isIrPengelola(buatUser("KARYAWAN"))).toBe(false);
 expect(isIrPengelola(buatUser("FA"))).toBe(false);
 });

 it("menolak kalau user null (belum login)", () => {
 expect(isIrPengelola(null)).toBe(false);
 });
});

describe("urlFileIr", () => {
 it("menyusun URL uploads dari path relatif", () => {
 expect(urlFileIr("dokumen/panduan.pdf")).toContain("/uploads/dokumen/panduan.pdf");
 });
});
