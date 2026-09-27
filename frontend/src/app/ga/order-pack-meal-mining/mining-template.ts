export const MINING_ORDER_TEMPLATE = [
  { area: 'PRODUKSI CSA MONTE BARU', dropLocation: 'PRODUKSI CSA MONTE BARU', dropTimes: 'SHIFT 1 (05:00)\nSHIFT 2 (16:30)' },
  { area: 'MOCO CSA MONTE BARU', dropLocation: 'MOCO CSA MONTE BARU', dropTimes: 'SHIFT 1 (05:00)\nSHIFT 2 (16:30)' },
  { area: 'PRODUKSI CSA GIBSON', dropLocation: 'CSA GIBSON', dropTimes: 'SHIFT 1 (05:00)\nSHIFT 2 (16:30)' },
  { area: 'PRODUKSI CSA MONTE', dropLocation: 'CSA MONTE', dropTimes: 'SHIFT 1 (05:00)\nSHIFT 2 (16:30)' },
  { area: 'PLANT', dropLocation: 'WORKSHOP', dropTimes: 'SHIFT 1 (05:00)\nSHIFT 2 (16:30)' },
  { area: 'FUEL REFUELING SARANA', dropLocation: 'REFUELING SARANA', dropTimes: 'SHIFT 1 (05:00)\nSHIFT 2 (16:30)' },
  { area: 'LOGISTIC WAREHOUSE', dropLocation: 'WAREHOUSE', dropTimes: 'SHIFT 1 (09:00)\nSHIFT 2 (16:30)' },
  { area: 'PRODUKSI OFFICE', dropLocation: 'OFFICE', dropTimes: 'SHIFT 1 (09:00)\nSHIFT 2 (16:30)' },
  { area: 'ENGINEERING OFFICE', dropLocation: 'OFFICE', dropTimes: 'SHIFT 1 (09:00)\nSHIFT 2 (16:30)' },
  { area: 'SHE OFFICE', dropLocation: 'OFFICE', dropTimes: 'SHIFT 1 (09:00)\nSHIFT 2 (16:30)' },
  { area: 'OFFICE PROCUREMENT', dropLocation: 'OFFICE', dropTimes: 'SHIFT 1 (09:00)\nSHIFT 2 (16:30)' },
  { area: 'DRIVER LV OFFICE', dropLocation: 'OFFICE', dropTimes: 'SHIFT 1 (09:00)\nSHIFT 2 (16:30)' },
  { area: 'GA GS OFFICE', dropLocation: 'OFFICE', dropTimes: 'SHIFT 1 (09:00)\nSHIFT 2 (16:30)' },
  { area: 'HCGA OFFICE', dropLocation: 'OFFICE', dropTimes: 'SHIFT 1 (09:00)\nSHIFT 2 (16:30)' },
  { area: 'SECURITY OFFICE', dropLocation: 'OFFICE', dropTimes: 'SHIFT 1 (09:00)\nSHIFT 2 (16:30)' },
  { area: 'IT OFFICE', dropLocation: 'OFFICE', dropTimes: 'SHIFT 1 (09:00)\nSHIFT 2 (16:30)' },
  { area: 'MOCO OFFICE', dropLocation: 'OFFICE', dropTimes: 'SHIFT 1 (09:00)\nSHIFT 2 (16:30)' },
  { area: 'INDUKSI PASCA CUTI + TRAINING', dropLocation: 'OFFICE', dropTimes: 'SHIFT 1 (09:00)\nSHIFT 2 (16:30)' },
  { area: 'OFFICE OPD', dropLocation: 'OFFICE', dropTimes: 'SHIFT 1 (09:00)\nSHIFT 2 (16:30)' },
  { area: 'TRAFFIC MAN', dropLocation: 'SECURITY REFUELING SARANA', dropTimes: 'SHIFT 1 (09:00)\nSHIFT 2 (16:30)' },
] as const;

export type MiningApiRow = {
  id?: number; date: string; area: string; dropLocation: string | null;
  dropTimes: string | null; orderedBy: string | null; notes: string | null;
  rosterLunch: number; rosterDinner: number; rosterSpecialMeal: number;
  rosterSpecialSnack: number; additionalLunch: number; additionalDinner: number;
  additionalSpecialMeal: number; additionalSpecialSnack: number;
  receivedLunch: number | null; receivedDinner: number | null;
  receivedSpecialMeal: number | null; receivedSpecialSnack: number | null;
};

export function emptyTemplateRow(template: (typeof MINING_ORDER_TEMPLATE)[number], date: string): MiningApiRow {
  return {
    date, area: template.area, dropLocation: template.dropLocation,
    dropTimes: template.dropTimes, orderedBy: 'GA PPA MINING', notes: '',
    rosterLunch: 0, rosterDinner: 0, rosterSpecialMeal: 0, rosterSpecialSnack: 0,
    additionalLunch: 0, additionalDinner: 0, additionalSpecialMeal: 0,
    additionalSpecialSnack: 0, receivedLunch: null, receivedDinner: null,
    receivedSpecialMeal: null, receivedSpecialSnack: null,
  };
}

export function rowsForDate(rows: MiningApiRow[], date: string): MiningApiRow[] {
  const byArea = new Map(rows.filter((row) => row.date.slice(0, 10) === date)
    .map((row) => [row.area.toUpperCase(), { ...row, date: row.date.slice(0, 10) }]));
  return MINING_ORDER_TEMPLATE.map((template) =>
    byArea.get(template.area) ?? emptyTemplateRow(template, date));
}

export function toEntryPayload(row: MiningApiRow, date: string) {
  return {
    date,
    area: row.area,
    dropLocation: row.dropLocation || undefined,
    dropTimes: row.dropTimes || undefined,
    orderedBy: 'GA PPA MINING',
    notes: row.notes || undefined,
    rosterLunch: Number(row.rosterLunch || 0),
    rosterDinner: Number(row.rosterDinner || 0),
    rosterSpecialMeal: Number(row.rosterSpecialMeal || 0),
    rosterSpecialSnack: Number(row.rosterSpecialSnack || 0),
    additionalLunch: Number(row.additionalLunch || 0),
    additionalDinner: Number(row.additionalDinner || 0),
    additionalSpecialMeal: Number(row.additionalSpecialMeal || 0),
    additionalSpecialSnack: Number(row.additionalSpecialSnack || 0),
    receivedLunch: row.receivedLunch ?? undefined,
    receivedDinner: row.receivedDinner ?? undefined,
    receivedSpecialMeal: row.receivedSpecialMeal ?? undefined,
    receivedSpecialSnack: row.receivedSpecialSnack ?? undefined,
  };
}
