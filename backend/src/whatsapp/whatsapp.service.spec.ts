import { WhatsappService } from './whatsapp.service';

const TOKEN_ASLI = process.env.FONNTE_TOKEN;
const TOKEN_HC_ASLI = process.env.FONNTE_TOKEN_HC;

function buatServiceDenganToken(token: string | undefined, tokenHc?: string | undefined) {
  if (token === undefined) {
    delete process.env.FONNTE_TOKEN;
  } else {
    process.env.FONNTE_TOKEN = token;
  }

  if (tokenHc === undefined) {
    delete process.env.FONNTE_TOKEN_HC;
  } else {
    process.env.FONNTE_TOKEN_HC = tokenHc;
  }

  return new WhatsappService();
}

afterEach(() => {
  if (TOKEN_ASLI === undefined) {
    delete process.env.FONNTE_TOKEN;
  } else {
    process.env.FONNTE_TOKEN = TOKEN_ASLI;
  }

  if (TOKEN_HC_ASLI === undefined) {
    delete process.env.FONNTE_TOKEN_HC;
  } else {
    process.env.FONNTE_TOKEN_HC = TOKEN_HC_ASLI;
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

  it('departemen "HC" memakai FONNTE_TOKEN_HC, bukan FONNTE_TOKEN default', async () => {
    const service = buatServiceDenganToken('token-ga', 'token-hc');
    const fetchMock = jest.fn().mockResolvedValue({ ok: true });
    global.fetch = fetchMock as unknown as typeof fetch;

    await service.kirim('08123456789', 'Halo', undefined, 'HC');

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.fonnte.com/send',
      expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'token-hc' }) }),
    );
  });

  it('departemen "HC" fallback ke FONNTE_TOKEN default kalau FONNTE_TOKEN_HC belum diisi', async () => {
    const service = buatServiceDenganToken('token-ga', undefined);
    const fetchMock = jest.fn().mockResolvedValue({ ok: true });
    global.fetch = fetchMock as unknown as typeof fetch;

    await service.kirim('08123456789', 'Halo', undefined, 'HC');

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.fonnte.com/send',
      expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'token-ga' }) }),
    );
  });

  it('tanpa departemen tetap memakai FONNTE_TOKEN default walau FONNTE_TOKEN_HC terisi', async () => {
    const service = buatServiceDenganToken('token-ga', 'token-hc');
    const fetchMock = jest.fn().mockResolvedValue({ ok: true });
    global.fetch = fetchMock as unknown as typeof fetch;

    await service.kirim('08123456789', 'Halo');

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.fonnte.com/send',
      expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'token-ga' }) }),
    );
  });
});

describe('WhatsappService.validasiTerdaftar', () => {
  it('null kalau token belum diisi', async () => {
    const service = buatServiceDenganToken(undefined);
    const fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;

    const hasil = await service.validasiTerdaftar('08123456789');

    expect(hasil).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('null kalau nomor kosong/null', async () => {
    const service = buatServiceDenganToken('token-123');
    const fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;

    expect(await service.validasiTerdaftar(null)).toBeNull();
    expect(await service.validasiTerdaftar('   ')).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('true kalau nomor ada di daftar registered', async () => {
    const service = buatServiceDenganToken('token-123');
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ status: true, registered: ['08123456789'], not_registered: [] }),
    }) as unknown as typeof fetch;

    expect(await service.validasiTerdaftar('08123456789')).toBe(true);
  });

  it('false kalau nomor ada di daftar not_registered', async () => {
    const service = buatServiceDenganToken('token-123');
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ status: true, registered: [], not_registered: ['08123456789'] }),
    }) as unknown as typeof fetch;

    expect(await service.validasiTerdaftar('08123456789')).toBe(false);
  });

  it('null kalau status false (mis. device disconnected)', async () => {
    const service = buatServiceDenganToken('token-123');
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ status: false, reason: 'device disconnected' }),
    }) as unknown as typeof fetch;

    expect(await service.validasiTerdaftar('08123456789')).toBeNull();
  });

  it('null kalau HTTP status bukan 2xx', async () => {
    const service = buatServiceDenganToken('token-123');
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 500 }) as unknown as typeof fetch;

    expect(await service.validasiTerdaftar('08123456789')).toBeNull();
  });

  it('null kalau fetch melempar error', async () => {
    const service = buatServiceDenganToken('token-123');
    global.fetch = jest.fn().mockRejectedValue(new Error('Network error')) as unknown as typeof fetch;

    expect(await service.validasiTerdaftar('08123456789')).toBeNull();
  });

  it('departemen "HC" memakai FONNTE_TOKEN_HC', async () => {
    const service = buatServiceDenganToken('token-ga', 'token-hc');
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ status: true, registered: ['08123456789'], not_registered: [] }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    await service.validasiTerdaftar('08123456789', 'HC');

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.fonnte.com/validate',
      expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'token-hc' }) }),
    );
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
