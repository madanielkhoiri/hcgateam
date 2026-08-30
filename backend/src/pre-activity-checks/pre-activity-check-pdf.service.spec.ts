import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PreActivityChecksService } from './pre-activity-checks.service';
import { PreActivityCheckPdfService } from './pre-activity-check-pdf.service';

function dataFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    job_name: 'Pekerjaan A',
    activityDate: new Date('2026-01-05'),
    work_location_text: 'Area Tambang',
    heavy_equipment_name_text: null,
    unit_number_text: null,
    executor_team_text: 'Tim A',
    hazard_potential_text: 'Terjatuh',
    control_step_text: 'Pakai APD',
    apd_check: true,
    tool_condition_check: true,
    work_area_check: true,
    tool_complete_check: true,
    work_permit_check: true,
    sop_check: true,
    jsa_check: true,
    lifting_plan_check: false,
    jsa_image: null,
    checklist_image: null,
    height_permit_image: null,
    socialization_photo: null,
    health_check: 'Sehat',
    health_check_status: 'Aman',
    pic: 'Budi',
    executor_signature: null,
    supervisorName: 'Siti',
    supervisor_signature: null,
    creator: { id: 9, name: 'Budi', username: 'budi', role: 'KARYAWAN' },
    ...overrides,
  };
}

function buatService(data: unknown) {
  const preActivityChecksService = {
    findOne: jest.fn().mockResolvedValue(data),
  } as unknown as PreActivityChecksService;

  return new PreActivityCheckPdfService(preActivityChecksService);
}

describe('PreActivityCheckPdfService.generate', () => {
  let cwdAwal: string;
  let direktoriUji: string;

  beforeEach(() => {
    cwdAwal = process.cwd();
    direktoriUji = mkdtempSync(join(tmpdir(), 'pre-activity-pdf-'));
    mkdirSync(join(direktoriUji, 'uploads'), { recursive: true });
    process.chdir(direktoriUji);
  });

  afterEach(() => {
    process.chdir(cwdAwal);
    rmSync(direktoriUji, { recursive: true, force: true });
  });

  it('menghasilkan buffer PDF valid untuk data lengkap tanpa gambar', async () => {
    const service = buatService(dataFixture());

    const buffer = await service.generate(1);

    expect(buffer.subarray(0, 4).toString()).toBe('%PDF');
    expect(buffer.length).toBeGreaterThan(0);
  });

  it('tetap berhasil generate walau seluruh checklist bernilai false', async () => {
    const service = buatService(dataFixture({
      apd_check: false, tool_condition_check: false, work_area_check: false, tool_complete_check: false,
      work_permit_check: false, sop_check: false, jsa_check: false, lifting_plan_check: false,
    }));

    const buffer = await service.generate(1);

    expect(buffer.subarray(0, 4).toString()).toBe('%PDF');
  });

  it('berhasil generate dengan tanda tangan & foto dokumentasi yang benar-benar ada di uploads', async () => {
    mkdirSync(join(direktoriUji, 'uploads', 'signatures'), { recursive: true });
    writeFileSync(join(direktoriUji, 'uploads', 'signatures', 'ttd.png'), Buffer.from([0x89, 0x50, 0x4e, 0x47]));

    const service = buatService(dataFixture({
      executor_signature: 'uploads/signatures/ttd.png',
      supervisor_signature: 'uploads/signatures/ttd.png',
      socialization_photo: JSON.stringify(['uploads/signatures/ttd.png']),
    }));

    const buffer = await service.generate(1);

    expect(buffer.subarray(0, 4).toString()).toBe('%PDF');
  });
});

describe('PreActivityCheckPdfService.formatDate', () => {
  it('memformat tanggal ke format Indonesia (tanggal bulan-nama tahun)', () => {
    const service = buatService(dataFixture());

    const hasil = (service as any).formatDate(new Date('2026-01-05'));

    expect(hasil).toMatch(/2026/);
    expect(hasil).toMatch(/Januari/);
  });
});

describe('PreActivityCheckPdfService.resolveUploadPath', () => {
  let cwdAwal: string;
  let direktoriUji: string;

  beforeEach(() => {
    cwdAwal = process.cwd();
    direktoriUji = mkdtempSync(join(tmpdir(), 'pre-activity-path-'));
    mkdirSync(join(direktoriUji, 'uploads'), { recursive: true });
    process.chdir(direktoriUji);
  });

  afterEach(() => {
    process.chdir(cwdAwal);
    rmSync(direktoriUji, { recursive: true, force: true });
  });

  it('mengembalikan null untuk path kosong/null', () => {
    const service = buatService(dataFixture());

    expect((service as any).resolveUploadPath(null)).toBeNull();
    expect((service as any).resolveUploadPath('   ')).toBeNull();
  });

  it('menolak URL http/https (tidak dianggap file lokal)', () => {
    const service = buatService(dataFixture());

    expect((service as any).resolveUploadPath('https://example.com/a.jpg')).toBeNull();
  });

  it('menemukan file langsung di uploads/<path>', () => {
    writeFileSync(join(direktoriUji, 'uploads', 'a.jpg'), 'dummy');
    const service = buatService(dataFixture());

    const hasil = (service as any).resolveUploadPath('uploads/a.jpg');

    expect(hasil).toBe(join(direktoriUji, 'uploads', 'a.jpg'));
  });

  it('mendukung format lama berupa JSON array satu elemen', () => {
    writeFileSync(join(direktoriUji, 'uploads', 'lama.jpg'), 'dummy');
    const service = buatService(dataFixture());

    const hasil = (service as any).resolveUploadPath(JSON.stringify(['uploads/lama.jpg']));

    expect(hasil).toBe(join(direktoriUji, 'uploads', 'lama.jpg'));
  });

  it('fallback mencari file di subfolder mana pun dalam uploads/ berdasarkan nama file', () => {
    mkdirSync(join(direktoriUji, 'uploads', 'sub', 'nested'), { recursive: true });
    writeFileSync(join(direktoriUji, 'uploads', 'sub', 'nested', 'dicari.jpg'), 'dummy');
    const service = buatService(dataFixture());

    const hasil = (service as any).resolveUploadPath('path/lama/tidak/ada/dicari.jpg');

    expect(hasil).toBe(join(direktoriUji, 'uploads', 'sub', 'nested', 'dicari.jpg'));
  });

  it('mengembalikan null kalau file benar-benar tidak ditemukan di manapun', () => {
    const service = buatService(dataFixture());

    expect((service as any).resolveUploadPath('uploads/tidak-ada.jpg')).toBeNull();
  });
});
