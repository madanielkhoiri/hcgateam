import { Module } from '@nestjs/common';
import { PengaduanLayananAksesService } from './pengaduan-layanan-akses.service';
import { PengaduanLayananController } from './pengaduan-layanan.controller';
import { PengaduanLayananService } from './pengaduan-layanan.service';
import { WebPushModule } from '../web-push/web-push.module';

@Module({
  imports: [WebPushModule],
  controllers: [PengaduanLayananController],
  providers: [PengaduanLayananService, PengaduanLayananAksesService],
})
export class PengaduanLayananModule {}
