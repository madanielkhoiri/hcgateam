import { ForbiddenException } from '@nestjs/common';
import { createHmac } from 'node:crypto';
import { MailgunService } from '../../mailgun/mailgun.service';
import { EpromTenderChatService } from './eprom-tender-chat.service';
import { EpromTenderMailgunWebhookController } from './eprom-tender-mailgun-webhook.controller';

const API_KEY = 'key-rahasia-123';

function buatSignatureAsli(timestamp: string, token: string): string {
  return createHmac('sha256', API_KEY).update(`${timestamp}${token}`).digest('hex');
}

function buatController() {
  const terimaPesanMasuk = jest.fn().mockResolvedValue({ id: 1 });
  const chatService = { terimaPesanMasuk } as unknown as EpromTenderChatService;
  const mailgun = { kunciWebhook: API_KEY } as unknown as MailgunService;
  const controller = new EpromTenderMailgunWebhookController(chatService, mailgun);

  return { controller, terimaPesanMasuk };
}

describe('EpromTenderMailgunWebhookController.inbound', () => {
  it('menolak (ForbiddenException) kalau signature tidak valid', async () => {
    const { controller, terimaPesanMasuk } = buatController();
    const body = { timestamp: '1700000000', token: 'token-abc', signature: 'palsu' };

    await expect(controller.inbound(body, [])).rejects.toThrow(ForbiddenException);
    expect(terimaPesanMasuk).not.toHaveBeenCalled();
  });

  it('meneruskan ke EpromTenderChatService.terimaPesanMasuk kalau signature valid', async () => {
    const { controller, terimaPesanMasuk } = buatController();
    const timestamp = '1700000000';
    const token = 'token-abc';
    const body = {
      timestamp,
      token,
      signature: buatSignatureAsli(timestamp, token),
      recipient: 'tender-1@mail.contoh.test',
      'body-plain': 'Halo',
    };

    const hasil = await controller.inbound(body, []);

    expect(terimaPesanMasuk).toHaveBeenCalledWith(body, []);
    expect(hasil).toEqual({ message: 'ok' });
  });
});
