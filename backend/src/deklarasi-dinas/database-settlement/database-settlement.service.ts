import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Deklarasi, Nota, DatabaseSettlement, Prisma } from '@prisma/client';

@Injectable()
export class DatabaseSettlementService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  private ubahKeTanggalIso(nilai: string | Date | null | undefined) {
    if (!nilai) {
      return new Date().toISOString().slice(0, 10);
    }

    const tanggal = nilai instanceof Date ? nilai : new Date(nilai);

    if (Number.isNaN(tanggal.getTime())) {
      return new Date().toISOString().slice(0, 10);
    }

    return tanggal.toISOString().slice(0, 10);
  }

  private rapikanKategori(kategori: string | null | undefined) {
    if (!kategori) {
      return 'UANG OPERASIONAL';
    }

    return kategori.replace(/_/g, ' ').trim();
  }

  private ambilNamaBarangJasa(nota: Nota) {
    const barangJasa = String(nota.barangJasa || '').trim();

    if (barangJasa) {
      return barangJasa;
    }

    return this.rapikanKategori(nota.kategoriNota);
  }

  private ambilKeterangan(nota: Nota, namaBarangJasa: string) {
    const keteranganSettlement = String(
      nota.keteranganSettlement || '',
    ).trim();

    if (keteranganSettlement) {
      return keteranganSettlement;
    }

    return namaBarangJasa;
  }

  private async ambilNomorRabDariPengajuan(idSaldo: number | null) {
    if (!idSaldo) {
      return null;
    }

    const pengajuan = await this.prisma.pengajuan.findFirst({
      where: {
        idSaldo: idSaldo,
      },
    });

    const nomorRab = String(pengajuan?.nomorRab || '').trim();

    return nomorRab || null;
  }

  private async ambilNotaDeklarasi(idDeklarasi: number) {
    return this.prisma.nota.findMany({
      where: {
        idDeklarasi: idDeklarasi,
      },
      orderBy: [
        { createdAt: 'asc' },
        { id: 'asc' },
      ],
    });
  }

  async sinkronkanDariDeklarasi(deklarasi: Deklarasi) {
    const jenisDeklarasi = String(deklarasi.jenisDeklarasi || '').toUpperCase();

    if (!jenisDeklarasi.includes('UANG_OPERASIONAL')) {
      return [];
    }

    await this.prisma.databaseSettlement.deleteMany({
      where: {
        idDeklarasi: deklarasi.id,
      }
    });

    const daftarNota = await this.ambilNotaDeklarasi(deklarasi.id);

    if (daftarNota.length === 0) {
      return [];
    }

    const nomorSettlement = String(deklarasi.id).padStart(3, '0');

    const tanggalPembuatan = new Date(this.ubahKeTanggalIso(
      deklarasi.createdAt
    ));

    let nomorRabPb =
      deklarasi.nomorStd || deklarasi.kodeDeklarasi || nomorSettlement;

    const namaPengguna = deklarasi.namaPengguna || null;

    const idPengguna = Number(deklarasi.idPengguna) || 0;

    const idSaldo = Number(deklarasi.idSaldo) || null;

    const nomorRabDariPengajuan = await this.ambilNomorRabDariPengajuan(idSaldo);

    if (nomorRabDariPengajuan) {
      nomorRabPb = nomorRabDariPengajuan;
    }

    const createManyData = daftarNota.map((nota, index) => {
      const item = index + 1;

      const nominal = Number(
        nota.nominalFinal ||
          nota.nominalOcr ||
          0,
      );

      const namaBarangJasa = this.ambilNamaBarangJasa(nota);
      const itemSett = `${nomorSettlement}-${item}`;

      return {
        idDeklarasi: deklarasi.id,
        idSaldo: idSaldo,
        idPengguna: idPengguna,
        kodeJanganDiubah: `${item}${Number(deklarasi.id)}`,
        nomorSettlement: nomorSettlement,
        item,
        itemSett: itemSett,
        department: 'HCGA',
        tanggalPembuatan: tanggalPembuatan,
        tanggalPerItem: new Date(this.ubahKeTanggalIso(nota.createdAt)),
        namaBarangJasa: namaBarangJasa,
        qty: new Prisma.Decimal(1),
        hargaPerQty: new Prisma.Decimal(nominal),
        total: new Prisma.Decimal(nominal),
        keterangan: this.ambilKeterangan(nota, namaBarangJasa),
        costCenter: 'HCGA',
        nomorRabPb: String(nomorRabPb || ''),
        pic: String(nota.picSettlement || '').trim() || namaPengguna,
        statusData: 'AKTIF' as const,
      };
    });

    await this.prisma.databaseSettlement.createMany({
      data: createManyData
    });
    
    return this.prisma.databaseSettlement.findMany({
      where: {
        idDeklarasi: deklarasi.id
      }
    });
  }

  async sinkronkanDataLamaDisetujui() {
    const daftarDeklarasi = await this.prisma.deklarasi.findMany({
      where: {
        jenisDeklarasi: 'UANG_OPERASIONAL',
        status: 'DISETUJUI',
      },
      orderBy: {
        id: 'desc',
      },
    });

    for (const deklarasi of daftarDeklarasi) {
      const jumlahDataSudahAda = await this.prisma.databaseSettlement.count({
        where: {
          idDeklarasi: deklarasi.id,
          statusData: 'AKTIF',
        },
      });

      if (jumlahDataSudahAda === 0) {
        await this.sinkronkanDariDeklarasi(deklarasi);
      }
    }
  }

  async ambilSemua() {
    await this.sinkronkanDataLamaDisetujui();

    return this.prisma.databaseSettlement.findMany({
      where: {
        statusData: 'AKTIF',
      },
      orderBy: [
        { nomorSettlement: 'desc' },
        { item: 'asc' },
      ],
    });
  }

  async ambilBerdasarkanPengguna(idPengguna: number) {
    await this.sinkronkanDataLamaDisetujui();

    return this.prisma.databaseSettlement.findMany({
      where: {
        idPengguna: idPengguna,
        statusData: 'AKTIF',
      },
      orderBy: [
        { nomorSettlement: 'desc' },
        { item: 'asc' },
      ],
    });
  }

  async ambilBerdasarkanDeklarasi(idDeklarasi: number) {
    await this.sinkronkanDataLamaDisetujui();

    const data = await this.prisma.databaseSettlement.findMany({
      where: {
        idDeklarasi: idDeklarasi,
        statusData: 'AKTIF',
      },
      orderBy: {
        item: 'asc',
      },
    });

    if (data.length === 0) {
      throw new NotFoundException(
        'Database settlement belum tersedia untuk deklarasi ini.',
      );
    }

    return data;
  }
}