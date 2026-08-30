import { of, throwError } from 'rxjs';
import { CallHandler, ExecutionContext } from '@nestjs/common';
import { AuditLogService } from './audit-log.service';
import { AuditInterceptor } from './audit.interceptor';

function buatContext(req: Record<string, any>): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => req }),
  } as unknown as ExecutionContext;
}

function buatHandler(hasil: unknown, error?: Error): CallHandler {
  return {
    handle: () => (error ? throwError(() => error) : of(hasil)),
  };
}

function tunggu() {
  return new Promise((resolve) => setImmediate(resolve));
}

describe('AuditInterceptor', () => {
  it('mencatat aksi DIBUAT untuk POST ke rute yang tidak dikecualikan', async () => {
    const auditLog = { catat: jest.fn().mockResolvedValue(undefined) } as unknown as AuditLogService;
    const interceptor = new AuditInterceptor(auditLog);
    const req = {
      method: 'POST',
      originalUrl: '/api/work-orders',
      ip: '10.0.0.5',
      user: { id: 7, username: 'budi', nama: 'Budi' },
    };

    await new Promise<void>((resolve) => {
      interceptor.intercept(buatContext(req), buatHandler({ id: 1 })).subscribe({
        complete: resolve,
      });
    });
    await tunggu();

    expect(auditLog.catat).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId: 7,
        aksi: 'WORK-ORDERS_DIBUAT',
        entitas: 'work-orders',
        alamatIp: '10.0.0.5',
      }),
    );
  });

  it('mengambil entitasId dari segmen angka di URL (mis. PATCH /mcu/hasil/42)', async () => {
    const auditLog = { catat: jest.fn().mockResolvedValue(undefined) } as unknown as AuditLogService;
    const interceptor = new AuditInterceptor(auditLog);
    const req = {
      method: 'PATCH',
      originalUrl: '/api/mcu/hasil/42',
      ip: '10.0.0.5',
      user: { id: 7 },
    };

    await new Promise<void>((resolve) => {
      interceptor.intercept(buatContext(req), buatHandler({})).subscribe({ complete: resolve });
    });
    await tunggu();

    expect(auditLog.catat).toHaveBeenCalledWith(
      expect.objectContaining({ entitas: 'mcu/hasil', entitasId: 42, aksi: 'MCU/HASIL_DIUBAH' }),
    );
  });

  it('melewati segmen HURUF-BESAR (scope/enum, bukan nama resource) saat menentukan entitas', async () => {
    const auditLog = { catat: jest.fn().mockResolvedValue(undefined) } as unknown as AuditLogService;
    const interceptor = new AuditInterceptor(auditLog);
    const req = {
      method: 'POST',
      originalUrl: '/api/inventory-area/GENERAL/stock-outs/batch',
      ip: '10.0.0.5',
      user: { id: 7 },
    };

    await new Promise<void>((resolve) => {
      interceptor.intercept(buatContext(req), buatHandler({})).subscribe({ complete: resolve });
    });
    await tunggu();

    expect(auditLog.catat).toHaveBeenCalledWith(
      expect.objectContaining({ entitas: 'inventory-area/stock-outs', aksi: 'INVENTORY-AREA/STOCK-OUTS_DIBUAT' }),
    );
  });

  it('TIDAK mencatat apa pun untuk rute yang sudah diaudit manual (auth/users/kip)', async () => {
    const auditLog = { catat: jest.fn().mockResolvedValue(undefined) } as unknown as AuditLogService;
    const interceptor = new AuditInterceptor(auditLog);
    const req = { method: 'POST', originalUrl: '/api/auth/login', ip: '10.0.0.5' };

    await new Promise<void>((resolve) => {
      interceptor.intercept(buatContext(req), buatHandler({})).subscribe({ complete: resolve });
    });
    await tunggu();

    expect(auditLog.catat).not.toHaveBeenCalled();
  });

  it('TIDAK mencatat apa pun untuk method GET', async () => {
    const auditLog = { catat: jest.fn().mockResolvedValue(undefined) } as unknown as AuditLogService;
    const interceptor = new AuditInterceptor(auditLog);
    const req = { method: 'GET', originalUrl: '/api/work-orders', ip: '10.0.0.5' };

    await new Promise<void>((resolve) => {
      interceptor.intercept(buatContext(req), buatHandler([])).subscribe({ complete: resolve });
    });
    await tunggu();

    expect(auditLog.catat).not.toHaveBeenCalled();
  });

  it('mencatat percobaan yang GAGAL (error) dengan akhiran _GAGAL', async () => {
    const auditLog = { catat: jest.fn().mockResolvedValue(undefined) } as unknown as AuditLogService;
    const interceptor = new AuditInterceptor(auditLog);
    const req = { method: 'DELETE', originalUrl: '/api/work-orders/9', ip: '10.0.0.5', user: { id: 3 } };

    await new Promise<void>((resolve) => {
      interceptor.intercept(buatContext(req), buatHandler(null, new Error('Ditolak'))).subscribe({
        error: () => resolve(),
      });
    });
    await tunggu();

    expect(auditLog.catat).toHaveBeenCalledWith(
      expect.objectContaining({
        aksi: 'WORK-ORDERS_DIHAPUS_GAGAL',
        entitas: 'work-orders',
        entitasId: 9,
        detail: expect.objectContaining({ error: 'Ditolak' }),
      }),
    );
  });

  it('actorId null kalau request tidak terautentikasi (mis. endpoint publik)', async () => {
    const auditLog = { catat: jest.fn().mockResolvedValue(undefined) } as unknown as AuditLogService;
    const interceptor = new AuditInterceptor(auditLog);
    const req = { method: 'POST', originalUrl: '/api/postingan', ip: '10.0.0.5' };

    await new Promise<void>((resolve) => {
      interceptor.intercept(buatContext(req), buatHandler({})).subscribe({ complete: resolve });
    });
    await tunggu();

    expect(auditLog.catat).toHaveBeenCalledWith(expect.objectContaining({ actorId: null }));
  });
});
