// ==================================================
// FILE: backend/src/app.module.ts
// FUNGSI: Module utama backend HCGA TEAM
// ==================================================

import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { WorkOrdersModule } from './work-orders/work-orders.module';
import { HandoversModule } from './handovers/handovers.module';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { WhatsappModule } from './whatsapp/whatsapp.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { HcgaThrottlerGuard } from './common/hcga-throttler.guard';

// ==================================================
// APP MODULE
// ==================================================

import { InventoryModule } from './inventory/inventory.module';
import { DailyActivitiesModule } from './daily-activities/daily-activities.module';
import { PreActivityChecksModule } from './pre-activity-checks/pre-activity-checks.module';
import { PostActivitiesModule } from './post-activities/post-activities.module';
import { SignatureLibraryModule } from './signature-library/signature-library.module';

import { P5mModule } from './p5m/p5m.module';
import { TransportModule } from './transport/transport.module';
import { OrderPackMealModule } from './order-pack-meal/order-pack-meal.module';

import { DatabaseSettlementModule } from './deklarasi-dinas/database-settlement/database-settlement.module';
import { DeklarasiModule } from './deklarasi-dinas/deklarasi/deklarasi.module';
import { KaryawanModule } from './deklarasi-dinas/karyawan/karyawan.module';
import { NotaModule } from './deklarasi-dinas/nota/nota.module';
import { PengajuanModule } from './deklarasi-dinas/pengajuan/pengajuan.module';
import { PenggunaModule } from './deklarasi-dinas/pengguna/pengguna.module';
import { SaldoModule } from './deklarasi-dinas/saldo/saldo.module';

import { McuModule } from './mcu/mcu.module';
import { HelpdeskModule } from './helpdesk/helpdesk.module';
import { DatabaseKaryawanModule } from './database-karyawan/database-karyawan.module';
import { SuratTugasDinasModule } from './surat-tugas-dinas/surat-tugas-dinas.module';
import { AnakMagangModule } from './anak-magang/anak-magang.module';
import { SuratBalasanMagangModule } from './surat-balasan-magang/surat-balasan-magang.module';
import { SuratPenolakanMagangModule } from './surat-penolakan-magang/surat-penolakan-magang.module';
import { EpromModule } from './eprom/eprom.module';
import { TiketModule } from './tiket/tiket.module';
import { TravelModule } from './travel/travel.module';
import { HousekeepingIndoorModule } from './housekeeping-indoor/housekeeping-indoor.module';
import { IrModule } from './ir/ir.module';
import { PostinganModule } from './postingan/postingan.module';
import { AktivitasModule } from './aktivitas/aktivitas.module';
import { CivilTps3rModule } from './civil-tps3r/civil-tps3r.module';
import { DriveModule } from './drive/drive.module';
import { AlbumModule } from './album/album.module';
import { KipModule } from './kip/kip.module';

@Module({
  imports: [
    InventoryModule,
    WhatsappModule,
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    // Rate limiting global — default longgar (aman untuk kantor yang
    // berbagi 1 IP publik). Endpoint login dibatasi lebih ketat lewat
    // decorator @Throttle di AuthController, dilacak per (IP + username)
    // lewat HcgaThrottlerGuard supaya tidak mengunci karyawan lain.
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 60_000,
        limit: 300,
      },
    ]),

    PrismaModule,
    UsersModule,
    AuthModule,
    WorkOrdersModule,
    HandoversModule,
    DailyActivitiesModule,
    PreActivityChecksModule,
    PostActivitiesModule,
    SignatureLibraryModule,
    P5mModule,
    TransportModule,
    OrderPackMealModule,
    PenggunaModule,
    KaryawanModule,
    DeklarasiModule,
    DatabaseSettlementModule,
    NotaModule,
    SaldoModule,
    PengajuanModule,
    McuModule,
    HelpdeskModule,
    DatabaseKaryawanModule,
    SuratTugasDinasModule,
    AnakMagangModule,
    SuratBalasanMagangModule,
    SuratPenolakanMagangModule,
    EpromModule,
    TiketModule,
    TravelModule,
    HousekeepingIndoorModule,
    IrModule,
    PostinganModule,
    AktivitasModule,
    CivilTps3rModule,
    DriveModule,
    AlbumModule,
    KipModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: HcgaThrottlerGuard },
  ],
})
export class AppModule {}

// ==================================================
// SELESAI: backend/src/app.module.ts
// ==================================================
