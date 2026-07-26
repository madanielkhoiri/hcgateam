import { Transform } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

function toBoolean(value: unknown): boolean {
  if (typeof value === 'boolean') {
    return value;
  }

  const normalized = String(value ?? '')
    .trim()
    .toLowerCase();

  return ['true', '1', 'yes', 'on'].includes(normalized);
}

function toStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map(String)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  if (typeof value !== 'string' || !value.trim()) {
    return [];
  }

  try {
    const parsed: unknown = JSON.parse(value);

    if (Array.isArray(parsed)) {
      return parsed
        .map(String)
        .map((item) => item.trim())
        .filter(Boolean);
    }
  } catch {
    // Nilai bukan JSON, lanjutkan sebagai teks biasa.
  }

  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

export class CreatePreActivityCheckDto {
  @IsDateString()
  activityDate: string;

  @IsString()
  @IsNotEmpty()
  workName: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString()
  heavyEquipmentName?: string;

  @IsOptional()
  @IsString()
  unitNumber?: string;

  @Transform(({ value }) => toStringArray(value))
  @IsArray()
  implementationTeam: string[];

  @IsOptional()
  @IsString()
  potentialHazard?: string;

  @IsOptional()
  @IsString()
  controlMeasure?: string;

  @IsOptional()
  @IsString()
  riskStatus?: string;

  @Transform(({ value }) => toBoolean(value))
  @IsBoolean()
  ppeComplete: boolean;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === true || value === 'true' || value === 1 || value === '1') {
      return 'BAIK';
    }

    if (value === false || value === 'false' || value === 0 || value === '0') {
      return 'TIDAK BAIK';
    }

    return String(value ?? '')
      .trim()
      .toUpperCase();
  })
  @IsString()
  equipmentCondition?: string;

  @Transform(({ value }) => toBoolean(value))
  @IsBoolean()
  barricadeInstalled: boolean;

  @Transform(({ value }) => toBoolean(value))
  @IsBoolean()
  workAreaSafe: boolean;

  @Transform(({ value }) => toBoolean(value))
  @IsBoolean()
  workToolsComplete: boolean;

  @Transform(({ value }) => toBoolean(value))
  @IsBoolean()
  permitComplete: boolean;

  @IsOptional()
  @IsString()
  notes?: string;

  @Transform(({ value }) => toStringArray(value))
  @IsArray()
  @IsOptional()
  documentationPaths?: string[];

  @IsString()
  @IsNotEmpty()
  coordinatorName: string;

  @IsOptional()
  @IsString()
  coordinatorSignPath?: string;

  @IsOptional()
  @IsString()
  supervisorSignPath?: string;

  /*
   * Field dokumentasi lama yang masih dibaca service.
   * Semua dibuat opsional agar frontend baru tetap dapat dipakai.
   */

  @IsOptional()
  @IsString()
  jsaImage?: string;

  @IsOptional()
  @IsString()
  checklistImage?: string;

  @IsOptional()
  @IsString()
  heightPermitImage?: string;

  @IsOptional()
  @IsString()
  healthCheck?: string;

  @IsOptional()
  @IsString()
  healthCheckStatus?: string;

  @IsOptional()
  @IsString()
  socializationPhotoPath?: string;

  @IsOptional()
  @IsString()
  executorSignaturePath?: string;

  @IsOptional()
  @IsString()
  supervisorNameValue?: string;

  @IsOptional()
  @IsString()
  supervisorSignaturePath?: string;
  /*
   * Alias di bawah menjaga service lama tetap berfungsi.
   * Frontend tidak perlu mengirim field-field ini.
   */

  @IsOptional()
  @IsString()
  supervisorName?: string;
  @IsOptional()
  @IsString()
  socializationPhoto?: string;
  get jobName(): string {
    return this.workName;
  }

  get workLocationText(): string | undefined {
    return this.location;
  }

  get heavyEquipmentNameText(): string | undefined {
    return this.heavyEquipmentName;
  }

  get unitNumberText(): string | undefined {
    return this.unitNumber;
  }

  get executorTeamText(): string | undefined {
    return this.implementationTeam?.join(', ') || undefined;
  }

  get hazardPotentialText(): string | undefined {
    return this.potentialHazard;
  }

  get controlStepText(): string | undefined {
    return this.controlMeasure;
  }

  get apdCheck(): boolean {
    return this.ppeComplete;
  }

  get equipmentConditionGood(): boolean {
    const normalized = String(this.equipmentCondition ?? '')
      .trim()
      .toUpperCase();

    return [
      'BAIK',
      'GOOD',
      'AMAN',
      'LAYAK',
      'SESUAI',
      'TRUE',
      '1',
      'YES',
      'ON',
    ].includes(normalized);
  }

  get toolConditionCheck(): boolean {
    return this.equipmentConditionGood;
  }

  get workAreaCheck(): boolean {
    return this.workAreaSafe;
  }

  get toolCompleteCheck(): boolean {
    return this.workToolsComplete;
  }

  get workPermitCheck(): boolean {
    return this.permitComplete;
  }

  get sopCheck(): boolean {
    return false;
  }

  get jsaCheck(): boolean {
    return false;
  }

  get liftingPlanCheck(): boolean {
    return false;
  }

  get pic(): string {
    return this.coordinatorName;
  }

  get executorSignature(): string | undefined {
    return this.executorSignaturePath || this.coordinatorSignPath;
  }

  get supervisorSignature(): string | undefined {
    return this.supervisorSignaturePath || this.supervisorSignPath;
  }
}
