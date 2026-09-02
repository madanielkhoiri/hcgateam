import { WhatsappService } from './whatsapp.service';

const TOKEN_ASLI = process.env.FONNTE_TOKEN;

function buatServiceDenganToken(token: string | undefined) {
  if (token === undefined) {
    delete process.env.FONNTE_TOKEN;
  } else {
    process.env.FONNTE_TOKEN = token;
  }

  return new WhatsappService();
}

afterEach(() => {
  if (TOKEN_ASLI === undefined) {
    delete process.env.FONNTE_TOKEN;
  } else {
    process.env.FONNTE_TOKEN = TOKEN_ASLI;
  }

  jest.restoreAllMocks();
});

describe('WhatsappService.aktif', () => {
  it('true kalau FONNTE_TOKEN terisi', () => {
    const service = buatServiceDenganToken('token-123');

    expect(service.aktif).toBe(true);
  });

  it('false kalau FONNTE_TOKEN kosong', () => {
    const service = buatServiceDenganToken(undefined);

    expect(service.aktif).toBe(false);
  });
});

describe('WhatsappService.kirim', () => {
  it('tidak mengirim (return false) kalau token belum diisi', async () => {
    const service = buatServiceDenganToken(undefined);
    const fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;

    const hasil = await service.kirim('08123456789', 'Halo');

    expect(hasil).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('tidak mengirim (return false) kalau nomor tujuan kosong/null', async () => {
    const service = buatServiceDenganToken('token-123');
    const fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;

    const hasil = await service.kirim(null, 'Halo');

    expect(hasil).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('mengirim ke endpoint Fonnte dengan header dan body yang benar', async () => {
    const service = buatServiceDenganToken('token-123');
    const fetchMock = jest.fn().mockResolvedValue({ ok: true });
    global.fetch = fetchMock as unknown as typeof fetch;

    const hasil = await service.kirim('08123456789', 'Halo dunia');

    expect(hasil).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.fonnte.com/send',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'token-123',
          'Content-Type': 'application/x-www-form-urlencoded',
        }),
      }),
    );

    const body = fetchMock.mock.calls[0][1].body as URLSearchParams;
    expect(body.get('target')).toBe('08123456789');
    expect(body.get('message')).toBe('Halo dunia');
  });

  it('return false kalau Fonnte membalas status bukan 2xx', async () => {
    const service = buatServiceDenganToken('token-123');
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 500 }) as unknown as typeof fetch;

    const hasil = await service.kirim('08123456789', 'Halo');

    expect(hasil).toBe(false);
  });

  it('return false kalau fetch melempar error (network gagal)', async () => {
    const service = buatServiceDenganToken('token-123');
    global.fetch = jest.fn().mockRejectedValue(new Error('Network error')) as unknown as typeof fetch;

    const hasil = await service.kirim('08123456789', 'Halo');

    expect(hasil).toBe(false);
  });

  it('menyertakan parameter url & filename kalau ada lampiran', async () => {
    const service = buatServiceDenganToken('token-123');
    const fetchMock = jest.fn().mockResolvedValue({ ok: true });
    global.fetch = fetchMock as unknown as typeof fetch;

    await service.kirim('08123456789', 'Jadwal berubah', {
      url: 'https://portal.contoh.test/api/uploads/tiket/karyawan-1/x.pdf',
      namaFile: 'e-tiket-baru.pdf',
    });

    const body = fetchMock.mock.calls[0][1].body as URLSearchParams;
    expect(body.get('url')).toBe('https://portal.contoh.test/api/uploads/tiket/karyawan-1/x.pdf');
    expect(body.get('filename')).toBe('e-tiket-baru.pdf');
  });

  it('tidak menyertakan parameter url sama sekali kalau tanpa lampiran', async () => {
    const service = buatServiceDenganToken('token-123');
    const fetchMock = jest.fn().mockResolvedValue({ ok: true });
    global.fetch = fetchMock as unknown as typeof fetch;

    await service.kirim('08123456789', 'Halo tanpa lampiran');

    const body = fetchMock.mock.calls[0][1].body as URLSearchParams;
    expect(body.has('url')).toBe(false);
  });
});

describe('WhatsappService.urlPublikLampiran', () => {
  const BASE_ASLI = process.env.BACKEND_PUBLIC_URL;

  afterEach(() => {
    if (BASE_ASLI === undefined) {
      delete process.env.BACKEND_PUBLIC_URL;
    } else {
      process.env.BACKEND_PUBLIC_URL = BASE_ASLI;
    }
  });

  it('null kalau BACKEND_PUBLIC_URL belum di-set — pemanggil wajib fallback ke teks biasa', () => {
    delete process.env.BACKEND_PUBLIC_URL;
    const service = buatServiceDenganToken('token-123');

    expect(service.urlPublikLampiran('tiket/karyawan-1/x.pdf')).toBeNull();
  });

  it('menggabungkan base URL + /uploads/ + path relatif dengan benar', () => {
    process.env.BACKEND_PUBLIC_URL = 'https://portal.contoh.test/api';
    const service = buatServiceDenganToken('token-123');

    expect(service.urlPublikLampiran('tiket/karyawan-1/x.pdf')).toBe(
      'https://portal.contoh.test/api/uploads/tiket/karyawan-1/x.pdf',
    );
  });

  it('trailing slash di BACKEND_PUBLIC_URL dan leading slash di path tidak menghasilkan // dobel', () => {
    process.env.BACKEND_PUBLIC_URL = 'https://portal.contoh.test/api/';
    const service = buatServiceDenganToken('token-123');

    expect(service.urlPublikLampiran('/tiket/karyawan-1/x.pdf')).toBe(
      'https://portal.contoh.test/api/uploads/tiket/karyawan-1/x.pdf',
    );
  });
});
