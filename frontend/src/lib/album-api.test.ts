import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { albumApi, AlbumApiError, urlFotoAlbum } from "./album-api";

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

describe("albumApi.daftar", () => {
 it("memanggil endpoint /album dengan header Authorization", async () => {
 localStorage.setItem("hcga_access_token", "token-asli");
 const fetchMock = mockFetchSekali({ ok: true, status: 200, json: async () => [] });

 await albumApi.daftar();

 expect(fetchMock).toHaveBeenCalledWith(
 expect.stringMatching(/\/album$/),
 expect.objectContaining({
 headers: expect.objectContaining({ Authorization: "Bearer token-asli" }),
 }),
 );
 });
});

describe("albumApi.tambahFoto", () => {
 it("mengirim semua file ke field 'files' yang sama dalam satu FormData", async () => {
 const fetchMock = mockFetchSekali({ ok: true, status: 200, json: async () => ({}) });
 const fileA = new File(["a"], "a.jpg");
 const fileB = new File(["b"], "b.jpg");

 await albumApi.tambahFoto(5, [fileA, fileB]);

 const [, init] = fetchMock.mock.calls[0];
 const semuaFile = (init.body as FormData).getAll("files");
 expect(semuaFile).toEqual([fileA, fileB]);
 });
});

describe("bacaError (lewat request gagal)", () => {
 it("mengambil elemen PERTAMA saja dari pesan error array, bukan digabung", async () => {
 mockFetchSekali({
 ok: false,
 status: 400,
 json: async () => ({ message: ["judul wajib diisi", "deskripsi terlalu panjang"] }),
 });

 await expect(albumApi.daftar()).rejects.toMatchObject({
 message: "judul wajib diisi",
 status: 400,
 });
 });

 it("fallback ke pesan generik kalau body bukan JSON valid", async () => {
 mockFetchSekali({
 ok: false,
 status: 500,
 json: async () => {
 throw new Error("bukan json");
 },
 });

 await expect(albumApi.daftar()).rejects.toMatchObject({
 message: "Permintaan gagal (500)",
 });
 });
});

describe("AlbumApiError", () => {
 it("menyimpan status di properti .status", () => {
 const err = new AlbumApiError("pesan", 403);
 expect(err.status).toBe(403);
 expect(err).toBeInstanceOf(Error);
 });
});

describe("urlFotoAlbum", () => {
 it("menyusun URL uploads dari path relatif", () => {
 expect(urlFotoAlbum("album/1/foto.jpg")).toContain("/uploads/album/1/foto.jpg");
 });
});
