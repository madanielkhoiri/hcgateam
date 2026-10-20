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
const QUESTIONS = ['method', 'hsePresentation', 'finance', 'warranty', 'experience', 'boq', 'organization', 'equipmentReadiness', 'workSchedule', 'mobilization', 'riskMitigation', 'progressReporting'];
const n = (v: unknown) => Number.isFinite(Number(v)) ? Number(v) : 0;

function calculate(rows: any[], config: Data) {
  const price = (d: Data) => { const rounds = Array.isArray(d.sphRounds) ? d.sphRounds : []; const last = rounds.at(-1); return last?.verification === 'yes' && n(last?.value) > 0 ? n(last.value) : 0; };
  const participants = rows.filter((r) => ((r.evaluasi?.evaluasiData ?? {}) as Data).response !== 'tidak');
  const priceDurationReady = participants.length > 0 && participants.every((r) => { const d = (r.evaluasi?.evaluasiData ?? {}) as Data; return price(d) > 0 && n(d.durationDays) > 0; });
  const eligible = participants.filter((r) => { const d = (r.evaluasi?.evaluasiData ?? {}) as Data; return price(d) > 0 && n(d.durationDays) > 0; });
  const minPrice = priceDurationReady ? Math.min(...eligible.map((r) => price(r.evaluasi.evaluasiData as Data)), Infinity) : Infinity;
  const minDuration = priceDurationReady ? Math.min(...eligible.map((r) => n(r.evaluasi.evaluasiData.durationDays)), Infinity) : Infinity;
  return rows.map((r) => {
    const data = (r.evaluasi?.evaluasiData ?? {}) as Data;
    const ok = eligible.includes(r);
    const presentationValues = QUESTIONS.map((q) => data.presentation?.[q] === true ? 10 : data.presentation?.[q] === false ? 1 : Number(data.presentation?.[q]));
    const presentation = presentationValues.every((value) => Number.isInteger(value) && value >= 1 && value <= 10) ? presentationValues.reduce((sum, value) => sum + value, 0) / (QUESTIONS.length * 10) : null;
    const documentValues = [Number(data.adminScore), Number(data.hseScore)].map((value) => value > 10 ? value / 10 : value);
    const documents = documentValues.every((value) => Number.isInteger(value) && value >= 1 && value <= 10) ? documentValues.reduce((sum, value) => sum + value, 0) / 20 : null;
    const components = ok ? { documents: documents === null ? null : documents * 20, presentation: presentation === null ? null : presentation * 40, price: priceDurationReady ? minPrice / price(data) * 30 : null, duration: priceDurationReady ? minDuration / n(data.durationDays) * 10 : null } : null;
    const score = components && Object.values(components).every((value) => value !== null) ? Object.values(components).reduce<number>((sum, value) => sum + Number(value), 0) : null;
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
  async hapusDokumen(id: number, vendorId: number, jenis: string, index: number) {
    await this.tender(id);
    if (!['admin', 'hse'].includes(jenis)) throw new BadRequestException('Jenis dokumen tidak valid');
    const row = await this.prisma.evaluasiVendor.findUnique({ where: { tenderId_vendorId: { tenderId: id, vendorId } } });
    if (!row) throw new NotFoundException('Evaluasi vendor tidak ditemukan');
    const files = [...(jenis === 'admin' ? row.dokumenAdminFiles : row.dokumenHseFiles)];
    const [removed] = files.splice(index, 1);
    if (!removed) throw new NotFoundException('Dokumen tidak ditemukan');
    await this.prisma.evaluasiVendor.update({ where: { tenderId_vendorId: { tenderId: id, vendorId } }, data: jenis === 'admin' ? { dokumenAdminFiles: files } : { dokumenHseFiles: files } });
    this.file.hapus(removed);
    return this.daftar(id);
  }
  async pdfBuffer(id: number) { return this.pdf.tenderEvaluation(await this.daftar(id)); }
}
