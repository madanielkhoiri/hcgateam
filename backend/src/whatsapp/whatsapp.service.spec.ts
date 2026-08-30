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
});
