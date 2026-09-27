import { Injectable } from '@nestjs/common';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import PDFDocument from 'pdfkit';

export type DataBeritaAcaraAdvance = {
  karyawanTugasId: number;
  nomorSurat: string;
  jenisKegiatan: string;
  nominalAdvance: number;
  tanggalBerakhir: Date;
  pembuatNama: string;
  shNama: string;
  shJabatan: string;
};

const LOGO_PATH = join(process.cwd(), 'uploads', 'signatures', 'PPA_cut.png');
const ARIAL_PATH = join(
  process.env.WINDIR || 'C:\\Windows',
  'Fonts',
  'arial.ttf',
);
const ARIAL_BOLD_PATH = join(
  process.env.WINDIR || 'C:\\Windows',
  'Fonts',
  'arialbd.ttf',
);

@Injectable()
export class SuratTugasDinasAdvancePdfService {
  async buatFile(data: DataBeritaAcaraAdvance): Promise<string> {
    const dir = join(process.cwd(), 'uploads', 'surat-tugas-dinas', 'advance');
    mkdirSync(dir, { recursive: true });
    const namaFile = `berita-acara-advance-${data.karyawanTugasId}.pdf`;
    const buffer = await this.render(data);
    writeFileSync(join(dir, namaFile), buffer);
    return `surat-tugas-dinas/advance/${namaFile}`;
  }

  private render(data: DataBeritaAcaraAdvance): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const document = new PDFDocument({ size: 'A4', margin: 0 });
      const bagian: Buffer[] = [];
      document.on('data', (chunk: Buffer) => bagian.push(chunk));
      document.on('end', () => resolve(Buffer.concat(bagian)));
      document.on('error', reject);

      if (existsSync(ARIAL_PATH)) document.registerFont('Arial', ARIAL_PATH);
      if (existsSync(ARIAL_BOLD_PATH)) {
        document.registerFont('Arial-Bold', ARIAL_BOLD_PATH);
      }

      const normal = existsSync(ARIAL_PATH) ? 'Arial' : 'Helvetica';
      const bold = existsSync(ARIAL_BOLD_PATH)
        ? 'Arial-Bold'
        : 'Helvetica-Bold';
      const left = 86;
      const width = document.page.width - left * 2;

      document
        .lineWidth(1)
        .strokeColor('#8091a7')
        .rect(24, 24, document.page.width - 48, document.page.height - 48)
        .stroke();

      if (existsSync(LOGO_PATH)) {
        document.image(LOGO_PATH, left + 65, 55, { fit: [58, 58] });
      }
      document
        .font(bold)
        .fontSize(19)
        .fillColor('#30343b')
        .text('PUTRA PERKASA ABADI', left + 135, 73, {
          width: width - 135,
        });

      document
        .font(bold)
        .fontSize(13)
        .fillColor('#222222')
        .text('BERITA ACARA PENGAMBILAN ADVANCE', left, 148, {
          width,
          align: 'center',
          underline: true,
        });

      let y = 210;
      document
        .font(normal)
        .fontSize(10.5)
        .text(
          'Sehubungan dengan pengambilan advance untuk keperluan di bawah ini:',
          left,
          y,
          { width },
        );
      y += 32;

      const info = (label: string, nilai: string, jarak = 21) => {
        document
          .font(normal)
          .fontSize(10.5)
          .text(label, left, y, { width: 205 });
        document.text(':', left + 205, y, { width: 12 });
        document.font(bold).text(nilai, left + 220, y, { width: width - 220 });
        y += jarak;
      };

      info('Jenis Kegiatan Pengambilan Advance', data.jenisKegiatan);
      info('Nomor Surat Tugas Dinas / RAB', data.nomorSurat, 30);
      info('Nominal Advance', this.formatRupiah(data.nominalAdvance), 30);
      info(
        'Tanggal Berakhir Kegiatan',
        this.formatTanggal(data.tanggalBerakhir),
      );

      y += 32;
      const batasDeklarasi = new Date(data.tanggalBerakhir);
      batasDeklarasi.setUTCDate(batasDeklarasi.getUTCDate() + 7);
      document
        .font(normal)
        .fontSize(10.5)
        .text(
          'Berita acara ini menerangkan bahwa saya menyatakan akan melakukan deklarasi advance (Uang Muka) yang saya terima dengan nominal di atas dengan ketentuan:',
          left,
          y,
          { width, align: 'justify', lineGap: 3 },
        );
      y += 52;

      const ketentuan = [
        'Melampirkan bukti transaksi asli atau jika tidak ada wajib membuat nota yang ditandatangani oleh pimpinan departemen.',
        `Deklarasi diajukan maksimal 7 hari setelah tanggal berakhir kegiatan atau maksimal tanggal ${this.formatTanggal(batasDeklarasi)}.`,
        'Apabila sampai dengan tanggal maksimal deklarasi tersebut saya belum melakukan kewajiban deklarasi, saya bersedia untuk dilakukan pemotongan gaji senilai nominal advance di atas.',
      ];
      ketentuan.forEach((isi, index) => {
        document
          .font(normal)
          .fontSize(10.5)
          .text(`${index + 1}.`, left + 28, y, { width: 24, align: 'right' });
        const tinggi = document.heightOfString(isi, {
          width: width - 70,
          lineGap: 3,
        });
        document.text(isi, left + 60, y, {
          width: width - 70,
          align: 'justify',
          lineGap: 3,
        });
        y += tinggi + 9;
      });

      y += 32;
      document
        .font(normal)
        .fontSize(10.5)
        .text(
          'Demikian berita acara pengambilan advance ini saya buat dan saya sadari, terima kasih.',
          left,
          y,
          { width, align: 'justify' },
        );

      const tandaTanganTop = y + 70;
      const kolom = width / 2;
      document.text('Dibuat Oleh,', left, tandaTanganTop, {
        width: kolom,
        align: 'center',
      });
      document.text('Disetujui Oleh,', left + kolom, tandaTanganTop, {
        width: kolom,
        align: 'center',
      });
      document
        .font(bold)
        .fontSize(10.5)
        .fillColor('#222222')
        .text(data.pembuatNama.toUpperCase(), left, tandaTanganTop + 78, {
          width: kolom,
          align: 'center',
          underline: true,
        })
        .text(data.shNama.toUpperCase(), left + kolom, tandaTanganTop + 78, {
          width: kolom,
          align: 'center',
          underline: true,
        });
      document
        .font(normal)
        .fontSize(10)
        .text('KARYAWAN', left, tandaTanganTop + 94, {
          width: kolom,
          align: 'center',
        })
        .text(data.shJabatan, left + kolom, tandaTanganTop + 94, {
          width: kolom,
          align: 'center',
        });

      document.end();
    });
  }

  private formatRupiah(nilai: number): string {
    return `Rp ${new Intl.NumberFormat('id-ID').format(nilai)},-`;
  }

  private formatTanggal(tanggal: Date): string {
    return new Intl.DateTimeFormat('id-ID', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(tanggal);
  }
}
