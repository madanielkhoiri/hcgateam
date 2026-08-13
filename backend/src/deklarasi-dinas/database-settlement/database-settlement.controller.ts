import { UseInterceptors, Controller, Get, Param, ParseIntPipe } from '@nestjs/common';

import { DatabaseSettlementService } from './database-settlement.service';
import { SnakeCaseInterceptor } from '../bantuan/snake-case.interceptor';


// <--- fitur controller database settlement uang operasional --->
@UseInterceptors(SnakeCaseInterceptor)
@Controller('database-settlement')
export class DatabaseSettlementController {
  constructor(
    private readonly databaseSettlementService: DatabaseSettlementService,
  ) {}

  @Get()
  ambilSemua() {
    return this.databaseSettlementService.ambilSemua();
  }

  @Get('pengguna/:idPengguna')
  ambilBerdasarkanPengguna(
    @Param('idPengguna', ParseIntPipe) idPengguna: number,
  ) {
    return this.databaseSettlementService.ambilBerdasarkanPengguna(idPengguna);
  }

  @Get('deklarasi/:idDeklarasi')
  ambilBerdasarkanDeklarasi(
    @Param('idDeklarasi', ParseIntPipe) idDeklarasi: number,
  ) {
    return this.databaseSettlementService.ambilBerdasarkanDeklarasi(idDeklarasi);
  }
}
// <--- end --->