import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { driveApi, DriveApiError, urlFileDrive } from "./drive-api";

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

describe("driveApi.isiFolder", () => {
 it("hanya menyertakan scope kalau parentFolderId tidak diisi", async () => {
 const fetchMock = mockFetchSekali({ ok: true, json: async () => ({ folders: [], files: [] }) });

 await driveApi.isiFolder("CSR");

 const url = fetchMock.mock.calls[0][0] as string;
 expect(url).toContain("scope=CSR");
 expect(url).not.toContain("parentFolderId");
 });

 it("menyertakan parentFolderId kalau diisi", async () => {
 const fetchMock = mockFetchSekali({ ok: true, json: async () => ({ folders: [], files: [] }) });

 await driveApi.isiFolder("FORM_DOWNLOAD", 5);

 const url = fetchMock.mock.calls[0][0] as string;
 expect(url).toContain("scope=FORM_DOWNLOAD");
 expect(url).toContain("parentFolderId=5");
 });
});

describe("driveApi.unggahFile", () => {
 it("mengirim file lewat FormData ke folder yang benar", async () => {
 const fetchMock = mockFetchSekali({ ok: true, json: async () => ({}) });
 const file = new File(["isi"], "panduan.pdf");

 await driveApi.unggahFile(3, file);

 const [url, init] = fetchMock.mock.calls[0];
 expect(url).toContain("/drive/folder/3/file");
 expect((init.body as FormData).get("file")).toBe(file);
 });
});

describe("bacaError (lewat request gagal)", () => {
 it("mengambil elemen pertama dari pesan error array", async () => {
 mockFetchSekali({
 ok: false,
 status: 400,
 json: async () => ({ message: ["namaFolder wajib diisi", "scope tidak valid"] }),
 });

 await expect(driveApi.isiFolder("CSR")).rejects.toMatchObject({
 message: "namaFolder wajib diisi",
 });
 });
});

describe("DriveApiError", () => {
 it("menyimpan status", () => {
 expect(new DriveApiError("x", 404).status).toBe(404);
 });
});

describe("urlFileDrive", () => {
 it("menyusun URL uploads dari path relatif", () => {
 expect(urlFileDrive("csr/panduan.pdf")).toContain("/uploads/csr/panduan.pdf");
 });
});
