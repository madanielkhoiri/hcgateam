import { createTransport } from 'nodemailer';
import { SmtpService } from './smtp.service';

jest.mock('nodemailer', () => ({
  createTransport: jest.fn(),
}));

const HOST_ASLI = process.env.SMTP_HOST;
const PORT_ASLI = process.env.SMTP_PORT;
const USER_ASLI = process.env.SMTP_USER;
const PASS_ASLI = process.env.SMTP_PASS;
const FROM_ASLI = process.env.SMTP_FROM;

function buatServiceDenganKredensial(
  host: string | undefined,
  user: string | undefined,
  pass: string | undefined,
  port?: string,
) {
  if (host === undefined) delete process.env.SMTP_HOST;
  else process.env.SMTP_HOST = host;

  if (user === undefined) delete process.env.SMTP_USER;
  else process.env.SMTP_USER = user;

  if (pass === undefined) delete process.env.SMTP_PASS;
  else process.env.SMTP_PASS = pass;

  if (port === undefined) delete process.env.SMTP_PORT;
  else process.env.SMTP_PORT = port;

  return new SmtpService();
}

afterEach(() => {
  if (HOST_ASLI === undefined) delete process.env.SMTP_HOST;
  else process.env.SMTP_HOST = HOST_ASLI;

  if (PORT_ASLI === undefined) delete process.env.SMTP_PORT;
  else process.env.SMTP_PORT = PORT_ASLI;

  if (USER_ASLI === undefined) delete process.env.SMTP_USER;
  else process.env.SMTP_USER = USER_ASLI;

  if (PASS_ASLI === undefined) delete process.env.SMTP_PASS;
  else process.env.SMTP_PASS = PASS_ASLI;

  if (FROM_ASLI === undefined) delete process.env.SMTP_FROM;
  else process.env.SMTP_FROM = FROM_ASLI;

  jest.clearAllMocks();
});

describe('SmtpService.aktif', () => {
  it('false kalau salah satu kredensial kosong', () => {
    expect(buatServiceDenganKredensial(undefined, 'user@gmail.com', 'pass').aktif).toBe(false);
    expect(buatServiceDenganKredensial('smtp.gmail.com', undefined, 'pass').aktif).toBe(false);
    expect(buatServiceDenganKredensial('smtp.gmail.com', 'user@gmail.com', undefined).aktif).toBe(false);
  });

  it('true kalau host, user, dan pass semua terisi', () => {
    (createTransport as jest.Mock).mockReturnValue({ sendMail: jest.fn() });
    const service = buatServiceDenganKredensial('smtp.gmail.com', 'user@gmail.com', 'pass-app');

    expect(service.aktif).toBe(true);
  });
});

describe('SmtpService.kirim', () => {
  it('tidak mengirim (false) kalau kredensial belum diisi', async () => {
    const service = buatServiceDenganKredensial(undefined, undefined, undefined);

    const hasil = await service.kirim({ to: 'a@contoh.test', subjek: 'Halo', teks: 'Isi' });

    expect(hasil).toBe(false);
    expect(createTransport).not.toHaveBeenCalled();
  });

  it('membuat transporter dengan host/port/auth yang benar lalu kirim', async () => {
    const sendMail = jest.fn().mockResolvedValue({ messageId: '<abc>' });
    (createTransport as jest.Mock).mockReturnValue({ sendMail });
    const service = buatServiceDenganKredensial('smtp.gmail.com', 'user@gmail.com', 'pass-app', '587');

    const hasil = await service.kirim({ to: 'a@contoh.test', subjek: 'Halo', teks: 'Isi pesan' });

    expect(hasil).toBe(true);
    expect(createTransport).toHaveBeenCalledWith(
      expect.objectContaining({
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        auth: { user: 'user@gmail.com', pass: 'pass-app' },
      }),
    );
    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'a@contoh.test', subject: 'Halo', text: 'Isi pesan' }),
    );
  });

  it('secure:true kalau port 465', async () => {
    (createTransport as jest.Mock).mockReturnValue({ sendMail: jest.fn() });
    buatServiceDenganKredensial('smtp.gmail.com', 'user@gmail.com', 'pass-app', '465');

    expect(createTransport).toHaveBeenCalledWith(expect.objectContaining({ port: 465, secure: true }));
  });

  it('menyertakan lampiran kalau diisi', async () => {
    const sendMail = jest.fn().mockResolvedValue({});
    (createTransport as jest.Mock).mockReturnValue({ sendMail });
    const service = buatServiceDenganKredensial('smtp.gmail.com', 'user@gmail.com', 'pass-app');

    await service.kirim({
      to: 'a@contoh.test',
      subjek: 'Halo',
      teks: 'Isi',
      lampiran: [{ namaFile: 'a.pdf', data: Buffer.from('x') }],
    });

    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        attachments: [{ filename: 'a.pdf', content: Buffer.from('x') }],
      }),
    );
  });

  it('false kalau sendMail melempar error', async () => {
    const sendMail = jest.fn().mockRejectedValue(new Error('Network error'));
    (createTransport as jest.Mock).mockReturnValue({ sendMail });
    const service = buatServiceDenganKredensial('smtp.gmail.com', 'user@gmail.com', 'pass-app');

    const hasil = await service.kirim({ to: 'a@contoh.test', subjek: 'Halo', teks: 'Isi' });

    expect(hasil).toBe(false);
  });

  it('pakai SMTP_FROM kalau diisi, fallback ke SMTP_USER kalau tidak', async () => {
    const sendMail = jest.fn().mockResolvedValue({});
    (createTransport as jest.Mock).mockReturnValue({ sendMail });

    process.env.SMTP_FROM = 'Portal ONE FOR ALL <noreply@contoh.test>';
    const service = buatServiceDenganKredensial('smtp.gmail.com', 'user@gmail.com', 'pass-app');
    await service.kirim({ to: 'a@contoh.test', subjek: 'Halo', teks: 'Isi' });

    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({ from: 'Portal ONE FOR ALL <noreply@contoh.test>' }),
    );
  });
});
