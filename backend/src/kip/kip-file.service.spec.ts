import { BadRequestException, NotFoundException } from '@nestjs/common';
import { existsSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { KipFileService } from './kip-file.service';

function buatFotoPalsu(ukuranByte: number, namaAsli = 'bukti.jpg'): Express.Multer.File {
  return {
    buffer: Buffer.alloc(ukuranByte, 1),
    size: ukuranByte,
    originalname: namaAsli,
  } as Express.Multer.File;
}

describe('KipFileService', () => {
  let direktoriUji: string;
  let cwdAwal: string;
  let service: KipFileService;

  beforeEach(() => {
    cwdAwal = process.cwd();
    direktoriUji = mkdtempSync(join(tmpdir(), 'kip-file-'));
    mkdirSync(join(direktoriUji, 'uploads'), { recursive: true });
    process.chdir(direktoriUji);
    service = new KipFileService();
  });

  afterEach(() => {
    process.chdir(cwdAwal);
    rmSync(direktoriUji, { recursive: true, force: true });
  });

  it('menolak kalau foto tidak ada buffernya', () => {
    const foto = { buffer: undefined } as unknown as Express.Multer.File;
    expect(() => service.simpanFoto(foto, 1, 3)).toThrow(BadRequestException);
  });

  it('menolak foto lebih dari 10 MB', () => {
    const foto = buatFotoPalsu(11 * 1024 * 1024);
    expect(() => service.simpanFoto(foto, 1, 3)).toThrow(BadRequestException);
  });

  it('menolak ekstensi selain jpg/jpeg/png/webp', () => {
    const foto = buatFotoPalsu(1024, 'bukti.pdf');
    expect(() => service.simpanFoto(foto, 1, 3)).toThrow(BadRequestException);
  });

  it('menyimpan foto valid dan mengembalikan path relatif kip/<kipId>/<bulan>/...', () => {
    const foto = buatFotoPalsu(1024, 'bukti.jpg');

    const path = service.simpanFoto(foto, 5, 3);

    expect(path).toMatch(/^kip\/5\/3\/\d+-[0-9a-f-]+\.jpg$/);
    expect(existsSync(join(direktoriUji, 'uploads', path))).toBe(true);
  });

  it('resolveAbsolut menolak path yang tidak diawali kip/', () => {
    expect(() => service.resolveAbsolut('../lain/rahasia.jpg')).toThrow(BadRequestException);
  });

  it('resolveAbsolut melempar NotFoundException kalau file belum ada', () => {
    expect(() => service.resolveAbsolut('kip/5/3/tidak-ada.jpg')).toThrow(NotFoundException);
  });

  it('resolveAbsolut mengembalikan path absolut untuk file yang benar-benar ada', () => {
    const path = service.simpanFoto(buatFotoPalsu(1024), 5, 3);

    const absolut = service.resolveAbsolut(path);

    expect(existsSync(absolut)).toBe(true);
  });

  it('hapus mengembalikan false untuk path kosong/null', () => {
    expect(service.hapus(null)).toBe(false);
    expect(service.hapus(undefined)).toBe(false);
  });

  it('hapus mengembalikan false kalau path tidak valid/tidak ditemukan (tidak melempar error)', () => {
    expect(service.hapus('kip/5/3/tidak-ada.jpg')).toBe(false);
  });

  it('hapus benar-benar menghapus file yang ada dan mengembalikan true', () => {
    const path = service.simpanFoto(buatFotoPalsu(1024), 5, 3);
    const absolut = service.resolveAbsolut(path);

    expect(service.hapus(path)).toBe(true);
    expect(existsSync(absolut)).toBe(false);
  });
});
