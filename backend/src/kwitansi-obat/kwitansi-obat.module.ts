import { Module } from '@nestjs/common';
import { KwitansiObatController } from './kwitansi-obat.controller';
import { KwitansiObatService } from './kwitansi-obat.service';

@Module({ controllers: [KwitansiObatController], providers: [KwitansiObatService] })
export class KwitansiObatModule {}
