import { Module } from '@nestjs/common';
import { TiketController } from './tiket.controller';
import { TiketService } from './tiket.service';
import { TiketFileService } from './tiket-file.service';
import { TiketBillingController } from './billing/tiket-billing.controller';
import { TiketBillingRekapService } from './billing/tiket-billing-rekap.service';
import { TiketBillingService } from './billing/tiket-billing.service';

@Module({
  controllers: [TiketController, TiketBillingController],
  providers: [
    TiketService,
    TiketFileService,
    TiketBillingRekapService,
    TiketBillingService,
  ],
})
export class TiketModule {}
