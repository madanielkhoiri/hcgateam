-- AlterTable
ALTER TABLE "daily_activity_progresses" ADD COLUMN     "pre_activity_photo_paths" TEXT[] DEFAULT ARRAY[]::TEXT[];
