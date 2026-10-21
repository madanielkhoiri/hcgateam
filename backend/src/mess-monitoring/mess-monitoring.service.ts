import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { MessOccupantShift, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { AktorPostingan } from '../postingan/postingan-aktor';
import type { CreateMessRoomDto, MessOccupantDto, UpdateMessOccupantDto } from './dto/mess-monitoring.dto';

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
      orderBy: { number: 'asc' },
    });
    const today = this.dayKey(new Date());
    return rooms.map(({ cleanings, ...room }) => {
      const latest = cleanings[0] ?? null;
      const doneToday = !!latest?.finishedAt && this.dayKey(latest.finishedAt) === today;
      const active = latest && !latest.finishedAt ? latest : null;
      return { ...room, cleanliness: doneToday ? 'SUDAH' : 'BELUM', activeCleaning: active, lastCleaning: latest };
    });
  }

  async list(actor: AktorPostingan) { this.require(actor, VIEWERS); return this.rows(); }
  async operations(actor: AktorPostingan) { this.require(actor, OPERATORS); return this.rows(); }

  async dashboard(actor: AktorPostingan) {
    this.require(actor, VIEWERS);
    const rooms = await this.rows();
    const done = rooms.filter((r) => r.cleanliness === 'SUDAH').length;
    const shifts = { PAGI: 0, MALAM: 0, CUTI: 0 };
    rooms.flatMap((r) => r.occupants).forEach((o) => shifts[o.shift]++);
    return { totalRooms: rooms.length, done, pending: rooms.length - done, totalOccupants: Object.values(shifts).reduce((a, b) => a + b, 0), shifts };
  }

  async createRoom(actor: AktorPostingan, dto: CreateMessRoomDto) {
    this.require(actor, ADMINS);
    const number = dto.number.trim();
    if (!number) throw new BadRequestException('Nomor kamar wajib diisi');
    return this.prisma.messRoom.create({ data: { number, occupants: { create: (dto.occupants ?? []).map(this.cleanOccupant) } }, include: { occupants: true } });
  }

  async updateRoom(actor: AktorPostingan, id: number, number: string) {
    this.require(actor, ADMINS);
    await this.findRoom(id);
    return this.prisma.messRoom.update({ where: { id }, data: { number: number.trim() } });
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
