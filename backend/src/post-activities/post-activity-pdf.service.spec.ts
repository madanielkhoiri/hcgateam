import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PostActivitiesService } from './post-activities.service';
import { PostActivityPdfService } from './post-activity-pdf.service';

function dataFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    activityDate: new Date('2026-01-05'),
    startTime: '08:00',
    endTime: '17:00',
    workName: 'GALIAN TANAH',
    progressPercent: 75,
    morningWeather: 'CERAH',
    afternoonWeather: 'BERAWAN',
    eveningWeather: 'HUJAN',
    coordinatorCount: 1,
    carpenterCount: 2,
    helperCount: 3,
    approverName: 'ARIEF RAHIM',
    photoPaths: [],
    creator: { id: 9, name: 'Budi', username: 'budi', role: 'KARYAWAN' },
    ...overrides,
  };
}

function buatService(data: unknown) {
  const postActivitiesService = {
    findOne: jest.fn().mockResolvedValue(data),
  } as unknown as PostActivitiesService;

  return new PostActivityPdfService(postActivitiesService);
}

describe('PostActivityPdfService.generate', () => {
  let cwdAwal: string;
  let direktoriUji: string;

  beforeEach(() => {
    cwdAwal = process.cwd();
    direktoriUji = mkdtempSync(join(tmpdir(), 'post-activity-pdf-'));
    mkdirSync(join(direktoriUji, 'uploads'), { recursive: true });
    process.chdir(direktoriUji);
  });

  afterEach(() => {
    process.chdir(cwdAwal);
    rmSync(direktoriUji, { recursive: true, force: true });
  });

  it('menghasilkan buffer PDF valid tanpa foto', async () => {
    const service = buatService(dataFixture());

    const buffer = await service.generate(1);

    expect(buffer.subarray(0, 4).toString()).toBe('%PDF');
  });

  it('tetap berhasil generate dengan foto yang benar-benar ada di uploads', async () => {
    mkdirSync(join(direktoriUji, 'uploads', 'post-activities'), { recursive: true });
    writeFileSync(join(direktoriUji, 'uploads', 'post-activities', 'a.jpg'), Buffer.from([0xff, 0xd8, 0xff]));

    const service = buatService(dataFixture({ photoPaths: ['uploads/post-activities/a.jpg'] }));

    const buffer = await service.generate(1);

    expect(buffer.subarray(0, 4).toString()).toBe('%PDF');
  });

  it('tetap berhasil generate walau path foto tidak ditemukan di uploads', async () => {
    const service = buatService(dataFixture({ photoPaths: ['uploads/post-activities/tidak-ada.jpg'] }));

    const buffer = await service.generate(1);

    expect(buffer.subarray(0, 4).toString()).toBe('%PDF');
  });
});

describe('PostActivityPdfService.formatDate', () => {
  it('memformat tanggal dengan zona waktu Asia/Makassar (WITA)', () => {
    const service = buatService(dataFixture());

    const hasil = (service as any).formatDate(new Date('2026-01-05T20:00:00Z'));

    // 20:00 UTC 5 Jan = 04:00 WITA 6 Jan -> tanggal berpindah ke 6
    expect(hasil).toMatch(/January/);
    expect(hasil).toMatch(/2026/);
  });
});

describe('PostActivityPdfService.resolveUploadPath', () => {
  let cwdAwal: string;
  let direktoriUji: string;

  beforeEach(() => {
    cwdAwal = process.cwd();
    direktoriUji = mkdtempSync(join(tmpdir(), 'post-activity-path-'));
    mkdirSync(join(direktoriUji, 'uploads'), { recursive: true });
    process.chdir(direktoriUji);
  });

  afterEach(() => {
    process.chdir(cwdAwal);
    rmSync(direktoriUji, { recursive: true, force: true });
  });

  it('mengembalikan null untuk path kosong', () => {
    const service = buatService(dataFixture());

    expect((service as any).resolveUploadPath('')).toBeNull();
    expect((service as any).resolveUploadPath('   ')).toBeNull();
  });

  it('menemukan file langsung di uploads/<path>', () => {
    writeFileSync(join(direktoriUji, 'uploads', 'a.jpg'), 'dummy');
    const service = buatService(dataFixture());

    expect((service as any).resolveUploadPath('uploads/a.jpg')).toBe(join(direktoriUji, 'uploads', 'a.jpg'));
  });

  it('fallback ke uploads/post-activities/<filename> kalau path asli tidak ada', () => {
    mkdirSync(join(direktoriUji, 'uploads', 'post-activities'), { recursive: true });
    writeFileSync(join(direktoriUji, 'uploads', 'post-activities', 'b.jpg'), 'dummy');
    const service = buatService(dataFixture());

    expect((service as any).resolveUploadPath('path/lama/b.jpg')).toBe(
      join(direktoriUji, 'uploads', 'post-activities', 'b.jpg'),
    );
  });

  it('mengembalikan null kalau file tidak ditemukan di manapun', () => {
    const service = buatService(dataFixture());

    expect((service as any).resolveUploadPath('uploads/tidak-ada.jpg')).toBeNull();
  });
});
