import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { EpromFileService } from '../common/eprom-file.service';
import { EpromReportPdfService } from '../reports/eprom-report-pdf.service';

export const KATEGORI_EVALUASI_VENDOR = [] as const;
export const KATEGORI_EVALUASI_TEKNIS = [] as const;
export const ITEM_TEKNIKAL = [] as const;
export const ITEM_HARGA = [] as const;
export const LABEL_KATEGORI_EVALUASI_VENDOR = {};
export const LABEL_ITEM_TEKNIS = {};
export const LABEL_ROUND_TEKNIS = {};
export const KODE_EVALUASI_VENDOR = {};
export class UbahEvaluasiVendorDto { config?: Record<string, unknown>; data?: Record<string, unknown>; }

type Data = Record<string, any>;
const QUESTIONS = ['method', 'hsePresentation', 'finance', 'warranty', 'experience', 'boq', 'organization'];
const n = (v: unknown) => Number.isFinite(Number(v)) ? Number(v) : 0;

function calculate(rows: any[], config: Data) {
  const eligible = rows.filter((r) => { const d = (r.evaluasi?.evaluasiData ?? {}) as Data; return n(d.adminScore) >= 70 && r.evaluasi?.dokumenAdminFiles?.length && n(d.hseScore) >= 70 && r.evaluasi?.dokumenHseFiles?.length && d.response === 'ikut' && n(d.finalSph) > 0 && n(d.durationDays) > 0; });
  const minPrice = Math.min(...eligible.map((r) => n(r.evaluasi.evaluasiData.finalSph)), Infinity);
  const minDuration = Math.min(...eligible.map((r) => n(r.evaluasi.evaluasiData.durationDays)), Infinity);
  return rows.map((r) => {
    const data = (r.evaluasi?.evaluasiData ?? {}) as Data;
    const ok = eligible.includes(r), rounds = Array.isArray(data.sphRounds) ? data.sphRounds : [];
    const ontime = rounds.filter((x: any) => x.deadline && x.receivedAt && new Date(x.receivedAt) <= new Date(x.deadline)).length;
    const presentation = QUESTIONS.filter((q) => data.presentation?.[q] === true).length;
    const responseValid = data.response === 'ikut' && data.invitationDate && data.responseDate && new Date(data.responseDate) >= new Date(data.invitationDate);
    const req = n(config.manpowerRequirement);
    const components = ok ? { price: minPrice / n(data.finalSph) * 35, duration: minDuration / n(data.durationDays) * 15, presentation: presentation / 7 * 40, punctuality: (rounds.length ? ontime / rounds.length : 0) * 5, response: responseValid ? 3 : 0, manpower: (req ? Math.min(1, n(data.manpowerOffered) / req) : 1) * 2 } : null;
    const score = components ? Object.values(components).reduce((a, b) => a + b, 0) : null;
    return { vendorId: r.vendor.id, namaVendor: r.vendor.namaVendor, evaluasi: r.evaluasi, data, eligible: ok, components, score: score === null ? null : Math.round(score * 100) / 100, localPercent: n(data.manpowerOffered) ? Math.round(n(data.localWorkers) / n(data.manpowerOffered) * 10000) / 100 : 0 };
  }).sort((a, b) => (b.score ?? -1) - (a.score ?? -1));
}

@Injectable()
export class EpromEvaluasiVendorService {
  constructor(private readonly prisma: PrismaService, private readonly file: EpromFileService, private readonly pdf: EpromReportPdfService) {}
  private async tender(id: number) { const tender = await this.prisma.tenderProcess.findUnique({ where: { id }, include: { undangan: { include: { vendor: true }, orderBy: { id: 'asc' } }, evaluasiVendor: true } }); if (!tender) throw new NotFoundException('Tender tidak ditemukan'); if (tender.jenisTender === 'INTERNAL') throw new BadRequestException('Tender Internal tidak memiliki Evaluasi Vendor'); return tender; }
  async daftar(id: number) { const tender = await this.tender(id); const map = new Map(tender.evaluasiVendor.map((e) => [e.vendorId, e])); const rows = tender.undangan.map((u) => ({ vendor: u.vendor, evaluasi: map.get(u.vendorId) ?? null })); return { tenderId: id, namaTender: tender.namaTender, config: (tender.evaluasiConfig ?? {}) as Data, vendors: calculate(rows, (tender.evaluasiConfig ?? {}) as Data) }; }
  async ubah(id: number, vendorId: number, dto: UbahEvaluasiVendorDto, files: { admin?: Express.Multer.File[]; hse?: Express.Multer.File[] } = {}) {
    const tender = await this.tender(id); if (!tender.undangan.some((u) => u.vendorId === vendorId)) throw new BadRequestException('Vendor belum diundang');
    const old = await this.prisma.evaluasiVendor.findUnique({ where: { tenderId_vendorId: { tenderId: id, vendorId } } });
    const save = (f: Express.Multer.File) => this.file.simpan(f, `tender/${id}/evaluasi`, this.file.tebakTipe(f.originalname));
    const admin = [...(old?.dokumenAdminFiles ?? []), ...(files.admin ?? []).map(save)], hse = [...(old?.dokumenHseFiles ?? []), ...(files.hse ?? []).map(save)];
    await this.prisma.$transaction([this.prisma.tenderProcess.update({ where: { id }, data: { evaluasiConfig: (dto.config ?? tender.evaluasiConfig ?? {}) as Prisma.InputJsonValue } }), this.prisma.evaluasiVendor.upsert({ where: { tenderId_vendorId: { tenderId: id, vendorId } }, create: { tenderId: id, vendorId, evaluasiData: (dto.data ?? {}) as Prisma.InputJsonValue, dokumenAdminFiles: admin, dokumenHseFiles: hse }, update: { evaluasiData: (dto.data ?? old?.evaluasiData ?? {}) as Prisma.InputJsonValue, dokumenAdminFiles: admin, dokumenHseFiles: hse } })]);
    return this.daftar(id);
  }
  async pdfBuffer(id: number) { return this.pdf.tenderEvaluation(await this.daftar(id)); }
}
