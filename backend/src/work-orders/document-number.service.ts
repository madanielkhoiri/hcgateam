import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

type TransactionClient = Prisma.TransactionClient;

@Injectable()
export class DocumentNumberService {
  constructor(private readonly prisma: PrismaService) {}

  private romanMonth(month: number): string {
    const months: Record<number, string> = {
      1: 'I',
      2: 'II',
      3: 'III',
      4: 'IIII',
      5: 'V',
      6: 'VI',
      7: 'VII',
      8: 'VIII',
      9: 'IX',
      10: 'X',
      11: 'XI',
      12: 'XII',
    };

    return months[month] ?? String(month);
  }

  private formatNumber(
    sequence: number,
    type: 'WO' | 'STP',
    date: Date,
  ): string {
    const paddedSequence = String(sequence).padStart(3, '0');

    return `${paddedSequence}/${type}/PPA-ADARO/${this.romanMonth(
      date.getMonth() + 1,
    )}/${date.getFullYear()}`;
  }

  async nextWorkOrderNumber(
    tx: TransactionClient,
    date: Date,
  ): Promise<{
    sequenceNumber: number;
    documentNumber: string;
  }> {
    const result = await tx.workOrder.aggregate({
      _max: {
        sequenceNumber: true,
      },
    });

    const sequenceNumber = (result._max.sequenceNumber ?? 0) + 1;

    return {
      sequenceNumber,
      documentNumber: this.formatNumber(sequenceNumber, 'WO', date),
    };
  }

  async nextHandoverNumber(
    tx: TransactionClient,
    date: Date,
  ): Promise<{
    sequenceNumber: number;
    documentNumber: string;
  }> {
    const result = await tx.handover.aggregate({
      _max: {
        sequenceNumber: true,
      },
    });

    const sequenceNumber = (result._max.sequenceNumber ?? 0) + 1;

    return {
      sequenceNumber,
      documentNumber: this.formatNumber(sequenceNumber, 'STP', date),
    };
  }
}
