// ==================================================
// FILE: backend/src/app.module.ts
// FUNGSI: Module utama backend HCGA TEAM
// ==================================================

import { Module } from '@nestjs/common';
import { WorkOrdersModule } from './work-orders/work-orders.module';
import { HandoversModule } from './handovers/handovers.module';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';

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

@Module({
  imports: [
    InventoryModule,
    ConfigModule.forRoot({
      isGlobal: true,
    }),

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
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

// ==================================================
// SELESAI: backend/src/app.module.ts
// ==================================================
