import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Prisma,
  ToolAssetStatus,
  ToolOwner,
  ToolReturnCondition,
  UserRole,
} from '@prisma/client';
import * as QRCode from 'qrcode';
import { PrismaService } from '../prisma/prisma.service';
import { GudangAksesService } from './gudang-akses.service';
import {
  TOOL_INSPECTION_TEMPLATES,
  resolveInspectionKey,
  templateByKey,
} from './tool-inspection-templates';

type Actor = { id: number; role: UserRole; nama?: string };

type EmployeeQr = {
  type: 'HCGA_TOOL_EMPLOYEE';
  nrp: string;
  name: string;
};

/** Identitas peminjam/pengembali: scan QR atau isi NRP manual. */
type IdentityInput = { qrData?: string; nrp?: string };

type InspectionInput = {
  items?: Array<{ condition?: string; hazardCode?: string; note?: string }>;
  notes?: string;
};

const KODE_BAHAYA = ['H', 'S', 'M'] as const;

@Injectable()
export class ToolBorrowingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: GudangAksesService,
  ) {}

  private authorize(actor: Actor) {
    this.access.wajibGudang(actor.role);
  }

  private authorizeManager(actor: Actor) {
    this.authorize(actor);
    const managers: UserRole[] = [
      UserRole.ADMIN,
      UserRole.SUPER_ADMIN,
      UserRole.SECTION_HEAD,
      UserRole.ELEKTRIK,
      UserRole.GRUP_LEADER_GA,
    ];
    if (!managers.includes(actor.role)) {
      throw new BadRequestException('Menu ini hanya dapat dikelola Admin, Section Head, GA, atau Electric');
    }
  }

  private owner(value: string): ToolOwner {
    const normalized = String(value || '').trim().toUpperCase();
    if (normalized !== ToolOwner.GA && normalized !== ToolOwner.ELECTRIC) {
      throw new BadRequestException('Pemilik alat harus GA atau ELECTRIC');
    }
    return normalized as ToolOwner;
  }

  private inspectionType(value?: string | null): string | null {
    const key = String(value || '').trim().toUpperCase();
    if (!key) return null;
    if (!templateByKey(key)) throw new BadRequestException('Jenis inspeksi alat tidak dikenal');
    return key;
  }

  private qrPayload(nrp: string, name: string): string {
    return JSON.stringify({ type: 'HCGA_TOOL_EMPLOYEE', nrp, name });
  }

  private parseQr(raw: string): EmployeeQr {
    try {
      const parsed = JSON.parse(raw) as Partial<EmployeeQr>;
      if (
        parsed.type !== 'HCGA_TOOL_EMPLOYEE' ||
        !String(parsed.nrp || '').trim() ||
        !String(parsed.name || '').trim()
      ) {
        throw new Error('invalid');
      }
      return {
        type: 'HCGA_TOOL_EMPLOYEE',
        nrp: String(parsed.nrp).trim(),
        name: String(parsed.name).trim().toUpperCase(),
      };
    } catch {
      throw new BadRequestException('QR bukan QR karyawan Peminjaman Alat yang valid');
    }
  }

  private async employeeFromQr(raw: string) {
    const qr = this.parseQr(raw);
    const employee = await this.prisma.toolBorrowEmployee.findUnique({
      where: { nrp: qr.nrp },
    });
    if (!employee || !employee.isActive) {
      throw new BadRequestException('Karyawan pada QR tidak terdaftar atau sudah tidak aktif');
    }
    if (employee.name.trim().toUpperCase() !== qr.name) {
      throw new BadRequestException('Nama dan NRP pada QR tidak cocok dengan database');
    }
    return employee;
  }

  private async employeeFromNrp(raw: string) {
    const nrp = String(raw || '').trim();
    if (!nrp) throw new BadRequestException('NRP wajib diisi');
    const employee = await this.prisma.toolBorrowEmployee.findUnique({ where: { nrp } });
    if (!employee || !employee.isActive) {
      throw new BadRequestException(`NRP ${nrp} tidak terdaftar di Database Karyawan & QR atau sudah tidak aktif`);
    }
    return employee;
  }

  /** Scan QR diutamakan; bila tidak ada QR dipakai NRP manual. */
  private async identity(input: IdentityInput) {
    if (String(input.qrData || '').trim()) {
      return { employee: await this.employeeFromQr(String(input.qrData)), method: 'SCAN' as const };
    }
    if (String(input.nrp || '').trim()) {
      return { employee: await this.employeeFromNrp(String(input.nrp)), method: 'MANUAL' as const };
    }
    throw new BadRequestException('Scan QR atau isi NRP terlebih dahulu');
  }

  async listEmployees(actor: Actor) {
    this.authorizeManager(actor);
    const rows = await this.prisma.toolBorrowEmployee.findMany({
      orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
    });
    return rows.map((row) => ({
      ...row,
      qrPayload: this.qrPayload(row.nrp, row.name),
    }));
  }

  /** Cari nama dari NRP (untuk input manual). Boleh dipakai petugas Gudang. */
  async lookupEmployee(actor: Actor, nrp: string) {
    this.authorize(actor);
    const employee = await this.employeeFromNrp(nrp);
    return { nrp: employee.nrp, name: employee.name };
  }

  async createEmployee(actor: Actor, body: { nrp?: string; name?: string }) {
    this.authorizeManager(actor);
    const nrp = String(body.nrp || '').trim();
    const name = String(body.name || '').trim().toUpperCase();
    if (!nrp || !name) throw new BadRequestException('NRP dan nama wajib diisi');
    const exists = await this.prisma.toolBorrowEmployee.findUnique({ where: { nrp } });
    if (exists) throw new ConflictException('NRP sudah terdaftar');
    const row = await this.prisma.toolBorrowEmployee.create({ data: { nrp, name } });
    return { ...row, qrPayload: this.qrPayload(row.nrp, row.name) };
  }

  async employeeQrSvg(actor: Actor, id: number) {
    this.authorizeManager(actor);
    const employee = await this.prisma.toolBorrowEmployee.findUnique({ where: { id } });
    if (!employee) throw new NotFoundException('Karyawan tidak ditemukan');
    return QRCode.toString(this.qrPayload(employee.nrp, employee.name), {
      type: 'svg',
      margin: 1,
      width: 480,
      errorCorrectionLevel: 'M',
    });
  }

  inspectionTemplates(actor: Actor) {
    this.authorize(actor);
    return TOOL_INSPECTION_TEMPLATES;
  }

  async listTools(actor: Actor, owner?: string) {
    this.authorize(actor);
    const rows = await this.prisma.toolAsset.findMany({
      where: owner ? { owner: this.owner(owner), isActive: true } : { isActive: true },
      include: {
        loans: {
          where: { returnedAt: null },
          take: 1,
          orderBy: { borrowedAt: 'desc' },
          include: { borrower: true },
        },
      },
      orderBy: [{ owner: 'asc' }, { code: 'asc' }],
    });
    return rows.map((row) => ({
      ...row,
      inspectionKey: resolveInspectionKey(row.inspectionType, row.name),
    }));
  }

  async createTool(
    actor: Actor,
    body: { owner?: string; code?: string; name?: string; inspectionType?: string },
  ) {
    this.authorizeManager(actor);
    const owner = this.owner(body.owner || '');
    const code = String(body.code || '').trim().toUpperCase();
    const name = String(body.name || '').trim().toUpperCase();
    if (!code || !name) throw new BadRequestException('Kode dan nama alat wajib diisi');
    const exists = await this.prisma.toolAsset.findUnique({
      where: { owner_code: { owner, code } },
    });
    if (exists) throw new ConflictException('Kode alat sudah terdaftar pada tim tersebut');
    return this.prisma.toolAsset.create({
      data: { owner, code, name, inspectionType: this.inspectionType(body.inspectionType) },
    });
  }

  async updateToolInspectionType(actor: Actor, id: number, inspectionType?: string) {
    this.authorizeManager(actor);
    const tool = await this.prisma.toolAsset.findUnique({ where: { id } });
    if (!tool) throw new NotFoundException('Alat tidak ditemukan');
    const row = await this.prisma.toolAsset.update({
      where: { id },
      data: { inspectionType: this.inspectionType(inspectionType) },
    });
    return { ...row, inspectionKey: resolveInspectionKey(row.inspectionType, row.name) };
  }

  /**
   * Hasil inspeksi disusun dari checklist resmi di server, jadi butir dan
   * standar tidak bisa diubah dari browser. Butir "Tidak Baik" wajib diberi
   * kode bahaya; kode H (Stop & Perbaiki Segera) membuat alat tidak boleh dipinjam.
   */
  private buildInspection(
    tool: { name: string; inspectionType: string | null },
    input: InspectionInput | undefined,
    employee: { nrp: string; name: string },
    actor: Actor,
  ) {
    const key = resolveInspectionKey(tool.inspectionType, tool.name);
    const template = templateByKey(key)!;
    const answers = Array.isArray(input?.items) ? input!.items : [];
    if (answers.length !== template.items.length) {
      throw new BadRequestException('Inspeksi alat wajib diisi lengkap sebelum meminjam');
    }

    const items = template.items.map((row, index) => {
      const answer = answers[index] || {};
      const condition = String(answer.condition || '').toUpperCase();
      if (condition !== 'BAIK' && condition !== 'TIDAK_BAIK') {
        throw new BadRequestException(`Butir ${index + 1} (${row.item}) belum dipilih Baik / Tidak Baik`);
      }
      const hazardCode = condition === 'TIDAK_BAIK' ? String(answer.hazardCode || '').toUpperCase() : null;
      if (condition === 'TIDAK_BAIK' && !KODE_BAHAYA.includes(hazardCode as (typeof KODE_BAHAYA)[number])) {
        throw new BadRequestException(`Butir ${index + 1} (${row.item}) Tidak Baik: pilih kode bahaya H, S, atau M`);
      }
      return {
        no: index + 1,
        item: row.item,
        standard: row.standard,
        condition,
        hazardCode,
        note: String(answer.note || '').trim() || null,
      };
    });

    const kritis = items.filter((item) => item.hazardCode === 'H');
    if (kritis.length) {
      throw new BadRequestException(
        `Alat tidak boleh dipinjam: ${kritis.map((item) => item.item).join(', ')} berkode bahaya H (Stop & Perbaiki Segera)`,
      );
    }

    return {
      form: 'PPA-ADRO-F-HCGA-94',
      templateKey: template.key,
      title: template.title,
      items,
      notes: String(input?.notes || '').trim() || null,
      inspectedBy: { nrp: employee.nrp, name: employee.name },
      checkedBy: { userId: actor.id, name: actor.nama ?? null },
      inspectedAt: new Date().toISOString(),
    };
  }

  async borrow(
    actor: Actor,
    toolId: number,
    body: IdentityInput & { inspection?: InspectionInput },
  ) {
    this.authorize(actor);
    const { employee, method } = await this.identity(body);
    const tool = await this.prisma.toolAsset.findUnique({ where: { id: toolId } });
    if (!tool || !tool.isActive) throw new NotFoundException('Alat tidak ditemukan');
    const inspection = this.buildInspection(tool, body.inspection, employee, actor);

    return this.prisma.$transaction(async (tx) => {
      const locked = await tx.toolAsset.updateMany({
        where: { id: toolId, isActive: true, status: ToolAssetStatus.AVAILABLE },
        data: { status: ToolAssetStatus.BORROWED },
      });
      if (locked.count !== 1) {
        throw new ConflictException('Alat tidak tersedia atau masih dipinjam');
      }
      const loan = await tx.toolLoan.create({
        data: {
          toolId,
          borrowerId: employee.id,
          borrowedByUserId: actor.id,
          borrowMethod: method,
          borrowInspection: inspection as Prisma.InputJsonValue,
        },
        include: { tool: true, borrower: true },
      });
      return loan;
    });
  }

  async returnTool(
    actor: Actor,
    toolId: number,
    body: IdentityInput & { condition?: string; note?: string },
  ) {
    this.authorize(actor);
    const { employee, method } = await this.identity(body);
    const condition = String(body.condition || '').toUpperCase();
    if (!Object.values(ToolReturnCondition).includes(condition as ToolReturnCondition)) {
      throw new BadRequestException('Kondisi harus GOOD, DAMAGED, atau LOST');
    }

    return this.prisma.$transaction(async (tx) => {
      const loan = await tx.toolLoan.findFirst({
        where: { toolId, returnedAt: null },
        include: { borrower: true, tool: true },
        orderBy: { borrowedAt: 'desc' },
      });
      if (!loan) throw new BadRequestException('Alat tidak memiliki peminjaman aktif');
      if (loan.borrowerId !== employee.id) {
        throw new BadRequestException(
          `Identitas tidak sesuai. Alat tercatat dipinjam oleh ${loan.borrower.nrp} - ${loan.borrower.name}`,
        );
      }

      const nextStatus =
        condition === ToolReturnCondition.GOOD
          ? ToolAssetStatus.AVAILABLE
          : condition === ToolReturnCondition.DAMAGED
            ? ToolAssetStatus.DAMAGED
            : ToolAssetStatus.LOST;

      await tx.toolAsset.update({ where: { id: toolId }, data: { status: nextStatus } });
      return tx.toolLoan.update({
        where: { id: loan.id },
        data: {
          returnedAt: new Date(),
          returnerId: employee.id,
          returnCondition: condition as ToolReturnCondition,
          returnNote: String(body.note || '').trim() || null,
          returnedByUserId: actor.id,
          returnMethod: method,
        },
        include: { tool: true, borrower: true, returner: true },
      });
    });
  }

  async history(actor: Actor) {
    this.authorizeManager(actor);
    return this.prisma.toolLoan.findMany({
      include: { tool: true, borrower: true, returner: true },
      orderBy: { borrowedAt: 'desc' },
      take: 500,
    });
  }
}
