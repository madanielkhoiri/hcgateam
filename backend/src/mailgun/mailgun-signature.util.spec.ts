import { createHmac } from 'node:crypto';
import { verifikasiSignatureMailgun } from './mailgun-signature.util';

const API_KEY = 'key-rahasia-123';

function buatSignatureAsli(timestamp: string, token: string): string {
  return createHmac('sha256', API_KEY).update(`${timestamp}${token}`).digest('hex');
}

describe('verifikasiSignatureMailgun', () => {
  it('true kalau signature dihitung dengan API key yang benar', () => {
    const timestamp = '1700000000';
    const token = 'token-abc';
    const signature = buatSignatureAsli(timestamp, token);

    expect(verifikasiSignatureMailgun(timestamp, token, signature, API_KEY)).toBe(true);
  });

  it('false kalau signature tidak cocok (dipalsukan)', () => {
    expect(verifikasiSignatureMailgun('1700000000', 'token-abc', 'signature-palsu', API_KEY)).toBe(false);
  });

  it('false kalau API key server berbeda dari yang dipakai menghitung signature', () => {
    const timestamp = '1700000000';
    const token = 'token-abc';
    const signature = buatSignatureAsli(timestamp, token);

    expect(verifikasiSignatureMailgun(timestamp, token, signature, 'key-lain')).toBe(false);
  });

  it('false kalau API key belum dikonfigurasi (undefined)', () => {
    expect(verifikasiSignatureMailgun('1700000000', 'token-abc', 'apapun', undefined)).toBe(false);
  });

  it('false kalau salah satu field webhook kosong', () => {
    expect(verifikasiSignatureMailgun(undefined, 'token-abc', 'sig', API_KEY)).toBe(false);
    expect(verifikasiSignatureMailgun('1700000000', undefined, 'sig', API_KEY)).toBe(false);
    expect(verifikasiSignatureMailgun('1700000000', 'token-abc', undefined, API_KEY)).toBe(false);
  });

  it('false kalau panjang signature berbeda (bukan hex 64 karakter)', () => {
    expect(verifikasiSignatureMailgun('1700000000', 'token-abc', 'pendek', API_KEY)).toBe(false);
  });
});
