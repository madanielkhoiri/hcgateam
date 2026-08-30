import { tentukanTrackerThrottle } from './hcga-throttler.guard';

describe('tentukanTrackerThrottle', () => {
  it('melacak berdasarkan IP saja untuk endpoint selain login', () => {
    const tracker = tentukanTrackerThrottle({
      ip: '10.0.0.5',
      originalUrl: '/api/kip/admin/kip',
      body: {},
    });

    expect(tracker).toBe('10.0.0.5');
  });

  it('melacak berdasarkan IP + username (bukan IP saja) khusus di endpoint login', () => {
    const tracker = tentukanTrackerThrottle({
      ip: '10.0.0.5',
      originalUrl: '/api/auth/login',
      body: { username: 'Budi' },
    });

    expect(tracker).toBe('10.0.0.5:login:budi');
  });

  it('dua username berbeda di IP yang sama menghasilkan tracker berbeda (tidak saling mengunci)', () => {
    const trackerA = tentukanTrackerThrottle({
      ip: '10.0.0.5',
      originalUrl: '/api/auth/login',
      body: { username: 'budi' },
    });
    const trackerB = tentukanTrackerThrottle({
      ip: '10.0.0.5',
      originalUrl: '/api/auth/login',
      body: { username: 'siti' },
    });

    expect(trackerA).not.toBe(trackerB);
  });

  it('username yang sama tapi beda kapitalisasi dianggap tracker yang sama', () => {
    const trackerLower = tentukanTrackerThrottle({
      ip: '10.0.0.5',
      originalUrl: '/api/auth/login',
      body: { username: 'budi' },
    });
    const trackerUpper = tentukanTrackerThrottle({
      ip: '10.0.0.5',
      originalUrl: '/api/auth/login',
      body: { username: 'BUDI' },
    });

    expect(trackerLower).toBe(trackerUpper);
  });

  it('jatuh balik ke IP saja kalau body login tidak berisi username', () => {
    const tracker = tentukanTrackerThrottle({
      ip: '10.0.0.5',
      originalUrl: '/api/auth/login',
      body: {},
    });

    expect(tracker).toBe('10.0.0.5');
  });

  it('memakai req.ips[0] kalau ada (di belakang reverse proxy dengan trust proxy aktif)', () => {
    const tracker = tentukanTrackerThrottle({
      ip: '127.0.0.1', // IP proxy Nginx
      ips: ['203.0.113.9'], // IP asli pengunjung dari X-Forwarded-For
      originalUrl: '/api/kip/admin/kip',
      body: {},
    });

    expect(tracker).toBe('203.0.113.9');
  });
});
