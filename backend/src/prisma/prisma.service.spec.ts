import { PrismaService } from './prisma.service';

describe('PrismaService', () => {
  const urlAsli = process.env.DATABASE_URL;

  afterEach(() => {
    if (urlAsli === undefined) {
      delete process.env.DATABASE_URL;
    } else {
      process.env.DATABASE_URL = urlAsli;
    }
  });

  it('melempar error yang jelas kalau DATABASE_URL tidak ada di environment', () => {
    delete process.env.DATABASE_URL;

    expect(() => new PrismaService()).toThrow(
      'DATABASE_URL tidak ditemukan. Periksa file backend/.env.',
    );
  });

  it('berhasil dibuat kalau DATABASE_URL tersedia', () => {
    process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/db_uji';

    expect(() => new PrismaService()).not.toThrow();
  });
});
