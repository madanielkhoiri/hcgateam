// ==================================================
// FILE: backend/src/eprom/common/eprom-akses.service.ts
// FUNGSI: Penjaga hak akses Owner/Vendor pada modul e-ProM
// Referensi: alur-workflow-tender-kontrak-project-area.md bagian 1 & 9
// ==================================================

import { ForbiddenException, Injectable } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AktorEprom } from './eprom-aktor';

/** Admin portal & Section Head diperlakukan setara Owner di dalam modul e-ProM. */
const ROLE_SETARA_OWNER: UserRole[] = [
  UserRole.OWNER,
  UserRole.ADMIN,
  UserRole.SUPER_ADMIN,
  UserRole.SECTION_HEAD,
];

@Injectable()
export class EpromAksesService {
  constructor(private readonly prisma: PrismaService) {}

  isOwner(aktor: AktorEprom): boolean {
    return ROLE_SETARA_OWNER.includes(aktor.role);
  }

  isVendor(aktor: AktorEprom): boolean {
    return aktor.role === UserRole.VENDOR;
  }

  wajibOwner(aktor: AktorEprom): void {
    if (!this.isOwner(aktor)) {
      throw new ForbiddenException(
        'Aksi ini hanya dapat dilakukan oleh akun Owner',
      );
    }
  }

  wajibVendor(aktor: AktorEprom): void {
    if (!this.isVendor(aktor)) {
      throw new ForbiddenException(
        'Aksi ini hanya dapat dilakukan oleh akun Vendor',
      );
    }
  }

  /** Owner boleh lintas vendor; akun Vendor hanya boleh menyentuh datanya sendiri. */
  async wajibVendorSendiri(
    aktor: AktorEprom,
    vendorId: number,
  ): Promise<void> {
    if (this.isOwner(aktor)) {
      return;
    }

    this.wajibVendor(aktor);

    if (aktor.vendorId !== vendorId) {
      throw new ForbiddenException(
        'Akun Vendor hanya dapat mengelola datanya sendiri',
      );
    }
  }

  /** Vendor milik akun yang login (untuk akun role VENDOR). */
  async vendorDariAkun(aktor: AktorEprom) {
    if (!aktor.vendorId) {
      return null;
    }

    return this.prisma.vendor.findUnique({ where: { id: aktor.vendorId } });
  }

  /**
   * Owner boleh mengelola Project manapun; akun Vendor hanya boleh
   * menyentuh Project dari Kontrak di mana dia vendor pemenangnya —
   * dipakai seluruh sub-modul Project Area (Engineer, Konstruksi, dst.).
   */
  async wajibAksesProject(aktor: AktorEprom, projectId: number): Promise<void> {
    if (this.isOwner(aktor)) {
      return;
    }

    this.wajibVendor(aktor);

    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { kontrak: { select: { vendorId: true } } },
    });

    if (!project || project.kontrak.vendorId !== aktor.vendorId) {
      throw new ForbiddenException(
        'Akun Vendor hanya dapat mengelola project miliknya sendiri',
      );
    }
  }
}
