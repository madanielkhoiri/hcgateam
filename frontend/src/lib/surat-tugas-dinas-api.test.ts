import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
 formatTanggal,
 formatTanggalWaktu,
 LABEL_STATUS_SURAT_TUGAS,
 nadaStatusSuratTugas,
} from "./surat-tugas-dinas-api";

describe("formatTanggal", () => {
 it("mengembalikan '-' untuk nilai kosong", () => {
 expect(formatTanggal(null)).toBe("-");
 });

 it("memformat tanggal dalam UTC (tidak bergantung timezone mesin)", () => {
 expect(formatTanggal("2026-03-05T23:00:00.000Z")).toBe("05 Mar 2026");
 });
});

describe("formatTanggalWaktu", () => {
 const tzAsli = process.env.TZ;
 beforeAll(() => {
 process.env.TZ = "Asia/Jakarta";
 });
 afterAll(() => {
 process.env.TZ = tzAsli;
 });

 it("mengembalikan '-' untuk nilai kosong", () => {
 expect(formatTanggalWaktu(undefined)).toBe("-");
 });

 it("memformat tanggal+jam mengikuti timezone lokal (WIB)", () => {
 expect(formatTanggalWaktu("2026-03-05T03:15:00.000Z")).toBe("05 Mar 2026, 10.15");
 });
});

describe("nadaStatusSuratTugas", () => {
 it("DISETUJUI -> sukses, DITOLAK -> bahaya, sisanya -> peringatan", () => {
 expect(nadaStatusSuratTugas("DISETUJUI")).toBe("sukses");
 expect(nadaStatusSuratTugas("DITOLAK")).toBe("bahaya");
 expect(nadaStatusSuratTugas("MENUNGGU_SH")).toBe("peringatan");
 expect(nadaStatusSuratTugas("MENUNGGU_PJO")).toBe("peringatan");
 });
});

describe("LABEL_STATUS_SURAT_TUGAS", () => {
 it("mencakup keempat status alur persetujuan", () => {
 expect(LABEL_STATUS_SURAT_TUGAS).toEqual({
 MENUNGGU_SH: "Menunggu Persetujuan SH",
 MENUNGGU_PJO: "Menunggu Persetujuan PJO",
 DISETUJUI: "Disetujui",
 DITOLAK: "Ditolak",
 });
 });
});
