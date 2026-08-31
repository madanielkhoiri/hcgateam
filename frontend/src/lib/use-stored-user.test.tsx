import { beforeEach, describe, expect, it } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useStoredUser } from "./use-stored-user";
import type { PortalUser } from "./access-control";

const user: PortalUser = {
 id: 1,
 name: "Budi",
 username: "budi",
 role: "KARYAWAN",
 accessKeys: [],
 isActive: true,
 vendorId: null,
};

beforeEach(() => {
 localStorage.clear();
 sessionStorage.clear();
});

// Catatan: perilaku "null di render pertama sebelum mount" (yang mencegah
// hydration mismatch) tidak bisa diuji lewat renderHook() di sini karena
// useEffect sudah keburu di-flush duluan sebelum assertion sempat baca
// result.current — beda dengan jeda SSR->hydrate yang asli di browser.
// Perilaku itu sudah diverifikasi lewat suite Playwright E2E (mode produksi).
describe("useStoredUser", () => {
 it("terisi data user asli setelah efek mount berjalan", async () => {
 localStorage.setItem("hcga_user", JSON.stringify(user));

 const { result } = renderHook(() => useStoredUser());

 await waitFor(() => {
 expect(result.current).toEqual(user);
 });
 });

 it("tetap null kalau tidak ada user tersimpan", async () => {
 const { result } = renderHook(() => useStoredUser());

 await waitFor(() => {
 expect(result.current).toBeNull();
 });
 });
});
