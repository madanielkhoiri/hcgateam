-- CreateEnum
CREATE TYPE "GenderKaryawan" AS ENUM ('LAKI_LAKI', 'PEREMPUAN');

-- AlterTable
ALTER TABLE "karyawan" ADD COLUMN     "gender" "GenderKaryawan";
