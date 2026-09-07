// ==================================================
// FILE: backend/src/eprom/tender/eprom-tender-chat.util.ts
// FUNGSI: Helper bersama chat undangan tender — dipakai baik saat
// kirim undangan pertama (EpromTenderService) maupun balasan chat
// berikutnya (EpromTenderChatService), supaya format alamat inbound
// konsisten di kedua tempat.
// ==================================================

/** Alamat inbound unik per undangan — balasan vendor ke alamat ini otomatis kembali ke thread yang benar. */
export function alamatInboundUndangan(undanganId: number, domain: string | undefined): string | undefined {
  return domain ? `tender-${undanganId}@${domain}` : undefined;
}

/** Alamat penerima Mailgun formatnya "tender-{undanganId}@domain" — pasangan dari alamatInboundUndangan(). */
export function ekstrakUndanganIdDariRecipient(recipient: string | undefined): number | null {
  const match = /^tender-(\d+)@/i.exec(recipient?.trim() ?? '');
  const id = match ? Number(match[1]) : NaN;
  return Number.isInteger(id) && id > 0 ? id : null;
}
