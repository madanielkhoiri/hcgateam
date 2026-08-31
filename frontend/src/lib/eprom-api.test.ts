import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import {
 formatBulanLabel,
 formatBulanSingkat,
 formatRupiah,
 formatTanggal,
 formatWaktuRelatif,
 formatWaktuWITA,
 isEpromOwner,
 isEpromVendor,
} from "./eprom-api";
import type { PortalUser } from "./access-control";

const buatUser = (role: string): PortalUser => ({
 id: 1,
 name: "Budi",
 username: "budi",
 role,
});

describe("formatTanggal", () => {
 const tzAsli = process.env.TZ;
 beforeAll(() => {
 process.env.TZ = "Asia/Jakarta";
 });
 afterAll(() => {
 process.env.TZ = tzAsli;
 });

 it("mengembalikan '-' untuk nilai kosong", () => {
 expect(formatTanggal(null)).toBe("-");
 });

 it("memformat tanggal ke format Indonesia singkat", () => {
 expect(formatTanggal("2026-03-05T03:15:00.000Z")).toBe("05 Mar 2026");
 });
});

describe("formatBulanLabel", () => {
 it("mengembalikan '-' untuk nilai kosong", () => {
 expect(formatBulanLabel(null)).toBe("-");
 expect(formatBulanLabel(undefined)).toBe("-");
 });

 it("mengubah 'YYYY-MM' jadi 'NamaBulan YYYY'", () => {
 expect(formatBulanLabel("2026-08")).toBe("Agustus 2026");
 expect(formatBulanLabel("2026-01")).toBe("Januari 2026");
 });

 it("fallback ke nilai asli kalau format tidak valid", () => {
 expect(formatBulanLabel("2026-13")).toBe("2026-13");
 expect(formatBulanLabel("bukan-bulan")).toBe("bukan-bulan");
 });
});

describe("formatBulanSingkat", () => {
 it("mengubah 'YYYY-MM' jadi singkatan 3 huruf + 2 digit tahun", () => {
 expect(formatBulanSingkat("2026-08")).toBe("Agu 26");
 expect(formatBulanSingkat("2026-12")).toBe("Des 26");
 });

 it("mengembalikan '-' untuk nilai kosong", () => {
 expect(formatBulanSingkat(null)).toBe("-");
 });

 it("fallback ke nilai asli kalau format tidak valid", () => {
 expect(formatBulanSingkat("ngaco")).toBe("ngaco");
 });
});

describe("formatWaktuWITA", () => {
 it("mengembalikan '-' untuk nilai kosong", () => {
 expect(formatWaktuWITA(null)).toBe("-");
 });

 it("mengonversi UTC ke WITA (UTC+8) tanpa bergantung timezone mesin", () => {
 // 05 Mar 2026 16:30 UTC == 06 Mar 2026 00.30 WITA
 expect(formatWaktuWITA("2026-03-05T16:30:00.000Z")).toBe("06 Mar 2026, 00:30 WITA");
 });
});

describe("formatWaktuRelatif", () => {
 afterEach(() => {
 vi.useRealTimers();
 });

 it("mengembalikan '-' untuk nilai kosong", () => {
 expect(formatWaktuRelatif(null)).toBe("-");
 });

 it("'Baru saja' untuk selisih di bawah 1 menit", () => {
 vi.useFakeTimers();
 vi.setSystemTime(new Date("2026-03-05T10:00:30.000Z"));
 expect(formatWaktuRelatif("2026-03-05T10:00:00.000Z")).toBe("Baru saja");
 });

 it("'X menit lalu' untuk selisih di bawah 1 jam", () => {
 vi.useFakeTimers();
 vi.setSystemTime(new Date("2026-03-05T10:15:00.000Z"));
 expect(formatWaktuRelatif("2026-03-05T10:00:00.000Z")).toBe("15 menit lalu");
 });

 it("'X jam lalu' untuk selisih di bawah 1 hari", () => {
 vi.useFakeTimers();
 vi.setSystemTime(new Date("2026-03-05T15:00:00.000Z"));
 expect(formatWaktuRelatif("2026-03-05T10:00:00.000Z")).toBe("5 jam lalu");
 });

 it("'X hari lalu' untuk selisih di atas 1 hari", () => {
 vi.useFakeTimers();
 vi.setSystemTime(new Date("2026-03-10T10:00:00.000Z"));
 expect(formatWaktuRelatif("2026-03-05T10:00:00.000Z")).toBe("5 hari lalu");
 });
});

describe("formatRupiah", () => {
 it("mengembalikan '-' untuk nilai null/undefined", () => {
 expect(formatRupiah(null)).toBe("-");
 expect(formatRupiah(undefined)).toBe("-");
 });

 it("memformat angka jadi mata uang Rupiah tanpa desimal", () => {
 // Intl pakai non-breaking space ( ) antara "Rp" dan angka.
 expect(formatRupiah(1500000)).toBe("Rp 1.500.000");
 });

 it("menerima input string angka", () => {
 expect(formatRupiah("2500000")).toBe("Rp 2.500.000");
 });

 it("angka nol tetap diformat, bukan dianggap kosong", () => {
 expect(formatRupiah(0)).toBe("Rp 0");
 });
});

describe("isEpromOwner", () => {
 it("mengizinkan OWNER, ADMIN, SUPER_ADMIN, dan SECTION_HEAD", () => {
 expect(isEpromOwner(buatUser("OWNER"))).toBe(true);
 expect(isEpromOwner(buatUser("ADMIN"))).toBe(true);
 expect(isEpromOwner(buatUser("SUPER_ADMIN"))).toBe(true);
 expect(isEpromOwner(buatUser("SECTION_HEAD"))).toBe(true);
 });

 it("menolak VENDOR dan role lain", () => {
 expect(isEpromOwner(buatUser("VENDOR"))).toBe(false);
 expect(isEpromOwner(null)).toBe(false);
 });
});

describe("isEpromVendor", () => {
 it("hanya mengizinkan role VENDOR", () => {
 expect(isEpromVendor(buatUser("VENDOR"))).toBe(true);
 expect(isEpromVendor(buatUser("OWNER"))).toBe(false);
 expect(isEpromVendor(null)).toBe(false);
 });
});
