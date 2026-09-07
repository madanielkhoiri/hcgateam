import { JwtService } from '@nestjs/jwt';
import { EpromTenderChatGateway } from './eprom-tender-chat.gateway';

function buatClient(token?: string) {
  return {
    handshake: { auth: { token }, query: {} },
    disconnect: jest.fn(),
    join: jest.fn(),
    leave: jest.fn(),
  } as any;
}

describe('EpromTenderChatGateway.handleConnection', () => {
  it('memutus koneksi kalau tidak ada token', () => {
    const jwt = { verify: jest.fn() } as unknown as JwtService;
    const gateway = new EpromTenderChatGateway(jwt);
    const client = buatClient(undefined);

    gateway.handleConnection(client);

    expect(client.disconnect).toHaveBeenCalledWith(true);
  });

  it('memutus koneksi kalau token tidak valid', () => {
    const jwt = {
      verify: jest.fn(() => {
        throw new Error('invalid');
      }),
    } as unknown as JwtService;
    const gateway = new EpromTenderChatGateway(jwt);
    const client = buatClient('token-salah');

    gateway.handleConnection(client);

    expect(client.disconnect).toHaveBeenCalledWith(true);
  });

  it('memutus koneksi kalau role bukan setara Owner (mis. VENDOR)', () => {
    const jwt = { verify: jest.fn().mockReturnValue({ role: 'VENDOR' }) } as unknown as JwtService;
    const gateway = new EpromTenderChatGateway(jwt);
    const client = buatClient('token-vendor');

    gateway.handleConnection(client);

    expect(client.disconnect).toHaveBeenCalledWith(true);
  });

  it('membiarkan koneksi kalau role setara Owner', () => {
    const jwt = { verify: jest.fn().mockReturnValue({ role: 'ADMIN' }) } as unknown as JwtService;
    const gateway = new EpromTenderChatGateway(jwt);
    const client = buatClient('token-admin');

    gateway.handleConnection(client);

    expect(client.disconnect).not.toHaveBeenCalled();
  });
});

describe('EpromTenderChatGateway.emitPesanBaru', () => {
  it('emit ke room undangan:{id} lewat server', () => {
    const jwt = { verify: jest.fn() } as unknown as JwtService;
    const gateway = new EpromTenderChatGateway(jwt);
    const emit = jest.fn();
    gateway.server = { to: jest.fn(() => ({ emit })) } as any;

    gateway.emitPesanBaru(5, { id: 1 });

    expect(gateway.server!.to).toHaveBeenCalledWith('undangan:5');
    expect(emit).toHaveBeenCalledWith('pesan:baru', { id: 1 });
  });
});
