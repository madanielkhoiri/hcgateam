// ==================================================
// FILE: backend/src/mailgun/mailgun-signature.util.ts
// FUNGSI: Verifikasi webhook Mailgun sungguhan berasal dari Mailgun
// (bukan dipalsukan pihak lain) — dipakai controller webhook inbound
// yang publik/tanpa JwtAuthGuard.
// Referensi: https://documentation.mailgun.com/en/latest/user_manual.html#webhooks
// ==================================================

import { createHmac, timingSafeEqual } from 'node:crypto';

export function verifikasiSignatureMailgun(
  timestamp: string | undefined,
  token: string | undefined,
  signature: string | undefined,
  apiKey: string | undefined,
): boolean {
  if (!apiKey || !timestamp || !token || !signature) {
    return false;
  }

  const hmac = createHmac('sha256', apiKey)
    .update(`${timestamp}${token}`)
    .digest('hex');

  const bufferHmac = Buffer.from(hmac, 'utf8');
  const bufferSignature = Buffer.from(signature, 'utf8');

  if (bufferHmac.length !== bufferSignature.length) {
    return false;
  }

  return timingSafeEqual(bufferHmac, bufferSignature);
}
