import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, UserRole } from '@prisma/client';
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
type Actor = { id: number; nama?: string; jabatan?: string | null; role: UserRole };

type Data = Record<string, any>;
const QUESTIONS = ['method', 'hsePresentation', 'finance', 'warranty', 'experience', 'boq', 'organization', 'equipmentReadiness', 'workSchedule', 'mobilization', 'riskMitigation', 'progressReporting'];
const n = (v: unknown) => Number.isFinite(Number(v)) ? Number(v) : 0;
const PERSONAL_KEYS = ['adminScore', 'hseScore', 'presentation', 'presentationNotes', 'recommendationStatus', 'decisionNotes'] as const;
const SHARED_KEYS = ['invitationDate', 'responseDate', 'response', 'sphRounds', 'finalSph', 'durationDays', 'manpowerOffered', 'localWorkers', 'nonLocalWorkers'] as const;
const pick = (source: Data, keys: readonly string[]) => Object.fromEntries(keys.filter((key) => source[key] !== undefined).map((key) => [key, source[key]]));
const average = (values: unknown[]) => values.length ? Math.round(values.reduce<number>((sum, value) => sum + Number(value), 0) / values.length * 100) / 100 : undefined;
function aggregatePersonal(rows: Array<{ data: unknown }>): Data {
  const data = rows.map((row) => (row.data ?? {}) as Data);
  const result: Data = {};
  for (const key of ['adminScore', 'hseScore'] as const) {
    const values = data.map((item) => item[key]).filter((value) => Number(value) >= 1 && Number(value) <= 10);
    const value = average(values);
    if (value !== undefined) result[key] = value;
  }
  const presentation = Object.fromEntries(QUESTIONS.map((key) => {
    const values = data.map((item) => item.presentation?.[key]).filter((value) => Number(value) >= 1 && Number(value) <= 10);
    return [key, average(values)];
  }).filter(([, value]) => value !== undefined));
  if (Object.keys(presentation).length) result.presentation = presentation;
  return result;
}

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
  private async tender(id: number) { const tender = await this.prisma.tenderProcess.findUnique({ where: { id }, include: { undangan: { include: { vendor: true }, orderBy: { id: 'asc' } }, evaluasiVendor: true, evaluasiPenilai: true, sph: { where: { statusPemenang: true }, include: { vendor: true }, take: 1 } } }); if (!tender) throw new NotFoundException('Tender tidak ditemukan'); if (tender.jenisTender === 'INTERNAL') throw new BadRequestException('Tender Internal tidak memiliki Evaluasi Vendor'); return tender; }
  private wajibBelumDikunci(tender: { sph?: unknown[] }) { if ((tender.sph ?? []).length > 0) throw new BadRequestException('Evaluasi tender sudah dikunci karena pemenang telah ditetapkan'); }
  async daftar(id: number, actor: Actor = { id: 0, role: UserRole.ADMIN, nama: 'System' }) {
    const tender = await this.tender(id), map = new Map(tender.evaluasiVendor.map((e) => [e.vendorId, e]));
    const evaluatorRows = tender.evaluasiPenilai ?? [];
    const finalRows = evaluatorRows.filter((row) => row.status === 'FINAL');
    const rows = tender.undangan.map((u) => {
      const evaluasi = map.get(u.vendorId) ?? null;
      const shared = (evaluasi?.evaluasiData ?? {}) as Data;
      const personal = evaluatorRows.find((row) => row.vendorId === u.vendorId && row.userId === actor.id);
      const finalized = finalRows.filter((row) => row.vendorId === u.vendorId);
      const aggregateData = finalized.length ? { ...shared, ...aggregatePersonal(finalized) } : shared;
      return { vendor: u.vendor, evaluasi: evaluasi ? { ...evaluasi, evaluasiData: aggregateData } : { evaluasiData: aggregateData, dokumenAdminFiles: [], dokumenHseFiles: [] }, data: { ...shared, ...((personal?.data ?? {}) as Data) }, aggregateData, myEvaluation: personal ? { status: personal.status, finalizedAt: personal.finalizedAt } : null, evaluatorCount: finalized.length };
    });
    const calculated = calculate(rows, (tender.evaluasiConfig ?? {}) as Data).map((row) => { const source = rows.find((item) => item.vendor.id === row.vendorId)!; return { ...row, data: source.data, aggregateData: source.aggregateData, myEvaluation: source.myEvaluation, evaluatorCount: source.evaluatorCount }; });
    const evaluators = Array.from(new Map(finalRows.map((row) => [row.userId, { userId: row.userId, nama: row.namaSnapshot, jabatan: row.jabatanSnapshot, finalizedAt: row.finalizedAt }])).values());
    const pemenang = tender.sph?.[0]?.vendor ?? null;
    return { tenderId: id, namaTender: tender.namaTender, locked: Boolean(pemenang), pemenang, config: (tender.evaluasiConfig ?? {}) as Data, evaluators, vendors: calculated };
  }
  async ubah(id: number, vendorId: number, dto: UbahEvaluasiVendorDto, actor: Actor, files: { admin?: Express.Multer.File[]; hse?: Express.Multer.File[] } = {}) {
    const tender = await this.tender(id); this.wajibBelumDikunci(tender); if (!tender.undangan.some((u) => u.vendorId === vendorId)) throw new BadRequestException('Vendor belum diundang');
    const personalOld = tender.evaluasiPenilai.find((row) => row.vendorId === vendorId && row.userId === actor.id);
    if (personalOld?.status === 'FINAL') throw new BadRequestException('Penilaian Anda sudah difinalisasi dan tidak dapat diubah');
    const old = await this.prisma.evaluasiVendor.findUnique({ where: { tenderId_vendorId: { tenderId: id, vendorId } } });
    const save = (f: Express.Multer.File) => this.file.simpan(f, `tender/${id}/evaluasi`, this.file.tebakTipe(f.originalname));
    const admin = [...(old?.dokumenAdminFiles ?? []), ...(files.admin ?? []).map(save)], hse = [...(old?.dokumenHseFiles ?? []), ...(files.hse ?? []).map(save)];
    const incoming = (dto.data ?? {}) as Data, existingShared = (old?.evaluasiData ?? {}) as Data;
    const canManageShared = actor.role !== UserRole.KARYAWAN;
    const shared = canManageShared ? { ...existingShared, ...pick(incoming, SHARED_KEYS) } : existingShared;
    const personal = { ...((personalOld?.data ?? {}) as Data), ...pick(incoming, PERSONAL_KEYS) };
    const nextConfig = canManageShared ? (dto.config ?? tender.evaluasiConfig ?? {}) : (tender.evaluasiConfig ?? {});
    const nextAdmin = canManageShared ? admin : (old?.dokumenAdminFiles ?? []);
    const nextHse = canManageShared ? hse : (old?.dokumenHseFiles ?? []);
    await this.prisma.$transaction([this.prisma.tenderProcess.update({ where: { id }, data: { evaluasiConfig: nextConfig as Prisma.InputJsonValue } }), this.prisma.evaluasiVendor.upsert({ where: { tenderId_vendorId: { tenderId: id, vendorId } }, create: { tenderId: id, vendorId, evaluasiData: shared as Prisma.InputJsonValue, dokumenAdminFiles: nextAdmin, dokumenHseFiles: nextHse }, update: { evaluasiData: shared as Prisma.InputJsonValue, dokumenAdminFiles: nextAdmin, dokumenHseFiles: nextHse } }), this.prisma.evaluasiVendorPenilai.upsert({ where: { tenderId_vendorId_userId: { tenderId: id, vendorId, userId: actor.id } }, create: { tenderId: id, vendorId, userId: actor.id, data: personal as Prisma.InputJsonValue, namaSnapshot: actor.nama ?? `User ${actor.id}`, jabatanSnapshot: actor.jabatan }, update: { data: personal as Prisma.InputJsonValue, namaSnapshot: actor.nama ?? `User ${actor.id}`, jabatanSnapshot: actor.jabatan } })]);
    return this.daftar(id, actor);
  }
  async finalisasi(id: number, vendorId: number, actor: Actor) {
    const tender = await this.tender(id); this.wajibBelumDikunci(tender);
    const row = (tender.evaluasiPenilai ?? []).find((item) => item.vendorId === vendorId && item.userId === actor.id);
    if (!row) throw new BadRequestException('Simpan draft penilaian terlebih dahulu');
    const data = row.data as Data;
    const scores = [data.adminScore, data.hseScore, ...QUESTIONS.map((key) => data.presentation?.[key])];
    if (!scores.every((value) => Number(value) >= 1 && Number(value) <= 10)) throw new BadRequestException('Nilai Bagian C dan D wajib lengkap sebelum finalisasi');
    await this.prisma.evaluasiVendorPenilai.update({ where: { id: row.id }, data: { status: 'FINAL', finalizedAt: new Date() } });
    return this.daftar(id, actor);
  }
  async hapusDokumen(id: number, vendorId: number, jenis: string, index: number, actor: Actor = { id: 0, role: UserRole.ADMIN, nama: 'System' }) {
    const tender = await this.tender(id); this.wajibBelumDikunci(tender);
    if (!['admin', 'hse'].includes(jenis)) throw new BadRequestException('Jenis dokumen tidak valid');
    const row = await this.prisma.evaluasiVendor.findUnique({ where: { tenderId_vendorId: { tenderId: id, vendorId } } });
    if (!row) throw new NotFoundException('Evaluasi vendor tidak ditemukan');
    const files = [...(jenis === 'admin' ? row.dokumenAdminFiles : row.dokumenHseFiles)];
    const [removed] = files.splice(index, 1);
    if (!removed) throw new NotFoundException('Dokumen tidak ditemukan');
    await this.prisma.evaluasiVendor.update({ where: { tenderId_vendorId: { tenderId: id, vendorId } }, data: jenis === 'admin' ? { dokumenAdminFiles: files } : { dokumenHseFiles: files } });
    this.file.hapus(removed);
    return this.daftar(id, actor);
  }
  async pdfBuffer(id: number, actor: Actor) { return this.pdf.tenderEvaluation(await this.daftar(id, actor)); }
}
