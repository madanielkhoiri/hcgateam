import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ToolAssetStatus,
  ToolOwner,
  ToolReturnCondition,
  UserRole,
} from '@prisma/client';
import * as QRCode from 'qrcode';
import { PrismaService } from '../prisma/prisma.service';
import { GudangAksesService } from './gudang-akses.service';

type Actor = { id: number; role: UserRole };

type EmployeeQr = {
  type: 'HCGA_TOOL_EMPLOYEE';
  nrp: string;
  name: string;
};

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

  async listTools(actor: Actor, owner?: string) {
    this.authorize(actor);
    return this.prisma.toolAsset.findMany({
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
  }

  async createTool(
    actor: Actor,
    body: { owner?: string; code?: string; name?: string },
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
    return this.prisma.toolAsset.create({ data: { owner, code, name } });
  }

  async borrow(actor: Actor, toolId: number, qrData: string) {
    this.authorize(actor);
    const employee = await this.employeeFromQr(qrData);

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
        },
        include: { tool: true, borrower: true },
      });
      return loan;
    });
  }

  async returnTool(
    actor: Actor,
    toolId: number,
    body: { qrData?: string; condition?: string; note?: string },
  ) {
    this.authorize(actor);
    const employee = await this.employeeFromQr(String(body.qrData || ''));
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
