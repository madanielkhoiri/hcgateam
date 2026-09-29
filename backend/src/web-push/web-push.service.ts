import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import webpush from 'web-push';

@Injectable()
export class WebPushService {
  private readonly logger = new Logger(WebPushService.name);
  readonly publicKey = process.env.VAPID_PUBLIC_KEY ?? '';
  private readonly privateKey = process.env.VAPID_PRIVATE_KEY ?? '';

  constructor(private readonly prisma: PrismaService) {
    if (this.publicKey && this.privateKey) {
      webpush.setVapidDetails(process.env.VAPID_SUBJECT ?? 'mailto:admin@oneforall.local', this.publicKey, this.privateKey);
    }
  }

  async subscribe(userId: number, body: { endpoint: string; keys?: { p256dh?: string; auth?: string } }) {
    if (!this.publicKey || !this.privateKey) throw new BadRequestException('Web Push belum dikonfigurasi');
    if (!body.endpoint || !body.keys?.p256dh || !body.keys.auth) throw new BadRequestException('Subscription browser tidak lengkap');
    return this.prisma.webPushSubscription.upsert({ where: { endpoint: body.endpoint }, update: { userId, p256dh: body.keys.p256dh, auth: body.keys.auth }, create: { userId, endpoint: body.endpoint, p256dh: body.keys.p256dh, auth: body.keys.auth } });
  }

  async unsubscribe(userId: number, endpoint: string) {
    await this.prisma.webPushSubscription.deleteMany({ where: { userId, endpoint } });
    return { ok: true };
  }

  async sendToUser(userId: number, payload: { title: string; body: string; url?: string }) {
    if (!this.publicKey || !this.privateKey) return;
    const subscriptions = await this.prisma.webPushSubscription.findMany({ where: { userId } });
    await Promise.all(subscriptions.map(async (item) => {
      try { await webpush.sendNotification({ endpoint: item.endpoint, keys: { p256dh: item.p256dh, auth: item.auth } }, JSON.stringify(payload)); }
      catch (error: any) { if (error?.statusCode === 404 || error?.statusCode === 410) await this.prisma.webPushSubscription.delete({ where: { endpoint: item.endpoint } }); else this.logger.warn(`Gagal mengirim web push: ${error?.message ?? error}`); }
    }));
  }
}
