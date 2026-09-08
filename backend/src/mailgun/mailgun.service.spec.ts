import { MailgunService } from './mailgun.service';

const APIKEY_ASLI = process.env.MAILGUN_API_KEY;
const DOMAIN_ASLI = process.env.MAILGUN_DOMAIN;
const FROM_ASLI = process.env.MAILGUN_FROM;
const BASE_ASLI = process.env.MAILGUN_BASE_URL;
const WEBHOOK_KEY_ASLI = process.env.MAILGUN_WEBHOOK_SIGNING_KEY;

function buatServiceDenganKredensial(apiKey: string | undefined, domain: string | undefined) {
  if (apiKey === undefined) delete process.env.MAILGUN_API_KEY;
  else process.env.MAILGUN_API_KEY = apiKey;

  if (domain === undefined) delete process.env.MAILGUN_DOMAIN;
  else process.env.MAILGUN_DOMAIN = domain;

  return new MailgunService();
}

afterEach(() => {
  if (APIKEY_ASLI === undefined) delete process.env.MAILGUN_API_KEY;
  else process.env.MAILGUN_API_KEY = APIKEY_ASLI;

  if (DOMAIN_ASLI === undefined) delete process.env.MAILGUN_DOMAIN;
  else process.env.MAILGUN_DOMAIN = DOMAIN_ASLI;

  if (FROM_ASLI === undefined) delete process.env.MAILGUN_FROM;
  else process.env.MAILGUN_FROM = FROM_ASLI;

  if (BASE_ASLI === undefined) delete process.env.MAILGUN_BASE_URL;
  else process.env.MAILGUN_BASE_URL = BASE_ASLI;

  if (WEBHOOK_KEY_ASLI === undefined) delete process.env.MAILGUN_WEBHOOK_SIGNING_KEY;
  else process.env.MAILGUN_WEBHOOK_SIGNING_KEY = WEBHOOK_KEY_ASLI;

  jest.restoreAllMocks();
});

describe('MailgunService.aktif', () => {
  it('true kalau API key & domain terisi', () => {
    const service = buatServiceDenganKredensial('key-123', 'mail.contoh.test');
    expect(service.aktif).toBe(true);
  });

  it('false kalau salah satu kosong', () => {
    expect(buatServiceDenganKredensial(undefined, 'mail.contoh.test').aktif).toBe(false);
    expect(buatServiceDenganKredensial('key-123', undefined).aktif).toBe(false);
  });
});

describe('MailgunService.domainAktif & kunciWebhook', () => {
  it('mengembalikan domain apa adanya', () => {
    const service = buatServiceDenganKredensial('key-123', 'mail.contoh.test');
    expect(service.domainAktif).toBe('mail.contoh.test');
  });

  it('kunciWebhook mengambil dari MAILGUN_WEBHOOK_SIGNING_KEY, BUKAN dari MAILGUN_API_KEY', () => {
    process.env.MAILGUN_WEBHOOK_SIGNING_KEY = 'signing-key-berbeda';
    const service = buatServiceDenganKredensial('key-123', 'mail.contoh.test');

    expect(service.kunciWebhook).toBe('signing-key-berbeda');
    expect(service.kunciWebhook).not.toBe('key-123');
  });

  it('kunciWebhook undefined kalau MAILGUN_WEBHOOK_SIGNING_KEY belum diisi', () => {
    delete process.env.MAILGUN_WEBHOOK_SIGNING_KEY;
    const service = buatServiceDenganKredensial('key-123', 'mail.contoh.test');

    expect(service.kunciWebhook).toBeUndefined();
  });
});

describe('MailgunService.kirim', () => {
  it('tidak mengirim (berhasil:false) kalau kredensial belum diisi', async () => {
    const service = buatServiceDenganKredensial(undefined, undefined);
    const fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;

    const hasil = await service.kirim({ to: 'vendor@contoh.test', subjek: 'Halo', teks: 'Isi' });

    expect(hasil).toEqual({ berhasil: false });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('mengirim ke endpoint Mailgun dengan Basic Auth dan body yang benar', async () => {
    const service = buatServiceDenganKredensial('key-123', 'mail.contoh.test');
    const fetchMock = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ id: '<abc@mailgun>' }) });
    global.fetch = fetchMock as unknown as typeof fetch;

    const hasil = await service.kirim({ to: 'vendor@contoh.test', subjek: 'Undangan', teks: 'Isi pesan' });

    expect(hasil).toEqual({ berhasil: true, messageId: '<abc@mailgun>' });
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.mailgun.net/v3/mail.contoh.test/messages',
      expect.objectContaining({
        method: 'POST',
        headers: { Authorization: `Basic ${Buffer.from('api:key-123').toString('base64')}` },
      }),
    );

    const body = fetchMock.mock.calls[0][1].body as FormData;
    expect(body.get('to')).toBe('vendor@contoh.test');
    expect(body.get('subject')).toBe('Undangan');
    expect(body.get('text')).toBe('Isi pesan');
  });

  it('menyertakan header Reply-To/In-Reply-To/References kalau diisi', async () => {
    const service = buatServiceDenganKredensial('key-123', 'mail.contoh.test');
    const fetchMock = jest.fn().mockResolvedValue({ ok: true, json: async () => ({}) });
    global.fetch = fetchMock as unknown as typeof fetch;

    await service.kirim({
      to: 'vendor@contoh.test',
      subjek: 'Balasan',
      teks: 'Isi',
      replyTo: 'tender-1@mail.contoh.test',
      inReplyTo: '<lama@mailgun>',
      references: '<lama@mailgun>',
    });

    const body = fetchMock.mock.calls[0][1].body as FormData;
    expect(body.get('h:Reply-To')).toBe('tender-1@mail.contoh.test');
    expect(body.get('h:In-Reply-To')).toBe('<lama@mailgun>');
    expect(body.get('h:References')).toBe('<lama@mailgun>');
  });

  it('tidak menyertakan header opsional sama sekali kalau tidak diisi', async () => {
    const service = buatServiceDenganKredensial('key-123', 'mail.contoh.test');
    const fetchMock = jest.fn().mockResolvedValue({ ok: true, json: async () => ({}) });
    global.fetch = fetchMock as unknown as typeof fetch;

    await service.kirim({ to: 'vendor@contoh.test', subjek: 'Halo', teks: 'Isi' });

    const body = fetchMock.mock.calls[0][1].body as FormData;
    expect(body.has('h:Reply-To')).toBe(false);
    expect(body.has('h:In-Reply-To')).toBe(false);
  });

  it('menyertakan attachment sesuai jumlah lampiran', async () => {
    const service = buatServiceDenganKredensial('key-123', 'mail.contoh.test');
    const fetchMock = jest.fn().mockResolvedValue({ ok: true, json: async () => ({}) });
    global.fetch = fetchMock as unknown as typeof fetch;

    await service.kirim({
      to: 'vendor@contoh.test',
      subjek: 'Halo',
      teks: 'Isi',
      lampiran: [
        { namaFile: 'a.pdf', data: Buffer.from('a') },
        { namaFile: 'b.pdf', data: Buffer.from('b') },
      ],
    });

    const body = fetchMock.mock.calls[0][1].body as FormData;
    expect(body.getAll('attachment')).toHaveLength(2);
  });

  it('berhasil:false kalau Mailgun membalas status bukan 2xx', async () => {
    const service = buatServiceDenganKredensial('key-123', 'mail.contoh.test');
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 401 }) as unknown as typeof fetch;

    const hasil = await service.kirim({ to: 'vendor@contoh.test', subjek: 'Halo', teks: 'Isi' });

    expect(hasil).toEqual({ berhasil: false });
  });

  it('berhasil:false kalau fetch melempar error (network gagal)', async () => {
    const service = buatServiceDenganKredensial('key-123', 'mail.contoh.test');
    global.fetch = jest.fn().mockRejectedValue(new Error('Network error')) as unknown as typeof fetch;

    const hasil = await service.kirim({ to: 'vendor@contoh.test', subjek: 'Halo', teks: 'Isi' });

    expect(hasil).toEqual({ berhasil: false });
  });

  it('pakai MAILGUN_BASE_URL kalau di-set (mis. region EU)', async () => {
    process.env.MAILGUN_BASE_URL = 'https://api.eu.mailgun.net';
    const service = buatServiceDenganKredensial('key-123', 'mail.contoh.test');
    const fetchMock = jest.fn().mockResolvedValue({ ok: true, json: async () => ({}) });
    global.fetch = fetchMock as unknown as typeof fetch;

    await service.kirim({ to: 'vendor@contoh.test', subjek: 'Halo', teks: 'Isi' });

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.eu.mailgun.net/v3/mail.contoh.test/messages',
      expect.anything(),
    );
  });
});
