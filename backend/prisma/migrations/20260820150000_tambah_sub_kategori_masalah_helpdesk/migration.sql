/*
  Warnings:

  - Added the required column `sub_kategori` to the `tiket_helpdesk` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "tiket_helpdesk" ADD COLUMN     "masalah" TEXT,
ADD COLUMN     "sub_kategori" TEXT NOT NULL;
