-- CreateEnum
CREATE TYPE "DailyActivityType" AS ENUM ('DAILY_ACTIVITY', 'GRASS_CUTTING');

-- CreateEnum
CREATE TYPE "DailyActivityStatus" AS ENUM ('OPEN', 'ON_PROGRESS', 'WAITING_APPROVAL', 'CLOSE');

-- CreateEnum
CREATE TYPE "DailyApprovalStatus" AS ENUM ('NONE', 'PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "DailyApprovalDecision" AS ENUM ('APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "daily_activities" (
    "id" SERIAL NOT NULL,
    "activity_type" "DailyActivityType" NOT NULL DEFAULT 'DAILY_ACTIVITY',
    "start_date" DATE NOT NULL,
    "last_progress_date" DATE,
    "work_name" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "description" TEXT,
    "profile_photo_path" TEXT NOT NULL,
    "pre_activity_photo_paths" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "current_progress" INTEGER NOT NULL DEFAULT 0,
    "last_pic" TEXT,
    "status" "DailyActivityStatus" NOT NULL DEFAULT 'OPEN',
    "approval_status" "DailyApprovalStatus" NOT NULL DEFAULT 'NONE',
    "close_requested_at" TIMESTAMP(3),
    "closed_at" TIMESTAMP(3),
    "created_by" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "daily_activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_activity_progresses" (
    "id" SERIAL NOT NULL,
    "activity_id" INTEGER NOT NULL,
    "progress_date" DATE NOT NULL,
    "previous_progress" INTEGER NOT NULL,
    "added_progress" INTEGER NOT NULL,
    "current_progress" INTEGER NOT NULL,
    "pic" TEXT NOT NULL,
    "notes" TEXT,
    "photo_paths" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "request_close" BOOLEAN NOT NULL DEFAULT false,
    "created_by" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "daily_activity_progresses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_activity_approvals" (
    "id" SERIAL NOT NULL,
    "activity_id" INTEGER NOT NULL,
    "decision" "DailyApprovalDecision" NOT NULL,
    "comment" TEXT,
    "acted_by" INTEGER NOT NULL,
    "acted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "daily_activity_approvals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "daily_activities_activity_type_idx" ON "daily_activities"("activity_type");

-- CreateIndex
CREATE INDEX "daily_activities_start_date_idx" ON "daily_activities"("start_date");

-- CreateIndex
CREATE INDEX "daily_activities_last_progress_date_idx" ON "daily_activities"("last_progress_date");

-- CreateIndex
CREATE INDEX "daily_activities_status_idx" ON "daily_activities"("status");

-- CreateIndex
CREATE INDEX "daily_activities_approval_status_idx" ON "daily_activities"("approval_status");

-- CreateIndex
CREATE INDEX "daily_activities_created_by_idx" ON "daily_activities"("created_by");

-- CreateIndex
CREATE INDEX "daily_activity_progresses_activity_id_idx" ON "daily_activity_progresses"("activity_id");

-- CreateIndex
CREATE INDEX "daily_activity_progresses_progress_date_idx" ON "daily_activity_progresses"("progress_date");

-- CreateIndex
CREATE INDEX "daily_activity_progresses_created_by_idx" ON "daily_activity_progresses"("created_by");

-- CreateIndex
CREATE INDEX "daily_activity_approvals_activity_id_idx" ON "daily_activity_approvals"("activity_id");

-- CreateIndex
CREATE INDEX "daily_activity_approvals_acted_by_idx" ON "daily_activity_approvals"("acted_by");

-- CreateIndex
CREATE INDEX "daily_activity_approvals_acted_at_idx" ON "daily_activity_approvals"("acted_at");

-- AddForeignKey
ALTER TABLE "daily_activities" ADD CONSTRAINT "daily_activities_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_activity_progresses" ADD CONSTRAINT "daily_activity_progresses_activity_id_fkey" FOREIGN KEY ("activity_id") REFERENCES "daily_activities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_activity_progresses" ADD CONSTRAINT "daily_activity_progresses_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_activity_approvals" ADD CONSTRAINT "daily_activity_approvals_activity_id_fkey" FOREIGN KEY ("activity_id") REFERENCES "daily_activities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_activity_approvals" ADD CONSTRAINT "daily_activity_approvals_acted_by_fkey" FOREIGN KEY ("acted_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
