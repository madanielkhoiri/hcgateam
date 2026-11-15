import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { MessCleaningStatus, MessOccupantShift, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { AktorPostingan } from '../postingan/postingan-aktor';
import type { CreateMessRoomDto, MessOccupantDto, UpdateMessOccupantDto } from './dto/mess-monitoring.dto';
import { MESS_ROOM_CATALOG } from './mess-room-catalog';

const VIEWERS: UserRole[] = [UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.SECTION_HEAD, UserRole.PJO];
const ADMINS: UserRole[] = [UserRole.ADMIN, UserRole.SUPER_ADMIN];
const OPERATORS: UserRole[] = [...VIEWERS, UserRole.HOUSE_MAN];

@Injectable()
export class MessMonitoringService {
  constructor(private readonly prisma: PrismaService) {}

  private require(actor: AktorPostingan, roles: UserRole[]) {
    if (!roles.includes(actor.role)) throw new ForbiddenException('Anda tidak memiliki akses ke fitur ini');
  }

  private dayKey(date: Date) {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Makassar', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
  }

  private async rows() {
    const rooms = await this.prisma.messRoom.findMany({
      include: { occupants: { orderBy: { name: 'asc' } }, cleanings: { orderBy: { startedAt: 'desc' }, take: 1, include: { houseMan: { select: { id: true, name: true, nrp: true } } } } },
      orderBy: [{ building: 'asc' }, { number: 'asc' }],
    });
    const today = this.dayKey(new Date());
    return rooms.map(({ cleanings, ...room }) => {
      const latest = cleanings[0] ?? null;
      // Status dihitung dari sesi terakhir yang selesai HARI INI (WITA), jadi otomatis kembali BELUM tiap pergantian hari.
      const doneToday = !!latest?.finishedAt && this.dayKey(latest.finishedAt) === today;
      const active = latest && !latest.finishedAt ? latest : null;
      const cleanliness: 'SUDAH' | 'TIDAK_DIBERSIHKAN' | 'BELUM' = !doneToday
        ? 'BELUM'
        : latest?.status === MessCleaningStatus.TIDAK_DIBERSIHKAN
          ? 'TIDAK_DIBERSIHKAN'
          : 'SUDAH';
      return { ...room, cleanliness, activeCleaning: active, lastCleaning: latest };
    });
  }

  catalog() { return MESS_ROOM_CATALOG; }

  async list(actor: AktorPostingan) { this.require(actor, VIEWERS); return this.rows(); }
  async operations(actor: AktorPostingan) { this.require(actor, OPERATORS); return this.rows(); }

  async dashboard(actor: AktorPostingan) {
    this.require(actor, VIEWERS);
    const rooms = await this.rows();
    const done = rooms.filter((r) => r.cleanliness === 'SUDAH').length;
    const skipped = rooms.filter((r) => r.cleanliness === 'TIDAK_DIBERSIHKAN').length;
    const shifts = { PAGI: 0, MALAM: 0, CUTI: 0 };
    rooms.flatMap((r) => r.occupants).forEach((o) => shifts[o.shift]++);
    return { totalRooms: rooms.length, done, skipped, pending: rooms.length - done - skipped, totalOccupants: Object.values(shifts).reduce((a, b) => a + b, 0), shifts };
  }

  /** Rekap kebersihan per rentang tanggal (WITA, inklusif). Maksimal 93 hari per permintaan. */
  async recap(actor: AktorPostingan, from?: string, to?: string) {
    this.require(actor, VIEWERS);
    const today = this.dayKey(new Date());
    const valid = (v?: string) => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null);
    const toKey = valid(to) ?? today;
    const fromKey = valid(from) ?? toKey;
    const start = new Date(`${fromKey}T00:00:00+08:00`);
    const end = new Date(`${toKey}T00:00:00+08:00`);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) throw new BadRequestException('Format tanggal tidak valid');
    if (end < start) throw new BadRequestException('Tanggal akhir tidak boleh sebelum tanggal awal');
    const days = Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1;
    if (days > 93) throw new BadRequestException('Rentang rekap maksimal 93 hari');
    const endExclusive = new Date(end.getTime() + 86_400_000);
    const [perBuilding, sessions] = await Promise.all([
      this.prisma.messRoom.groupBy({ by: ['building'], _count: { _all: true } }),
      this.prisma.messCleaningSession.findMany({
        where: { startedAt: { gte: start, lt: endExclusive } },
        include: { room: { select: { id: true, building: true, number: true } }, houseMan: { select: { id: true, name: true, nrp: true } } },
        orderBy: { startedAt: 'desc' },
      }),
    ]);
    const roomsByBuilding = Object.fromEntries(perBuilding.map((row) => [row.building, row._count._all]));
    const totalRooms = perBuilding.reduce((sum, row) => sum + row._count._all, 0);
    return { from: fromKey, to: toKey, days, totalRooms, roomsByBuilding, sessions: sessions.map((s) => ({ ...s, day: this.dayKey(s.startedAt) })) };
  }

  async createRoom(actor: AktorPostingan, dto: CreateMessRoomDto) {
    this.require(actor, ADMINS);
    const number = dto.number.trim();
    if (!number) throw new BadRequestException('Nomor kamar wajib diisi');
    return this.prisma.messRoom.create({ data: { building: dto.building, number, occupants: { create: (dto.occupants ?? []).map(this.cleanOccupant) } }, include: { occupants: true } });
  }

  async updateRoom(actor: AktorPostingan, id: number, building: string, number: string) {
    this.require(actor, ADMINS);
    await this.findRoom(id);
    return this.prisma.messRoom.update({ where: { id }, data: { building, number: number.trim() } });
  }
  async deleteRoom(actor: AktorPostingan, id: number) { this.require(actor, ADMINS); await this.findRoom(id); return this.prisma.messRoom.delete({ where: { id } }); }
  async addOccupant(actor: AktorPostingan, roomId: number, dto: MessOccupantDto) { this.require(actor, ADMINS); await this.findRoom(roomId); return this.prisma.messOccupant.create({ data: { roomId, ...this.cleanOccupant(dto) } }); }
  async updateOccupant(actor: AktorPostingan, id: number, dto: UpdateMessOccupantDto) { this.require(actor, ADMINS); return this.prisma.messOccupant.update({ where: { id }, data: this.cleanOccupant(dto) }); }
  async deleteOccupant(actor: AktorPostingan, id: number) { this.require(actor, ADMINS); return this.prisma.messOccupant.delete({ where: { id } }); }

  async start(actor: AktorPostingan, roomId: number) {
    this.require(actor, OPERATORS); await this.findRoom(roomId);
    const active = await this.prisma.messCleaningSession.findFirst({ where: { roomId, finishedAt: null } });
    if (active) throw new BadRequestException('Kamar sedang dibersihkan');
    return this.prisma.messCleaningSession.create({ data: { roomId, houseManId: actor.id } });
  }
  /** Houseman menandai kamar TIDAK dibersihkan; alasan wajib dan tampil di tabel monitoring. */
  async skip(actor: AktorPostingan, roomId: number, alasan: string) {
    this.require(actor, OPERATORS); await this.findRoom(roomId);
    const catatan = (alasan ?? '').trim();
    if (catatan.length < 3) throw new BadRequestException('Alasan tidak dibersihkan wajib diisi');
    const active = await this.prisma.messCleaningSession.findFirst({ where: { roomId, finishedAt: null } });
    if (active) throw new BadRequestException('Kamar sedang dibersihkan. Selesaikan dulu pembersihannya.');
    const now = new Date();
    return this.prisma.messCleaningSession.create({
      data: { roomId, houseManId: actor.id, startedAt: now, finishedAt: now, durationSec: null, status: MessCleaningStatus.TIDAK_DIBERSIHKAN, alasan: catatan },
    });
  }
  async finish(actor: AktorPostingan, roomId: number) {
    this.require(actor, OPERATORS);
    const active = await this.prisma.messCleaningSession.findFirst({ where: { roomId, finishedAt: null }, orderBy: { startedAt: 'desc' } });
    if (!active) throw new BadRequestException('Tidak ada proses pembersihan aktif');
    if (actor.role === UserRole.HOUSE_MAN && active.houseManId !== actor.id) throw new ForbiddenException('Pembersihan ini dimulai oleh petugas lain');
    const finishedAt = new Date();
    return this.prisma.messCleaningSession.update({ where: { id: active.id }, data: { finishedAt, durationSec: Math.max(0, Math.floor((finishedAt.getTime() - active.startedAt.getTime()) / 1000)) } });
  }

  private cleanOccupant(dto: MessOccupantDto) { return { nrp: dto.nrp.trim(), name: dto.name.trim(), shift: dto.shift as MessOccupantShift }; }
  private async findRoom(id: number) { const room = await this.prisma.messRoom.findUnique({ where: { id } }); if (!room) throw new NotFoundException('Kamar tidak ditemukan'); return room; }
}
