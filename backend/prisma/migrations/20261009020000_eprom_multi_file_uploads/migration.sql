ALTER TABLE "eprom_mom"
ADD COLUMN "file_foto_close_files" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

ALTER TABLE "eprom_kontrak"
ADD COLUMN "file_kontrak_files" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

ALTER TABLE "eprom_sosialisasi_jsa"
ADD COLUMN "file_urls" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
