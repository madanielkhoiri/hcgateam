import { Module } from '@nestjs/common';
import { PengaduanLayananAksesService } from './pengaduan-layanan-akses.service';
import { PengaduanLayananController } from './pengaduan-layanan.controller';
import { PengaduanLayananService } from './pengaduan-layanan.service';

@Module({
  controllers: [PengaduanLayananController],
  providers: [PengaduanLayananService, PengaduanLayananAksesService],
})
export class PengaduanLayananModule {}
