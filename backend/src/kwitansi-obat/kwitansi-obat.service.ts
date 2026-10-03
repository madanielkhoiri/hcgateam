import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WhatsappService } from '../whatsapp/whatsapp.service';

@Injectable()
export class KwitansiObatService {
  constructor(private readonly prisma: PrismaService, private readonly whatsapp: WhatsappService) {}

  async daftarKaryawan(cari?: string) {
    return this.prisma.karyawan.findMany({ where: { statusKerja: 'AKTIF', ...(cari ? { OR: [{ nama: { contains: cari, mode: 'insensitive' } }, { nik: { contains: cari, mode: 'insensitive' } }] } : {}) }, select: { id: true, nik: true, nama: true, gender: true, noTelepon: true }, orderBy: { nama: 'asc' }, take: 100 });
  }

  async daftar() {
    const logs = await this.prisma.kwitansiObatNotifikasi.findMany({ orderBy: { createdAt: 'desc' }, take: 100 });
    const ids = [...new Set(logs.map((item) => item.karyawanId))];
    const employees = await this.prisma.karyawan.findMany({ where: { id: { in: ids } }, select: { id: true, nama: true, nik: true, gender: true, noTelepon: true } });
    const byId = new Map(employees.map((item) => [item.id, item]));
    return logs.map((item) => ({ ...item, karyawan: byId.get(item.karyawanId) ?? null }));
  }

  async buat(dto: { karyawanId: number; status: 'DISETUJUI'|'DITRANSFER'|'DITOLAK'; nominal?: number; alasan?: string }, dibuatOlehId: number) {
    const karyawan = await this.prisma.karyawan.findUnique({ where: { id: Number(dto.karyawanId) } });
    if (!karyawan) throw new BadRequestException('Karyawan tidak ditemukan');
    if (dto.status === 'DITRANSFER' && (!dto.nominal || Number(dto.nominal) <= 0)) throw new BadRequestException('Nominal wajib diisi untuk status ditransfer');
    if (dto.status === 'DITOLAK' && !dto.alasan?.trim()) throw new BadRequestException('Alasan wajib diisi untuk status ditolak');
    const sapaan = karyawan.gender === 'LAKI_LAKI' ? 'Bapak' : karyawan.gender === 'PEREMPUAN' ? 'Ibu' : 'Yth.';
    const nama = `*${karyawan.nama}*`;
    const statusText = dto.status === 'DISETUJUI' ? 'disetujui' : dto.status === 'DITRANSFER' ? 'telah ditransfer' : 'ditolak';
    let pesan = `Yth. ${sapaan} ${nama},\n\nKwitansi obat Anda ${statusText} oleh HC.`;
    if (dto.status === 'DITRANSFER') pesan += `\nNominal: Rp ${Number(dto.nominal).toLocaleString('id-ID')}`;
    if (dto.status === 'DITOLAK') pesan += `\nAlasan: ${dto.alasan!.trim()}`;
    pesan += '\n\nSilakan hubungi HC bila membutuhkan informasi lebih lanjut.';
    const log = await this.prisma.kwitansiObatNotifikasi.create({ data: { karyawanId: karyawan.id, status: dto.status, nominal: dto.nominal ? Number(dto.nominal) : undefined, alasan: dto.alasan?.trim() || undefined, dibuatOlehId } });
    const terkirim = await this.whatsapp.kirim(karyawan.noTelepon, pesan, undefined, 'HC');
    return { ...log, terkirim };
  }

  async ubahStatus(id: number, dto: { status: 'DISETUJUI'|'DITRANSFER'|'DITOLAK'; nominal?: number; alasan?: string }) {
    const old = await this.prisma.kwitansiObatNotifikasi.findUnique({ where: { id } });
    if (!old) throw new BadRequestException('Rekapan tidak ditemukan');
    const result = await this.buat({ ...dto, karyawanId: old.karyawanId }, old.dibuatOlehId);
    // Perubahan status tetap menjadi satu baris rekapan, bukan membuat duplikat.
    await this.prisma.kwitansiObatNotifikasi.delete({ where: { id: old.id } });
    return { ...result, id: old.id, rekapanBaru: false };
  }

  async hapus(id: number) {
    await this.prisma.kwitansiObatNotifikasi.delete({ where: { id } });
    return { berhasil: true };
  }
}
