import {
  IsDateString,
  IsOptional,
  Matches,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreatePackMealOrderDto {
  @IsDateString({}, { message: 'Tanggal kebutuhan wajib valid' })
  neededDate: string;

  @IsString()
  @MinLength(2, { message: 'Lokasi pengantaran wajib diisi' })
  @MaxLength(180)
  deliveryLocation: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  department?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  contactNumber?: string;


  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: 'Jam antar wajib memakai format HH:mm',
  })
  deliveryTime?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;

  @IsString({ message: 'Baris jenis order wajib diisi' })
  items: string;
}
