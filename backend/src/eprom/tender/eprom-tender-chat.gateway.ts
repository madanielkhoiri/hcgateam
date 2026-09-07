// ==================================================
// FILE: backend/src/eprom/tender/eprom-tender-chat.gateway.ts
// FUNGSI: Push pesan chat undangan tender secara real-time ke web
// (staff yang sedang membuka thread vendor tertentu).
// ==================================================

import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';

/** Sama seperti ROLE_SETARA_OWNER di EpromAksesService — chat cuma untuk staff Owner, vendor balas lewat email. */
const ROLE_OWNER_SETARA = ['OWNER', 'ADMIN', 'SUPER_ADMIN', 'SECTION_HEAD'];

@WebSocketGateway({
  namespace: '/eprom-tender-chat',
  cors: { origin: true, credentials: true },
})
export class EpromTenderChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server?: Server;

  constructor(private readonly jwt: JwtService) {}

  /** Tolak koneksi tanpa token JWT Owner yang valid — room chat berisi percakapan vendor-tender. */
  handleConnection(client: Socket) {
    const token = this.ambilToken(client);

    try {
      const payload = token ? this.jwt.verify<{ role?: string }>(token) : null;

      if (!payload || !ROLE_OWNER_SETARA.includes(payload.role ?? '')) {
        client.disconnect(true);
      }
    } catch {
      client.disconnect(true);
    }
  }

  private ambilToken(client: Socket): string | undefined {
    const dariAuth = client.handshake.auth?.token as string | undefined;
    const dariQuery = client.handshake.query?.token;
    return dariAuth || (typeof dariQuery === 'string' ? dariQuery : undefined);
  }

  handleDisconnect() {
    // Socket.io otomatis keluar dari semua room saat disconnect, tidak perlu cleanup manual.
  }

  @SubscribeMessage('join_undangan')
  joinUndangan(@ConnectedSocket() client: Socket, @MessageBody() undanganId: number) {
    void client.join(`undangan:${undanganId}`);
  }

  @SubscribeMessage('leave_undangan')
  leaveUndangan(@ConnectedSocket() client: Socket, @MessageBody() undanganId: number) {
    void client.leave(`undangan:${undanganId}`);
  }

  emitPesanBaru(undanganId: number, pesan: unknown) {
    this.server?.to(`undangan:${undanganId}`).emit('pesan:baru', pesan);
  }
}
