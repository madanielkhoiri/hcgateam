import { describe, expect, it } from "vitest";
import { bolehKelolaPostingan, urlMediaPostingan } from "./postingan-api";
import type { PortalUser } from "./access-control";

const buatUser = (role: string): PortalUser => ({
 id: 1,
 name: "Budi",
 username: "budi",
 role,
});

describe("bolehKelolaPostingan", () => {
 it("mengizinkan ADMIN, SUPER_ADMIN, ADMIN_COMBEN, dan SECTION_HEAD", () => {
 expect(bolehKelolaPostingan(buatUser("ADMIN"))).toBe(true);
 expect(bolehKelolaPostingan(buatUser("SUPER_ADMIN"))).toBe(true);
 expect(bolehKelolaPostingan(buatUser("ADMIN_COMBEN"))).toBe(true);
 expect(bolehKelolaPostingan(buatUser("SECTION_HEAD"))).toBe(true);
 });

 it("menolak role lain", () => {
 expect(bolehKelolaPostingan(buatUser("KARYAWAN"))).toBe(false);
 });

 it("menolak kalau user null", () => {
 expect(bolehKelolaPostingan(null)).toBe(false);
 });
});

describe("urlMediaPostingan", () => {
 it("menyusun URL uploads dari path relatif", () => {
 expect(urlMediaPostingan("poster/banner.jpg")).toContain("/uploads/poster/banner.jpg");
 });
});
