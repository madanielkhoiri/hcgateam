import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
 formatTanggalWaktu,
 LABEL_LEVEL_HELPDESK,
 LABEL_STATUS_HELPDESK,
 nadaLevelHelpdesk,
 nadaStatusHelpdesk,
} from "./helpdesk-api";

describe("formatTanggalWaktu", () => {
 // formatTanggalWaktu tidak mem-pin timeZone secara eksplisit di implementasinya
 // (beda dari mcu-api.formatTanggal yang pin UTC) — supaya hasil format deterministik
 // di mesin manapun (CI, dev lokal beda zona waktu), kita pin proses ke WIB, target
 // audiens asli aplikasi ini.
 const tzAsli = process.env.TZ;

 beforeAll(() => {
 process.env.TZ = "Asia/Jakarta";
 });

 afterAll(() => {
 process.env.TZ = tzAsli;
 });

 it("mengembalikan '-' untuk nilai kosong", () => {
 expect(formatTanggalWaktu(null)).toBe("-");
 expect(formatTanggalWaktu(undefined)).toBe("-");
 });

 it("memformat tanggal+jam WIB dari waktu UTC", () => {
 // 05 Mar 2026 03:15 UTC == 05 Mar 2026 10.15 WIB (UTC+7)
 expect(formatTanggalWaktu("2026-03-05T03:15:00.000Z")).toBe("05 Mar 2026, 10.15");
 });
});

describe("nadaStatusHelpdesk", () => {
 it("memetakan setiap status tiket ke warna badge yang benar", () => {
 expect(nadaStatusHelpdesk("SELESAI")).toBe("sukses");
 expect(nadaStatusHelpdesk("DIPROSES")).toBe("info");
 expect(nadaStatusHelpdesk("TERBUKA")).toBe("peringatan");
 });
});

describe("nadaLevelHelpdesk", () => {
 it("memetakan setiap level prioritas ke warna badge yang benar", () => {
 expect(nadaLevelHelpdesk("TINGGI")).toBe("bahaya");
 expect(nadaLevelHelpdesk("SEDANG")).toBe("peringatan");
 expect(nadaLevelHelpdesk("RENDAH")).toBe("info");
 expect(nadaLevelHelpdesk(null)).toBe("netral");
 });
});

describe("label konstan", () => {
 it("LABEL_STATUS_HELPDESK mencakup ketiga status tiket", () => {
 expect(LABEL_STATUS_HELPDESK).toEqual({
 TERBUKA: "Open",
 DIPROSES: "On Progress",
 SELESAI: "Closed",
 });
 });

 it("LABEL_LEVEL_HELPDESK mencakup ketiga level prioritas", () => {
 expect(LABEL_LEVEL_HELPDESK).toEqual({
 RENDAH: "Low",
 SEDANG: "Medium",
 TINGGI: "High",
 });
 });
});
