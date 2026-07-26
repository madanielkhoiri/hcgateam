-- CreateTable
CREATE TABLE "pre_activities" (
    "id" SERIAL NOT NULL,
    "job_name" TEXT NOT NULL,
    "activity_date" DATE NOT NULL,
    "work_location_text" TEXT,
    "heavy_equipment_name_text" TEXT,
    "unit_number_text" TEXT,
    "executor_team_text" TEXT,
    "hazard_potential_text" TEXT,
    "control_step_text" TEXT,
    "apd_check" BOOLEAN NOT NULL DEFAULT false,
    "tool_condition_check" BOOLEAN NOT NULL DEFAULT false,
    "work_area_check" BOOLEAN NOT NULL DEFAULT false,
    "tool_complete_check" BOOLEAN NOT NULL DEFAULT false,
    "work_permit_check" BOOLEAN NOT NULL DEFAULT false,
    "sop_check" BOOLEAN NOT NULL DEFAULT false,
    "jsa_check" BOOLEAN NOT NULL DEFAULT false,
    "lifting_plan_check" BOOLEAN NOT NULL DEFAULT false,
    "jsa_image" TEXT,
    "checklist_image" TEXT,
    "height_permit_image" TEXT,
    "health_check" TEXT,
    "health_check_status" TEXT,
    "socialization_photo" TEXT,
    "pic" TEXT NOT NULL,
    "executor_signature" TEXT,
    "supervisor_name" TEXT,
    "supervisor_signature" TEXT,
    "created_by" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pre_activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "post_activities" (
    "id" SERIAL NOT NULL,
    "activity_date" DATE NOT NULL,
    "start_time" TEXT NOT NULL,
    "end_time" TEXT NOT NULL,
    "work_name" TEXT NOT NULL,
    "progress_percent" INTEGER NOT NULL,
    "morning_weather" TEXT NOT NULL,
    "afternoon_weather" TEXT NOT NULL,
    "evening_weather" TEXT NOT NULL,
    "coordinator_count" INTEGER NOT NULL DEFAULT 1,
    "carpenter_count" INTEGER NOT NULL DEFAULT 1,
    "helper_count" INTEGER NOT NULL DEFAULT 1,
    "approver_name" TEXT NOT NULL DEFAULT 'ARIEF RAHIM',
    "photo_paths" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_by" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "post_activities_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "pre_activities_activity_date_idx" ON "pre_activities"("activity_date");

-- CreateIndex
CREATE INDEX "pre_activities_created_by_idx" ON "pre_activities"("created_by");

-- CreateIndex
CREATE INDEX "post_activities_activity_date_idx" ON "post_activities"("activity_date");

-- CreateIndex
CREATE INDEX "post_activities_created_by_idx" ON "post_activities"("created_by");

-- AddForeignKey
ALTER TABLE "pre_activities" ADD CONSTRAINT "pre_activities_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_activities" ADD CONSTRAINT "post_activities_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
