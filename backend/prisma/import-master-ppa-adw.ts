import 'dotenv/config';
import * as XLSX from 'xlsx';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, GenderKaryawan, StatusKerja } from '@prisma/client';

const file = process.argv[2] ?? 'Z:/7. MANPOWER ADARO/#PERSONAL DATA/PPA/PERSONAL DATA 2026/09. SEPTEMBER 2026/09. MASTER DATA PPA SEPTEMBER 2026 - Copy.xlsx';
const replace = process.argv.includes('--replace');
const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL tidak ditemukan');
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

const clean = (v: unknown) => String(v ?? '').trim();
const norm = (v: unknown) => clean(v).toUpperCase().replace(/\s+/g, ' ');

function dateOnly(v: unknown): Date | null {
  if (v instanceof Date && !Number.isNaN(v.getTime())) return new Date(Date.UTC(v.getFullYear(), v.getMonth(), v.getDate()));
  if (typeof v === 'number') {
    const d = XLSX.SSF.parse_date_code(v);
    return d ? new Date(Date.UTC(d.y, d.m - 1, d.d)) : null;
  }
  const s = clean(v);
  if (!s || s === '-' || s === 'Invalid date' || s.startsWith('0000')) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
}

function gender(v: unknown): GenderKaryawan | null {
  const s = norm(v);
  return s === 'MALE' || s === 'LAKI-LAKI' || s === 'LAKI LAKI' ? GenderKaryawan.LAKI_LAKI : s === 'FEMALE' || s === 'PEREMPUAN' ? GenderKaryawan.PEREMPUAN : null;
}

function status(v: unknown): StatusKerja {
  const s = norm(v);
  if (s.includes('RESIGN') || s.includes('OUT') || s.includes('MUTASI')) return StatusKerja.RESIGN;
  if (s.includes('DIRUMAH') || s.includes('NON AKTIF') || s.includes('INACTIVE')) return StatusKerja.DIRUMAHKAN;
  return StatusKerja.AKTIF;
}

async function main() {
  const workbook = XLSX.readFile(file, { cellDates: true });
  const sheet = workbook.Sheets['PPA ADW'];
  if (!sheet) throw new Error('Sheet PPA ADW tidak ditemukan');
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: null });
  const header = rows.findIndex((r) => r.some((v) => norm(v) === 'NRP'));
  if (header < 0) throw new Error('Header NRP tidak ditemukan');
  // Baris setelah header adalah data; baris kosong di antara header tetap dilewati.
  const data = rows.slice(header + 1).filter((r) => clean(r[1]) && clean(r[2]));
  const seen = new Set<string>();
  const duplicate: string[] = [];
  for (const r of data) { const nik = clean(r[1]); if (seen.has(nik)) duplicate.push(nik); seen.add(nik); }
  const byStatus = data.reduce<Record<string, number>>((a, r) => { const s = status(r[19]); a[s] = (a[s] ?? 0) + 1; return a; }, {});
  console.log(JSON.stringify({ sheet: 'PPA ADW', data: data.length, duplicateNIK: duplicate.length, byStatus, replace }, null, 2));
  if (!replace) { console.log('Preview selesai. Jalankan ulang dengan --replace untuk memasukkan data.'); return; }
  if (duplicate.length) throw new Error(`Ada NIK duplikat di Excel: ${duplicate.slice(0, 10).join(', ')}`);

  await prisma.$transaction(async (tx) => {
    const departments = await tx.departemen.findMany({ select: { id: true, namaDepartemen: true } });
    const deptMap = new Map(departments.map((d) => [norm(d.namaDepartemen), d.id]));
    for (const r of data) {
      const deptName = clean(r[8]) || 'LAINNYA';
      if (!deptMap.has(norm(deptName))) {
        const created = await tx.departemen.create({ data: { namaDepartemen: deptName, aktif: true } });
        deptMap.set(norm(deptName), created.id);
      }
    }
    // Hapus master karyawan saja; relasi historis harus sudah tidak ada untuk replace aman.
    await tx.karyawan.deleteMany({});
    for (const r of data) {
      await tx.karyawan.create({ data: {
        nik: clean(r[1]), nama: clean(r[2]), gender: gender(r[3]), departemenId: deptMap.get(norm(clean(r[8]) || 'LAINNYA'))!,
        jabatan: clean(r[9]) || null, email: clean(r[32]) || null, noTelepon: clean(r[33]) || null,
        tanggalLahir: dateOnly(r[15]), statusKerja: status(r[19]),
      }});
    }
  }, { maxWait: 30000, timeout: 120000 });
  console.log(`Import selesai: ${data.length} karyawan.`);
}

main().catch((e) => { console.error(e); process.exitCode = 1; }).finally(() => prisma.$disconnect());
