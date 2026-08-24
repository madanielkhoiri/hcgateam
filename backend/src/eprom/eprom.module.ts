// ==================================================
// FILE: backend/src/eprom/eprom.module.ts
// FUNGSI: Module e-ProM (Tender, Kontrak, Project Area, dst.) - Civil Project
// Referensi: alur-workflow-tender-kontrak-project-area.md
// ==================================================

import { Module } from '@nestjs/common';
import { EpromAksesService } from './common/eprom-akses.service';
import { EpromFileService } from './common/eprom-file.service';
import { EpromVendorController } from './vendor/eprom-vendor.controller';
import { EpromVendorService } from './vendor/eprom-vendor.service';
import { EpromDocumentsController } from './documents/eprom-documents.controller';
import { EpromDocumentsService } from './documents/eprom-documents.service';
import { EpromTenderController } from './tender/eprom-tender.controller';
import { EpromTenderService } from './tender/eprom-tender.service';
import { EpromKontrakController } from './kontrak/eprom-kontrak.controller';
import { EpromKontrakService } from './kontrak/eprom-kontrak.service';
import { EpromDashboardController } from './dashboard/eprom-dashboard.controller';
import { EpromDashboardService } from './dashboard/eprom-dashboard.service';
import { EpromProjectController } from './project/eprom-project.controller';
import { EpromProjectService } from './project/eprom-project.service';
import { EpromEngineerController } from './engineer/eprom-engineer.controller';
import { EpromEngineerService } from './engineer/eprom-engineer.service';
import { EpromKonstruksiController } from './konstruksi/eprom-konstruksi.controller';
import { EpromKonstruksiService } from './konstruksi/eprom-konstruksi.service';
import { EpromProgressController } from './progress/eprom-progress.controller';
import { EpromProgressService } from './progress/eprom-progress.service';
import { EpromSosialisasiJsaController } from './sosialisasi-jsa/eprom-sosialisasi-jsa.controller';
import { EpromSosialisasiJsaService } from './sosialisasi-jsa/eprom-sosialisasi-jsa.service';
import { EpromMeetingController } from './meeting/eprom-meeting.controller';
import { EpromMeetingService } from './meeting/eprom-meeting.service';
import { EpromDokumenController } from './dokumen/eprom-dokumen.controller';
import { EpromDokumenService } from './dokumen/eprom-dokumen.service';
import { EpromFinancialController } from './financial/eprom-financial.controller';
import { EpromFinancialService } from './financial/eprom-financial.service';
import { EpromClosingController } from './closing/eprom-closing.controller';
import { EpromClosingService } from './closing/eprom-closing.service';
import { EpromEvaluasiVendorController } from './tender/eprom-evaluasi-vendor.controller';
import { EpromEvaluasiVendorService } from './tender/eprom-evaluasi-vendor.service';

@Module({
  controllers: [
    EpromVendorController,
    EpromDocumentsController,
    EpromTenderController,
    EpromEvaluasiVendorController,
    EpromKontrakController,
    EpromDashboardController,
    EpromProjectController,
    EpromEngineerController,
    EpromKonstruksiController,
    EpromProgressController,
    EpromSosialisasiJsaController,
    EpromMeetingController,
    EpromDokumenController,
    EpromFinancialController,
    EpromClosingController,
  ],
  providers: [
    EpromAksesService,
    EpromFileService,
    EpromVendorService,
    EpromDocumentsService,
    EpromTenderService,
    EpromEvaluasiVendorService,
    EpromKontrakService,
    EpromDashboardService,
    EpromProjectService,
    EpromEngineerService,
    EpromKonstruksiService,
    EpromProgressService,
    EpromSosialisasiJsaService,
    EpromMeetingService,
    EpromDokumenService,
    EpromFinancialService,
    EpromClosingService,
  ],
})
export class EpromModule {}

// ==================================================
// SELESAI: backend/src/eprom/eprom.module.ts
// ==================================================
